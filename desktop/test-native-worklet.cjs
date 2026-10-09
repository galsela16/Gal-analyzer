const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let Processor;
vm.runInNewContext(fs.readFileSync(__dirname+'/native-input-worklet.js','utf8'),{sampleRate:48000,Float32Array,AudioWorkletProcessor:class{constructor(){this.errors=[];this.port={postMessage:e=>this.errors.push(e)};}},registerProcessor:(_name,p)=>Processor=p});
const make=()=>new Processor({processorOptions:{channels:6}});
const send=(p,frames,sequence)=>{const samples=new Float32Array(frames*6);for(let i=0;i<frames;i++)for(let c=0;c<6;c++)samples[i*6+c]=c+i/65536;p.port.onmessage({data:{channels:6,sampleRate:48000,frames,sequence,pcm:new Uint8Array(samples.buffer)}});};
const p=make();send(p,2400,0);const output=Array.from({length:6},()=>new Float32Array(128));p.process([], [output]);for(let c=0;c<6;c++)for(let i=0;i<128;i++)assert.equal(output[c][i],c+i/65536);
send(p,128,2);assert.match(p.errors[0].discontinuity,/sequence gap/);
const overflow=make();send(overflow,4800,0);send(overflow,2400,1);assert.match(overflow.errors[0].discontinuity,/latency exceeded/);assert.equal(overflow.failed,false);assert.equal(overflow.frames,2400);
const underrun=make();send(underrun,2400,0);for(let i=0;i<20;i++)underrun.process([],[output]);assert.match(underrun.errors[0].discontinuity,/interrupted/);send(underrun,2400,1);underrun.process([],[output]);assert.equal(underrun.failed,false);assert.equal(underrun.started,true);
console.log('Native worklet channel order, sequence gap, overflow and underrun passed.');

assert.equal(p.prefill,1920);assert.ok(overflow.frames/48000<=.12);

const stalled=make();send(stalled,2400,0);send(stalled,2400,1);send(stalled,2400,2);
assert.equal(stalled.frames,2400);assert.equal(stalled.failed,false);
const large=make();send(large,16384,0);assert.equal(large.frames,5760);assert.equal(large.failed,false);
const onset=make();send(onset,960,0);onset.process([],[output]);assert.equal(onset.started,false);
send(onset,960,1);onset.process([],[output]);assert.equal(onset.started,true);
console.log('40 ms startup and 120 ms maximum queued audio passed, including delayed delivery.');
