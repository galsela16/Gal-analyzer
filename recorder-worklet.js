class RecorderWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.isRecording = false;
    this.buffer = { mic: new Float32Array(4096), ref: new Float32Array(4096) };
    this.pos = 0;
    this.micChannel = 0;
    this.refChannel = 1;

    this.port.onmessage = (e) => {
      if (e.data.cmd === 'start') {
        this.micChannel = Math.max(0, Number(e.data.micChannel) || 0);
        this.refChannel = Math.max(0, Number(e.data.refChannel) || 0);
        this.isRecording = true;
        this.pos = 0;
      } else if (e.data.cmd === 'stop') {
        this.isRecording = false;
        if(this.pos > 0) {
          this.port.postMessage({
            mic: this.buffer.mic.slice(0, this.pos),
            ref: this.buffer.ref.slice(0, this.pos)
          });
          this.pos = 0;
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    if (!this.isRecording) return true;
    
    const input = inputs[0];
    if (input && input.length > 0) {
      const c0 = input[this.micChannel] || input[0];
      const c1 = input[this.refChannel] || input[0];
      
      for(let i = 0; i < c0.length; i++) {
        this.buffer.mic[this.pos] = c0[i];
        this.buffer.ref[this.pos] = c1[i];
        this.pos++;
        
        if(this.pos >= 4096) {
          this.port.postMessage({ 
            mic: this.buffer.mic.slice(), 
            ref: this.buffer.ref.slice() 
          });
          this.pos = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('recorder-worklet', RecorderWorklet);
