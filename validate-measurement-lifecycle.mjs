import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const core=readFileSync('js/app-core.js','utf8');
const rootCore=readFileSync('app-core.js','utf8');
const html=readFileSync('index.html','utf8');
assert.equal(rootCore,core,'Both runtime core copies must match');

function extract(name){
  const start=core.indexOf(`function ${name}(`);assert(start>=0,`Missing ${name}`);
  const brace=core.indexOf('{',start);let depth=0,quote='',escape=false;
  for(let i=brace;i<core.length;i++){
    const c=core[i];
    if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++;else if(c==='}'&&--depth===0)return core.slice(start,i+1);
  }
  throw new Error(`Unclosed ${name}`);
}

for(const [name,timer] of [['measureArea','areaMeasureTimer'],['measurePosition','eqMeasureTimer'],['tfMeasure','tfMeasureTimer']]){
  const fn=extract(name);
  assert(fn.includes(`${timer}=setTimeout`),`${name} must own its completion timer`);
  assert(fn.includes("!running||!audioCtx"),`${name} must reject a stale completion`);
}

const cleared=[];
const nodes=new Map();
const ctx={
  areaMeasureTimer:11,eqMeasureTimer:12,tfMeasureTimer:13,
  areaState:'measuring',areaAccum:{},areaFrames:7,measState:'measuring',measAccum:{},measFrames:8,
  tfState:'measuring',tfMic:{},tfRef:{},tfFrames:9,tfSweepAcquiring:true,
  clearTimeout:id=>cleared.push(id),updateAreaMeasBtn(){},updateEqUI(){},
  document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{textContent:'busy',style:{}});return nodes.get(id);}}
};
vm.createContext(ctx);vm.runInContext(`${extract('cancelTimedMeasurements')};cancelTimedMeasurements()`,ctx);
assert.deepEqual(cleared,[11,12,13]);
assert.equal(ctx.areaState,'idle');assert.equal(ctx.measState,'idle');assert.equal(ctx.tfState,'idle');
assert.equal(ctx.tfSweepAcquiring,false);

assert(extract('setFft').includes("if(measureBusy())"),'FFT changes must be blocked while measuring');
assert(extract('switchInput').includes('await stop()'),'Input switching must cancel the old measurement session');
for(const name of ['stop','resetSession']){
  const fn=extract(name);
  assert(fn.includes('cancelManagedSourceRun(true)')&&fn.includes('cancelTimedMeasurements()'),`${name} must cancel timed and managed-source measurements`);
}

assert(html.includes('data-src="external-sweep"'),'Source selector must expose external sweep explicitly');
assert(extract('isSweepSource').includes("kind==='external-sweep'"));
assert(extract('runDelayCapture').includes('isSweepSource(requestedSignal)'));
assert(core.includes("function tfMeasure(sourceKind='external')")&&core.includes('tfSweepAcquiring=isSweepSource(sourceKind)'));
assert(core.includes("function verifyTfWorkflow(sourceKind='external',options={})")&&core.includes('const verifyMs=isSweepSource(sourceKind)'));
assert(core.includes("function capturePhase(which,sourceKind='external')")&&core.includes('let t=isSweepSource(sourceKind)'));

const rtStart=extract('startRT60'),rtRestore=extract('restoreRt60Generator'),rtAbort=extract('abortRT60');
assert(rtStart.includes("genType='pink'")&&rtStart.includes('genStart({preserveTfSync:true,autoSync:false})'),'RT60 must always start its own pink-noise source');
assert(rtRestore.includes('previous.on')&&rtRestore.includes('previous.type'),'RT60 must restore the prior generator state');
assert(rtAbort.includes('restoreRt60Generator(restoreGenerator)'),'RT60 cancellation must use the same restoration path');

console.log('Measurement lifecycle validation passed: cancellation, FFT lock, device switch, RT60 restore and external sweep.');
