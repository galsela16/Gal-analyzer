import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

const source=await readFile('js/app-core.js','utf8');
function extract(name){
  const start=source.indexOf(`function ${name}(`);if(start<0)throw new Error(`Missing ${name}`);
  const brace=source.indexOf('{',start);let depth=0,quote='',escape=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;else if(c==='}'&&--depth===0)return source.slice(start,i+1);
  }throw new Error(`Unclosed ${name}`);
}
const fft=Function(`${extract('fft')};return fft`)();
const delayChunkSize=Function(`${extract('delayChunkSize')};return delayChunkSize`)();
const computeDelay=Function('fft','delayChunkSize',`${extract('computeDelay')};return computeDelay`)(fft,delayChunkSize);
const computeStableDelay=Function('computeDelay',`${extract('computeStableDelay')};return computeStableDelay`)(computeDelay);
const delayMsToMeters=Function(`${extract('delayMsToMeters')};return delayMsToMeters`)();
const calibratedDistanceMeters=Function('delayMsToMeters',`${extract('calibratedDistanceMeters')};return calibratedDistanceMeters`)(delayMsToMeters);
const optimizeSubTopAlignment=Function(`${extract('optimizeSubTopAlignment')};return optimizeSubTopAlignment`)();
const binOverlapPowerDb=Function('db2lin',`${extract('binOverlapPowerDb')};return binOverlapPowerDb`)(db=>10**(db/10));
const binOverlapLinearPower=Function(`${extract('binOverlapLinearPower')};return binOverlapLinearPower`)();
const analyzeDecay=Function(`${extract('analyzeDecay')};return analyzeDecay`)();
const applyDelayPhaseToCross=Function(`${extract('applyDelayPhaseToCross')};return applyDelayPhaseToCross`)();
const testPxx=new Float64Array(8192).fill(1),testPyy=new Float64Array(8192).fill(1),testRe=new Float64Array(8192).fill(Math.sqrt(.81)),testIm=new Float64Array(8192);
const tfBandCoherence=Function('tfPxx','tfPyy','tfPxyRe','tfPxyIm','TF_FFT_N',`${extract('tfBandCoherence')};return tfBandCoherence`)(testPxx,testPyy,testRe,testIm,16384);
const geqBody=source.match(/const GEQ=\[([\s\S]*?)\];/)?.[1];
if(!geqBody)throw new Error('Missing GEQ table');
const GEQ=Function(`return [${geqBody}]`)();
const eqEngine=Function('GEQ','eqMinFreq','eqMaxFreq',`
  let targetMode='flat',cutOnly=false;
  ${extract('targetDb')}
  ${extract('clampCorrBand')}
  ${extract('eqOffset')}
  ${extract('smoothEqResponse')}
  ${extract('buildCorr')}
  ${extract('relByLevel')}
  ${extract('paramFromCorr')}
  return {buildCorr,relByLevel,paramFromCorr};
`)(GEQ,100,16000);
const micCalAt=Function('micCal',`${extract('micCalAt')};return micCalAt`)({f:[20,100,1000,10000,20000],g:[3,1,0,-1,-2]});

let seed=0x5a17c9e3;const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32*2-1;};
function broadband(n,sr){
  const x=new Float64Array(n);let lp=0;for(let i=0;i<n;i++){lp=.82*lp+.18*rnd();x[i]=.75*rnd()+.25*lp;}
  return x;
}
function delayed(ref,samples,{invert=false,noise=.015,reflection=0,reflectionLag=0}={}){
  const out=new Float64Array(ref.length);for(let i=0;i<out.length;i++){
    const direct=i>=samples?ref[i-samples]:0,refl=i>=samples+reflectionLag?ref[i-samples-reflectionLag]:0;
    out[i]=(invert?-1:1)*(direct+reflection*refl)+noise*rnd();
  }return out;
}

