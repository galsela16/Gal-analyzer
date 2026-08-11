export const state = {
  running: false,

  fftSize: 16384,

  smoothing: 0.85,

  data: {
    current: null,
    smooth: null,
    peak: null
  }
};
