class NativeInputProcessor extends AudioWorkletProcessor {
 constructor(options){
  super();this.channels=options.processorOptions.channels;this.capacity=Math.ceil(sampleRate*1);this.prefill=Math.ceil(sampleRate*.1);
  this.ring=new Float32Array(this.capacity*this.channels);this.read=0;this.write=0;this.frames=0;this.started=false;this.failed=false;this.sequence=-1;
  this.port.onmessage=event=>{
   const packet=event.data;if(this.failed)return;
   if(packet.stop){this.failed=true;this.frames=0;return;}
   if(packet.channels!==this.channels||packet.sampleRate!==sampleRate||packet.pcm.byteLength!==packet.frames*this.channels*4){this.fail('Native channel/rate mismatch.');return;}
   if(this.sequence>=0&&packet.sequence!==((this.sequence+1)>>>0))this.rebuffer('Native audio sequence gap.');
   this.sequence=packet.sequence;
   if(packet.frames>this.capacity){this.fail('Invalid native packet size.');return;}
   if(packet.frames>this.capacity-this.frames)this.rebuffer('Audio delivery buffer overflow.');
   const values=new Float32Array(packet.pcm.buffer,packet.pcm.byteOffset,packet.pcm.byteLength/4);
   for(let i=0;i<packet.frames;i++){
    for(let c=0;c<this.channels;c++)this.ring[this.write*this.channels+c]=values[i*this.channels+c];
    this.write=(this.write+1)%this.capacity;
   }
   this.frames+=packet.frames;
  };
 }
 rebuffer(message){this.frames=0;this.read=0;this.write=0;this.started=false;this.port.postMessage({discontinuity:message});}
 fail(message){if(this.failed)return;this.failed=true;this.frames=0;this.port.postMessage({error:message});}
 process(_inputs,outputs){
  const output=outputs[0];if(this.failed)return true;
  if(!this.started){if(this.frames<this.prefill)return true;this.started=true;}
  const count=output[0].length;
  if(this.frames<count){this.rebuffer('Audio delivery was interrupted. Input is recovering; repeat this measurement.');return true;}
  for(let i=0;i<count;i++){
   for(let c=0;c<this.channels;c++)output[c][i]=this.ring[this.read*this.channels+c];
   this.read=(this.read+1)%this.capacity;
  }
  this.frames-=count;return true;
 }
}
registerProcessor('gal-native-input',NativeInputProcessor);
