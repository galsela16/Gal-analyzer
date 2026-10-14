const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../js/app-core.js'),'utf8'),context=vm.createContext({Float32Array,Float64Array,Math,Number});
vm.runInContext(['fft','computeAlignedPhaseSnapshot','subTopCaptureQuality'].map(name=>{const start=code.indexOf('function '+name+'(');return code.slice(start,code.indexOf('\n}',start)+2)}).join('\n'),context);
function lowpass(a,sr,hz){const w=2*Math.PI*hz/sr,c=Math.cos(w),alpha=Math.sin(w)/Math.SQRT2,b0=(1-c)/2/(1+alpha),b1=(1-c)/(1+alpha),b2=b0,a1=-2*c/(1+alpha),a2=(1-alpha)/(1+alpha);let x1=0,x2=0,y1=0,y2=0;return Float32Array.from(a,x=>{const y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y})}
const report=[];
for(const sr of [48000,96000])for(const crossover of [90,120]){
 const length=Math.floor(sr*6.8),ref=new Float32Array(length),mic=new Float32Array(length),delay=Math.round(sr*.039),n=16384,half=n/2;let phase=0;
 for(let i=0;i<sr*6;i++){phase+=2*Math.PI*(crossover/2)*Math.pow(4,i/(sr*6))/sr;ref[Math.floor(sr*.55)+i]=.1*Math.sin(phase)}
 const filtered=lowpass(lowpass(ref,sr,120),sr,120);for(let i=delay;i<length;i++)mic[i]=filtered[i-delay];
 const snap=context.computeAlignedPhaseSnapshot(ref,mic,sr,{delaySamples:delay,fftN:n});
 const q=context.subTopCaptureQuality(snap,crossover,.4);assert(q.ok,'Filtered crossover sweep rejected: '+JSON.stringify(q));report.push({sr,crossover,pathDelayMs:39,lowpassHz:120,...q});
 let seed=12345;const random=Float32Array.from(mic,()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return (seed/4294967296*2-1)*.1});const bad=context.computeAlignedPhaseSnapshot(ref,random,sr,{delaySamples:delay,fftN:n});assert(!context.subTopCaptureQuality(bad,crossover,.4).ok,'Unrelated noise accepted');
}
console.log(JSON.stringify({pass:true,report},null,2));