const delayCases=[];
for(const sr of [44100,48000,96000])for(const ms of [1,2.9,5,10,18]){
  const ref=broadband(32768,sr),samples=Math.round(ms*sr/1000),mic=delayed(ref,samples,{noise:.01,reflection:.35,reflectionLag:Math.round(.006*sr)});
  const r=computeDelay(ref,mic,sr,{maxDelayMs:20});
  assert(r&&r.reliable,`Delay unreliable: ${sr}Hz ${ms}ms`);assert(Math.abs(r.ms-samples/sr*1000)<.12,`Delay error: wanted ${ms}, got ${r.ms}`);
  delayCases.push(`${sr}/${ms}ms→${r.ms.toFixed(3)}ms`);
}
{
  const sr=48000,ref=broadband(32768,sr),samples=240,mic=delayed(ref,samples,{invert:true,noise:.005});
  const r=computeDelay(ref,mic,sr,{maxDelayMs:20});
  assert(r&&Math.abs(Math.abs(r.ms)-5)<.15&&r.reliable,'Delay must survive inverted polarity');
}
for(const [sr,ms,range] of [[48000,38,50],[48000,95,100],[96000,76,100]]){
  const n=sr===96000?196608:131072,ref=broadband(n,sr),samples=Math.round(ms*sr/1000),mic=delayed(ref,samples,{noise:.008,reflection:.22,reflectionLag:Math.round(.009*sr)});
  const r=computeStableDelay(ref,mic,sr,{maxDelayMs:range});
  assert(r&&r.reliable&&r.validChecks===3,`Stable delay rejected: ${sr}Hz ${ms}ms`);
  assert(Math.abs(r.ms-samples/sr*1000)<.15,`Long-range delay error: wanted ${ms}, got ${r?.ms}`);
  delayCases.push(`${sr}/${ms}ms stable→${r.ms.toFixed(3)}ms`);
}
{
  const sr=48000,n=98304,third=n/3,ref=broadband(n,sr),mic=new Float64Array(n);
  for(let block=0;block<3;block++){
    const lag=Math.round((8+block*2)*sr/1000),start=block*third,end=(block+1)*third;
    for(let i=start;i<end;i++)mic[i]=i-lag>=start?ref[i-lag]:0;
  }
  const r=computeStableDelay(ref,mic,sr,{maxDelayMs:20});
  assert(r&&!r.reliable&&r.validChecks>=2,'Changing delay must fail the three-check stability gate');
}
{
  const sr=48000,ref=broadband(98304,sr),mic=Float64Array.from(ref);
  const r=computeStableDelay(ref,mic,sr,{maxDelayMs:20});
  assert(r&&r.reliable&&Math.abs(r.ms)<.03,'0ms loopback validation failed');
}
{
  const systemOffset=35,knownDistance=1,calibrationPath=systemOffset+knownDistance/343*1000;
  assert(Math.abs(calibratedDistanceMeters(calibrationPath,systemOffset)-knownDistance)<1e-10,'Known-distance calibration conversion failed');
  assert.equal(calibratedDistanceMeters(38,null),null,'Uncalibrated path delay must not be presented as distance');
  assert(Math.abs(delayMsToMeters(5)-1.715)<1e-12,'Relative delay-to-distance conversion failed');
}
{
  const sr=48000,fftN=16384,n=fftN/2;
  const makeSnap=(phaseFn,cohValue=.92,magDb=0)=>{
    const ph=new Float32Array(n),coh=new Float32Array(n).fill(cohValue),mag=new Float32Array(n).fill(magDb);
    for(let k=0;k<n;k++){const f=k*sr/fftN,p=phaseFn(f);ph[k]=Math.atan2(Math.sin(p),Math.cos(p));}
    return {ph,coh,mag,sr,fftN};
  };
  const sub=makeSnap(()=>0),topLate=makeSnap(f=>-2*Math.PI*f*.003);
  const late=optimizeSubTopAlignment(sub,topLate,sr,90,.4,{stepMs:.02});
  assert(late.reliable&&!late.polarityInverted&&late.delayTarget==='sub',`Late top must recommend delaying sub, got ${JSON.stringify(late)}`);
  assert(Math.abs(late.delayMs-3)<.18,`Sub/Top delay optimizer expected 3ms, got ${late.delayMs}`);
  const topEarly=optimizeSubTopAlignment(sub,makeSnap(f=>2*Math.PI*f*.002),sr,90,.4,{stepMs:.02});
  assert(topEarly.reliable&&!topEarly.polarityInverted&&topEarly.delayTarget==='top'&&Math.abs(topEarly.delayMs-2)<.18,'Early top must recommend delaying top');
  const topVeryLate=optimizeSubTopAlignment(sub,makeSnap(f=>-2*Math.PI*f*.015),sr,90,.4,{stepMs:.02,maxDelayMs:20});
  assert(topVeryLate.reliable&&topVeryLate.delayTarget==='sub'&&Math.abs(topVeryLate.delayMs-15)<.2,'Optimizer must disambiguate delays longer than one crossover cycle');
  const inverted=optimizeSubTopAlignment(sub,makeSnap(()=>Math.PI),sr,90,.4,{stepMs:.02});
  assert(inverted.reliable&&inverted.polarityInverted&&inverted.delayMs<.15,'Polarity inversion optimizer failed');
  const invertedLate=optimizeSubTopAlignment(sub,makeSnap(f=>Math.PI-2*Math.PI*f*.0015),sr,90,.4,{stepMs:.02});
  assert(invertedLate.reliable&&invertedLate.polarityInverted&&invertedLate.delayTarget==='sub'&&Math.abs(invertedLate.delayMs-1.5)<.2,'Combined polarity/delay optimization failed');
  const aligned=optimizeSubTopAlignment(sub,makeSnap(()=>0),sr,90,.4,{stepMs:.02});
  assert(aligned.reliable&&aligned.noChange,'Aligned Sub/Top must not recommend a change');
  const weak=optimizeSubTopAlignment(makeSnap(()=>0,.15),makeSnap(()=>0,.15),sr,90,.4,{stepMs:.02});
  assert(!weak.reliable,'Low-coherence Sub/Top data must be rejected');
  const imbalanced=optimizeSubTopAlignment(makeSnap(()=>0,.92,0),makeSnap(()=>0,.92,-30),sr,90,.4,{stepMs:.02});
  assert(!imbalanced.reliable,'Severely imbalanced crossover levels must be rejected');
}
{
  const silence=new Float64Array(16384);assert.equal(computeDelay(silence,silence,48000,{maxDelayMs:20}),null,'Silence must not produce delay');
}
{
  const sr=48000,n=32768,ref=Float64Array.from({length:n},(_,i)=>Math.sin(2*Math.PI*1000*i/sr)),mic=delayed(ref,240,{noise:0});
  const r=computeDelay(ref,mic,sr,{maxDelayMs:20});assert(!r||!r.reliable,'A single tone must not be accepted as a reliable delay');
}
{
  const n=16384,k=1000,delay=238.4,phase=-2*Math.PI*k*delay/n;
  const corrected=applyDelayPhaseToCross(Math.cos(phase),Math.sin(phase),k,n,delay);
  assert(Math.abs(Math.atan2(corrected.im,corrected.re))<1e-10,'TF Auto Delay phase compensation failed');
  const phaseLead=2*Math.PI*k*delay/n,correctedLead=applyDelayPhaseToCross(Math.cos(phaseLead),Math.sin(phaseLead),k,n,-delay);
  assert(Math.abs(Math.atan2(correctedLead.im,correctedLead.re))<1e-10,'Negative TF delay compensation failed');
  assert(Math.abs(tfBandCoherence(1000,2**(1/6),48000)-.81)<1e-10,'TF band coherence aggregation failed');
}

