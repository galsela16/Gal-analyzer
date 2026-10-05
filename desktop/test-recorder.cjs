const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');let Recorder;
vm.runInNewContext(fs.readFileSync(__dirname+'/../recorder-worklet.js','utf8'),{Float32Array,AudioWorkletProcessor:class{constructor(){this.messages=[];this.port={postMessage:x=>this.messages.push(x)};}},registerProcessor:(_name,p)=>Recorder=p});
const p=new Recorder();p.port.onmessage({data:{cmd:'start',micChannel:2,refChannel:3,frames:4101}});
const input=Array.from({length:6},(_,c)=>new Float32Array(128).fill(c+1));for(let i=0;i<33;i++)p.process([input],[]);
const blocks=p.messages.filter(x=>x.mic);assert.equal(blocks.reduce((n,x)=>n+x.mic.length,0),4101);assert(blocks.every(x=>x.mic.every(v=>v===3)&&x.ref.every(v=>v===4)));assert.equal(p.messages.at(-1).done,true);assert.equal(p.messages.at(-1).frames,4101);assert.equal(p.isRecording,false);
const absent=new Recorder();absent.port.onmessage({data:{cmd:'start',micChannel:5,refChannel:1,frames:128}});absent.process([[input[0]]],[]);assert.match(absent.messages[0].error,/unavailable/);
const mono=new Recorder();mono.port.onmessage({data:{cmd:'start',micChannel:0,refChannel:-1,frames:13}});mono.process([[input[0]]],[]);assert(mono.messages[0].ref.every(v=>v===0));assert.equal(mono.messages[0].mic.length,13);assert.equal(mono.messages.at(-1).frames,13);
console.log('Recorder higher-channel routing, exact completion, missing input and mono reference passed.');
