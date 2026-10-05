class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    this.buffer = { mic: new Float32Array(4096), ref: new Float32Array(4096) };
    this.pos = 0;
    this.micChannel = 0;
    this.refChannel = 1;
    this.remaining=Infinity;this.total=0;

    this.port.onmessage = (e) => {
      if (e.data.cmd === 'start') {
        this.micChannel = Math.max(0, Number(e.data.micChannel) || 0);
        this.refChannel = Number.isInteger(Number(e.data.refChannel)) ? Number(e.data.refChannel) : -1;
        this.remaining=Number.isInteger(e.data.frames)&&e.data.frames>0?e.data.frames:Infinity;this.total=0;
        this.isRecording = true;
        this.pos = 0;
      } else if (e.data.cmd === 'stop') {
        this.isRecording = false;
        this.flush();
        this.port.postMessage({done:true,frames:this.total});
      }
    };
  }

  flush(){
    if(!this.pos)return;
    this.port.postMessage({mic:this.buffer.mic.slice(0,this.pos),ref:this.buffer.ref.slice(0,this.pos)});
    this.pos=0;
  }

  process(inputs, outputs, parameters) {
    if (!this.isRecording) return true;
    
    const input = inputs[0];
    if (input && input.length > 0) {
      const loopback = inputs[1] && inputs[1][0];
      const c0 = input[this.micChannel];
      if(!c0){this.isRecording=false;this.port.postMessage({error:"Measurement input is unavailable."});return true;}
      const c1 = loopback || input[this.refChannel] || null;
      
      for(let i = 0; i < c0.length && this.remaining>0; i++) {
        this.buffer.mic[this.pos] = c0[i];
        this.buffer.ref[this.pos] = c1 ? c1[i] : 0;
        this.pos++;this.total++;this.remaining--;
        
        if(this.pos>=4096)this.flush();
        if(this.remaining===0){this.isRecording=false;this.flush();this.port.postMessage({done:true,frames:this.total});}

      }
    }
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderWorklet);
