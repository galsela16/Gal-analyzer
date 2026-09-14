import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('js/app-core.js','utf8');
const between=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const lifecycle=between('function genStart(', 'function syncInlineGenBtns(')+between('function runWithSource(', "safeOn('areaCombBtn'");
for(const kind of ['pink','sweep'])for(const previouslyOn of [false,true]){
  const timers=[],routes=[],autoSync=[];
  const gain={gain:{value:0,setTargetAtTime(){}},connect(){}};
  const oscillator={frequency:{value:0},connect(){},start(){}};
  const ctx={running:true,audioCtx:{state:'running',currentTime:0,destination:{},createGain:()=>gain,createOscillator:()=>oscillator,createBufferSource:()=>({...oscillator})},
    genOn:previouslyOn,genType:'pink',genSweepDur:4,genSweepSingleShot:false,genGain:null,genSrc:null,genOsc:null,genHz:1000,genDb:-20,genSweepStartTimer:null,
    document:{getElementById:()=>null},alert:assert.fail,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},
    makeNoiseBuffer(){},setGenTypeUI(){},syncGeneratorLoopbackUi(){},syncInlineGenBtns(){},scheduleSweepCycle(){},
    refreshReferenceRouting:(preserve)=>routes.push(preserve),scheduleLoopbackAutoSync:()=>autoSync.push(true)};
  ctx.genStop=()=>{ctx.genOn=false;};
  vm.createContext(ctx);vm.runInContext(lifecycle,ctx);
  let measured=0;
  ctx.runWithSource(kind,()=>{measured++;},3800);
  timers.sort((a,b)=>a.ms-b.ms).forEach(t=>t.fn());
  assert.equal(measured,1);
  assert.equal(autoSync.length,0,`${kind}: managed measurement must not schedule competing sync`);
  assert.equal(routes[0],false);
  if(previouslyOn)assert.equal(routes.at(-1),true,'Restoring generator must preserve completed TF synchronization');
}
const syncCode=between('function tfAutoDelay(', 'function resetTfAutoDelay(');
const nodes=new Map();
const ctx={running:true,analyserRef:{},document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id);}},
  measureBusy:()=>true,syncGeneratorLoopbackUi(){},v3Toast(){},pickSource:fn=>fn(),delaySearchMs:50};
vm.createContext(ctx);vm.runInContext(syncCode,ctx);
// No reset/capture stubs: touching either during a busy measurement throws.
ctx.tfAutoDelay({loopbackAuto:true});ctx.tfAutoDelay();
let failure='';
Object.assign(ctx,{measureBusy:()=>false,cancelTfWorkflowVerification(){},clearSubTopSnapshots(){},syncSubTopWorkflowUi(){},syncTfWorkflowUi:m=>{failure=m;},
  runDelayCapture:(btn,cb)=>cb(null,'capture'),resetTfAutoDelay(){},syncGeneratorLoopbackUi(){},delayFailureText:(r,reason)=>'diagnostic:'+reason,
  loopbackAutoSyncActive:false,tfDelayReady:true,tfWorkflowVerified:true,tfDelayQualityText:''});
ctx.tfAutoDelay();
assert.equal(failure,'diagnostic:capture');
assert.match(nodes.get('phStatus').textContent,/diagnostic:capture/);
assert.equal(readFileSync('app-core.js','utf8'),source,'Both delivered core copies must match');
console.log('TF sync lifecycle passed: managed pink/sweep, restoration, busy guard, persistent capture diagnostics.');
