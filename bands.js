export class BandEngine {
  constructor(sampleRate, fftSize) {
    this.sampleRate = sampleRate;
    this.fftSize = fftSize;
    this.binHz = sampleRate / fftSize;

    this.minFreq = 20;
    this.maxFreq = 20000;

    this.bandsPerOctave = 3;
    this.bands = [];

    this.setBandsPerOctave(this.bandsPerOctave);
  }

  setBandsPerOctave(bpo) {
    this.bandsPerOctave = Number(bpo);
    this.bands = this.createBands();
  }

  createBands() {
    const bands = [];

    const ratio = Math.pow(2, 1 / this.bandsPerOctave);
    const halfBandRatio = Math.pow(2, 1 / (2 * this.bandsPerOctave));

    let center = 1000;

    while (center / ratio >= this.minFreq) {
      center /= ratio;
    }

    while (center < this.minFreq) {
      center *= ratio;
    }

    while (center <= this.maxFreq) {
      const low = center / halfBandRatio;
      const high = center * halfBandRatio;

      bands.push({
        center,
        low,
        high
      });

      center *= ratio;
    }

    return bands;
  }

  process(fftDb) {
    const output = new Float32Array(this.bands.length);

    for (let b = 0; b < this.bands.length; b++) {
      const band = this.bands[b];

      const startBin = Math.max(0, Math.floor(band.low / this.binHz - 0.5));
      const endBin = Math.min(fftDb.length - 1, Math.ceil(band.high / this.binHz - 0.5));

      let power = 0;
      let coveredHz = 0;

      for (let i = startBin; i <= endBin; i++) {
        const db = fftDb[i];

        if (!Number.isFinite(db)) continue;

        const binLow=Math.max(0,(i-0.5)*this.binHz);
        const binHigh=(i+0.5)*this.binHz;
        const overlap=Math.max(0,Math.min(band.high,binHigh)-Math.max(band.low,binLow));
        if(overlap<=0) continue;
        power += Math.pow(10, db / 10) * (overlap / this.binHz);
        coveredHz += overlap;
      }

      if (coveredHz === 0 || power <= 0) {
        output[b] = -120;
        continue;
      }

      // Power integration בתוך כל fractional-octave band
      output[b] = 10 * Math.log10(power);
    }

    return output;
  }
}
