import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('js/app-core.js','utf8');
function extract(name){
 const start=source.indexOf(`function ${name}(`);assert(start>=0,name);
 const brace=source.indexOf('{',start);let depth=0,quote='',escape=false;
 for(let i=brace;i<source.length;i++){
  const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }throw Error(name);
}
const rows=[];
const N=16384;
function engine(sr){
 const c={Float32Array,Math,Date,Number,TF_FFT_N:N,audioCtx:{sampleRate:sr},tfSwap:false,tfSmoothA:.8,tfDelaySamples:0,tfDelayMs:0,tfSweepAcquiring:false,tfCohGate:.55,meterMode:'rms',tfBandConfidence:()=>({label:'TEST'}),timeData:new Float32Array(N),timeDataRef:new Float32Array(N),tfWin:Float64Array.from({length:N},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/(N-1)))};
 for(const name of ['tfXr','tfXi','tfYr','tfYi','tfPxx','tfPyy','tfPxyRe','tfPxyIm'])c[name]=new Float64Array(N);
 c.analyser={getFloatTimeDomainData:a=>a.set(c.mic)};c.analyserRef={fftSize:N,getFloatTimeDomainData:a=>a.set(c.ref)};
 vm.createContext(c);vm.runInContext(['fft','applyDelayPhaseToCross','computeComplexTf','tfCurrentSnapshot','tfNormalizedMagnitude','levelDb','tfWorkflowSignalPresent','evaluateTfVerification'].map(extract).join('\n'),c);
 return c;
}
let seed=12345;const noise=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32*2-1;};
for(const sr of [44100,48000,96000]){
 const c=engine(sr);
 for(const db of [-6,-20,-60]){
  const amp=10**(db/20),x=Float32Array.from({length:N},(_,i)=>amp*Math.sin(2*Math.PI*128*i/N));
  c.meterMode='rms';const rms=c.levelDb(x);c.meterMode='peak';const peak=c.levelDb(x);
  assert(Math.abs(rms-(db-10*Math.log10(2)))<.001);assert(Math.abs(peak-db)<.001);
  rows.push({kind:'meter',sr,inputPeakDb:db,rmsDb:rms,peakDb:peak});
 }
 for(const gainDb of [-12,0,6]){
  const gain=10**(gainDb/20);c.ref=Float32Array.from({length:N},noise);c.mic=Float32Array.from(c.ref,v=>v*gain);
  for(const name of ['tfPxx','tfPyy','tfPxyRe','tfPxyIm'])c[name].fill(0);
  for(let j=0;j<25;j++)c.computeComplexTf();
  const s=c.tfCurrentSnapshot();let err=0;
  for(const k of [37,128,512,1500]){err=Math.max(err,Math.abs(s.mag[k]-gainDb));assert(s.coh[k]>.99999);assert(Math.abs(s.ph[k])<.00001);assert(Math.abs(c.tfNormalizedMagnitude(s,k))<.001);}
  assert(err<.001);rows.push({kind:'TF gain',sr,gainDb,maxErrorDb:err});
 }
 // A bin-centred tone gives a known phase, then delay compensation must remove it.
 const k=128,lag=73,phase=2*Math.PI*k*lag/N;
 c.ref=Float32Array.from({length:N},(_,i)=>.2*Math.sin(2*Math.PI*k*i/N));
 c.mic=Float32Array.from({length:N},(_,i)=>.1*Math.sin(2*Math.PI*k*(i-lag)/N));
 for(const compensate of [false,true]){
  for(const name of ['tfPxx','tfPyy','tfPxyRe','tfPxyIm'])c[name].fill(0);
  c.tfDelaySamples=compensate?lag:0;
  for(let j=0;j<25;j++)c.computeComplexTf();
  const s=c.tfCurrentSnapshot(),expected=compensate?0:-phase;
  const error=Math.abs(Math.atan2(Math.sin(s.ph[k]-expected),Math.cos(s.ph[k]-expected)))*180/Math.PI;
  assert(error<.01);rows.push({kind:'TF phase',sr,compensate,errorDeg:error});
 }
 // Independent noise must not pass coherence after averaging.
 c.tfDelaySamples=0;
 for(const name of ['tfPxx','tfPyy','tfPxyRe','tfPxyIm'])c[name].fill(0);
 for(let j=0;j<100;j++){c.ref=Float32Array.from({length:N},noise);c.mic=Float32Array.from({length:N},noise);c.computeComplexTf();}
 const s=c.tfCurrentSnapshot(),coh=[37,128,512,1500].map(k=>s.coh[k]);
 assert(!c.evaluateTfVerification(coh,.55,true).ok);
 rows.push({kind:'uncorrelated reference rejected',sr,coherence:coh});
 assert(!c.evaluateTfVerification([1,1,1,1],.55,false).ok,'Stale coherent history cannot verify absent input');
 assert(!c.tfWorkflowSignalPresent(new Float32Array(1024).fill(-120)));
 assert(!c.tfWorkflowSignalPresent(new Float32Array(1024).fill(-86)));
 assert(c.tfWorkflowSignalPresent(new Float32Array(1024).fill(-84)));
 rows.push({kind:'silent and weak reference rejected',sr});
}
// A prior verified average cannot grant verification to a new invalid capture.
for(const qualityOk of [false,true]){
 const c={running:true,measureBusy:()=>false,analyserRef:{},tfDelayReady:true,tfWorkflowVerified:true,
  tfWorkingAverage:{mag:[0],ph:[0],coh:[1],refDb:[0],micDb:[0],confidence:{label:'HIGH'}},tfAverageFrames:18,
  tfWorkflowQuality:()=>({ok:qualityOk}),tfCurrentSnapshot:()=>({mag:[0],ph:[0],coh:[1]}),
  tfTraces:[],TF_TRACE_COLORS:['blue'],Float32Array,Date,renderTfTraceLegend(){},v3Toast(){},alert:assert.fail};
 vm.createContext(c);vm.runInContext(extract('captureTfTrace'),c);c.captureTfTrace();
 assert.equal(c.tfTraces[0].verified,qualityOk);
 rows.push({kind:'capture verification',qualityOk,verified:c.tfTraces[0].verified});
}
writeFileSync('signal-accuracy-results.json',JSON.stringify({scope:'Synthetic numerical validation; physical hardware not tested',cases:rows},null,2)+'\n');
console.log(`Signal accuracy passed: ${rows.length} cases across 44.1, 48 and 96 kHz.`);
