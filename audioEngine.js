export class AudioEngine {
  constructor(fftSize) {
    this.ctx = new AudioContext();
    this.fftSize = fftSize;
  }

  async init() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    this.source = this.ctx.createMediaStreamSource(stream);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.fftSize;
    this.analyser.smoothingTimeConstant = 0; // אנחנו שולטים בזה

    this.source.connect(this.analyser);

    this.buffer = new Float32Array(this.analyser.frequencyBinCount);
  }

  getData() {
    this.analyser.getFloatFrequencyData(this.buffer);
    return this.buffer;
  }
}
