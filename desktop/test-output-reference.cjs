const assert=require('node:assert/strict'),{NativeHost}=require('./native-host.cjs');
(async()=>{
 let packets=[],ended=[];const host=new NativeHost({app:{isPackaged:false},testing:true,send:(name,p)=>{if(name==='gal:native:packet')packets.push(p);else ended.push(p)}});
 try{
  const info=await host.start({uid:'field-test',sampleRate:48000,outputRef:{uid:'field-test',channel:31,mic:7}});
  assert.equal(info.channels,2);assert(info.outputReference);assert.deepEqual(info.labels,['Input 8','Out 32 · REF']);
  for(let i=0;i<100&&packets.length<8&&!ended.length;i++)await new Promise(r=>setTimeout(r,20));assert(packets.length>=5);assert(packets.every(p=>p.channels===2));assert.equal(ended.length,0);
  const samples=packets.flatMap(p=>Array.from(new Float32Array(p.pcm.buffer,p.pcm.byteOffset,p.pcm.byteLength/4)));let error=0,count=0;
  for(let i=240;i<samples.length/2;i++){error+=Math.abs(samples[i*2]-.7*samples[(i-240)*2+1]);count++}assert(error/count<1e-6,'MIC/REF timing or channel order changed');
  await assert.rejects(()=>host.start({uid:'field-test',sampleRate:48000,outputRef:{uid:'field-test',channel:-1,mic:7}}));
  console.log(JSON.stringify({pass:true,syntheticOnly:true,channels:2,mic:'Input 8',reference:'Out 32',knownDelayMs:5,meanError:error/count,hardwareOutputTapValidated:false}));
 }finally{await host.stop()}
})().catch(e=>{console.error(e);process.exitCode=1});