{
  const bins=8192,nyq=24000,db=new Float64Array(bins).fill(-120),linear=new Float64Array(bins);const hz=nyq/bins,k=Math.round(40/hz);db[k]=-10;linear[k]=10**(-1);
  const pDb=binOverlapPowerDb(db,35,45,nyq),pLin=binOverlapLinearPower(linear,35,45,nyq,1);
  assert(Math.abs(pDb-10*Math.log10(pLin))<1e-8,'dB/linear band integration mismatch');assert(pDb>-12&&pDb<-9,'40 Hz energy lost at band boundary');
}
{
  const cut=1000,series=[];for(let i=-50;i<=250;i++){const t=cut+i*10,sec=Math.max(0,(t-cut)/1000),db=i<0?-10:-10-30*sec;series.push({t,db});}
  const r=analyzeDecay(series,cut,10);assert(r&&r.rt60&&Math.abs(r.rt60-2)<.08,`RT60 expected 2.0s, got ${r?.rt60}`);
}
{
  assert(Math.abs(micCalAt(Math.sqrt(100*1000))-.5)<1e-10,'Mic calibration must interpolate logarithmically');
  assert.equal(micCalAt(10),3,'Mic calibration low clamp failed');assert.equal(micCalAt(24000),-2,'Mic calibration high clamp failed');
}
{
  const flat=GEQ.map(()=>0),rel=eqEngine.relByLevel(flat),corr=eqEngine.buildCorr(flat,rel);
  assert(corr.every((v,k)=>GEQ[k]<100||GEQ[k]>16000?v===null:v===0),'Flat response or HPF/LPF gating failed');
  const hump=GEQ.map(f=>12*Math.exp(-.5*(Math.log2(f/63)/.22)**2)),hRel=eqEngine.relByLevel(hump),hCorr=eqEngine.buildCorr(hump,hRel);
  assert(hCorr.every((v,k)=>v==null||v>=-6&&v<=3),'EQ safety limits failed');
}
{
  const bells=[{f:63,gain:-4,q:2},{f:160,gain:2,q:1.4},{f:500,gain:-3,q:2.8},{f:1600,gain:1.2,q:1},{f:4000,gain:-2.5,q:4},{f:10000,gain:1,q:2}];
  const bell=(f,fc,q)=>1/(1+(2*q*Math.sinh(Math.LN2*Math.log2(f/fc)))**2);
  const target=GEQ.map(f=>f<100||f>16000?null:bells.reduce((s,b)=>s+b.gain*bell(f,b.f,b.q),0));
  const fit=eqEngine.paramFromCorr(target);assert(fit.length<=6&&fit.length>=4,'Parametric optimizer band count failed');
  const err=GEQ.reduce((s,f,k)=>{if(target[k]==null)return s;const y=fit.reduce((a,b)=>a+b.gain*bell(f,b.f,b.q),0);return s+(target[k]-y)**2;},0)/target.filter(v=>v!=null).length;
  assert(Math.sqrt(err)<.75,`Parametric optimizer RMSE too high: ${Math.sqrt(err)}`);
}

console.log(`Measurement engine validation passed (${delayCases.length} delay cases).`);
