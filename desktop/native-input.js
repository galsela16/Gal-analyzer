/* Core Audio capture adapter. The hosted web edition never loads this file. */
window.GalNativeInput=(()=>{
 const host=window.galNativeHost;
 if(!host)return null;
 let active=null;
 async function listDevices(){
  const inputs=await host.list();
  const browser=await navigator.mediaDevices.enumerateDevices();
  return [...inputs.map(d=>({kind:'audioinput',deviceId:'coreaudio:'+d.uid,label:`${d.name} · ${d.channels} channels`,groupId:d.uid,channels:d.channels,labels:d.labels,isDefault:d.isDefault})),...browser.filter(d=>d.kind==='audiooutput')];
 }
 async function open(context,deviceId){
  await context.audioWorklet.addModule('native-input-worklet.js');
  await stop();
  const uid=deviceId?.startsWith('coreaudio:')?deviceId.slice(10):'';
  const track=new EventTarget();track.readyState='live';track.kind='audio';
  const current={node:null,id:null,pending:[],unsubscribe:null,unend:null,stopped:false,track};active=current;
  current.unsubscribe=host.onPacket(packet=>{
   if(current.stopped||current.id&&packet.id!==current.id)return;
   if(current.node)current.node.port.postMessage(packet);
   else if(current.pending.length<16)current.pending.push(packet);
   else finish('Native input could not attach in time. Restart audio.');
  });
  const finish=message=>{
   if(current.stopped)return;current.stopped=true;track.readyState='ended';track.nativeError=message;
   current.unsubscribe?.();current.unend?.();current.node?.port.postMessage({stop:true});
   host.stop().catch(()=>{});track.dispatchEvent(new Event('ended'));
   if(message){const error=document.getElementById('errBox');if(error){error.textContent=message;error.style.display='block';}}
  };
  current.unend=host.onEnded(event=>{if(!current.id||event.id===current.id)finish(event.message)});
  try{
   const info=await host.start({uid,sampleRate:context.sampleRate});current.id=info.id;
   if(current.stopped)throw Error('Native capture was cancelled.');
   const node=new AudioWorkletNode(context,'gal-native-input',{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[info.channels],channelCount:info.channels,channelCountMode:'explicit',channelInterpretation:'discrete',processorOptions:{channels:info.channels}});
   current.node=node;node.port.onmessage=event=>{
    if(event.data.error)finish(event.data.error);
    if(event.data.discontinuity)window.dispatchEvent(new CustomEvent('gal-input-discontinuity',{detail:{message:event.data.discontinuity}}));
   };
   for(const packet of current.pending)if(packet.id===info.id)node.port.postMessage(packet);current.pending=[];
   track.getSettings=()=>({channelCount:info.channels,sampleRate:info.sampleRate,deviceId:'coreaudio:'+info.uid});
   track.stop=()=>finish();
   return {source:node,stream:{native:true,info,getAudioTracks:()=>[track],getTracks:()=>[track]}};
  }catch(error){finish();throw error;}
 }
 async function stop(){
  if(active){active.stopped=true;active.track.readyState='ended';active.unsubscribe?.();active.unend?.();active.node?.port.postMessage({stop:true});active.node?.disconnect();active=null;}
  await host.stop();
 }
 return {open,stop,listDevices};
})();
