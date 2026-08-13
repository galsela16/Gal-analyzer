export const state = {
  running: false,

  fftSize: 16384,

  smoothing: 0.85,

  rta: {
    bandsPerOctave: 3,

    current: null,
    smooth: null,
    peak: null,

    peakHoldMs: 1500,
    peakDecayDbPerSecond: 12
  },

  data: {
    current: null,
    smooth: null
  }
};
