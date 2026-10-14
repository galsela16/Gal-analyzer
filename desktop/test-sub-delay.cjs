const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../js/app-core.js'),'utf8');
const functions=['fft','delayChunkSize','computeDelay','computeSweepDelay','computeStableDelay'];
const context=vm.createContext({Float32Array,Float64Array,Math,Number,Infinity});
vm.runInContext(functions.map(name=>{const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}',start)+2;return source.slice(start,end)}).join('\n'),context);
let seed=13579;function noise(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1}
function sweep(sr,low,high,duration){const a=new Float32Array(Math.floor(sr*(duration+.8))),start=Math.floor(sr*.55);let phase=0;for(let i=0;i<sr*duration&&start+i<a.length;i++){phase+=2*Math.PI*low*Math.pow(high/low,i/(sr*duration))/sr;a[start+i]=.2*Math.sin(phase)}return a}
function delay(a,sr,ms){const out=new Float32Array(a.length),shift=Math.round(sr*ms/1000);for(let i=shift;i<a.length;i++)out[i]=a[i-shift];return out}
function lowpass(a,sr,hz){const w=2*Math.PI*hz/sr,c=Math.cos(w),alpha=Math.sin(w)/Math.SQRT2,b0=(1-c)/2/(1+alpha),b1=(1-c)/(1+alpha),b2=b0,a1=-2*c/(1+alpha),a2=(1-alpha)/(1+alpha);let x1=0,x2=0,y1=0,y2=0;return Float32Array.from(a,x=>{const y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y})}
const report=[];
for(const sr of [48000,96000]){
 const ref=sweep(sr,25,160,6),mic=delay(ref,sr,12.5);
 let r=context.computeStableDelay(ref,mic,sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});report.push({case:'sub pure',sr,...r,checks:undefined});assert(r.reliable);assert(Math.abs(r.ms-12.5)<.2);
 const filtered=lowpass(lowpass(mic,sr,120),sr,120);r=context.computeStableDelay(ref,filtered,sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});report.push({case:'120 Hz crossover (includes group delay)',sr,...r,checks:undefined});assert(r.reliable);assert(r.ms>12.5&&r.ms<22);
 const unrelated=Float32Array.from(ref,()=>noise()*.05);r=context.computeStableDelay(ref,unrelated,sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});assert(!r?.reliable,'Unrelated noise accepted');
 const a=delay(ref,sr,5),b=delay(ref,sr,35),ambiguous=Float32Array.from(a,(v,i)=>v+b[i]);r=context.computeStableDelay(ref,ambiguous,sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});assert(!r?.reliable,'Two equal arrivals accepted');
 const tone=Float32Array.from(ref,(_,i)=>.2*Math.sin(2*Math.PI*70*i/sr));r=context.computeStableDelay(tone,delay(tone,sr,12.5),sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});assert(!r?.reliable,'Single tone accepted');
 const noisy=Float32Array.from(filtered,v=>v+noise()*.002);r=context.computeStableDelay(ref,noisy,sr,{signalType:'sweep',subSweep:true,maxDelayMs:50});assert(r.reliable,'Sub sweep with modest background noise rejected');
 const full=sweep(sr,20,20000,4);r=context.computeStableDelay(full,delay(full,sr,5),sr,{signalType:'sweep',maxDelayMs:50});assert(r.reliable&&Math.abs(r.ms-5)<.1,'Full sweep regressed');
}
console.log(JSON.stringify({pass:true,report},null,2));
