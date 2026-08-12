import { state } from "./src/core/state.js";

import {
  AudioEngine
} from "./src/audio/audioEngine.js";

import {
  Renderer
} from "./src/render/renderer.js";

import {
  smoothArray,
  updateBandPeaks
} from "./src/dsp/smoothing.js";

import {
  BandEngine
} from "./src/dsp/bands.js";


const canvas =
  document.getElementById("canvas");

const startBtn =
  document.getElementById("startBtn");

const bpoSelect =
  document.getElementById("bpoSelect");


let audio;
let renderer;
let bandEngine;

let peakTimes;


startBtn.onclick = async () => {
  if (state.running) {
    return;
  }

  try {
    audio =
      new AudioEngine(state.fftSize);

    await audio.init();

    renderer =
      new Renderer(canvas);

    bandEngine =
      new BandEngine(
        audio.ctx.sampleRate,
        state.fftSize
      );

    bandEngine.setBandsPerOctave(
      state.rta.bandsPerOctave
    );

    allocateBandBuffers();

    const fftLength =
      audio.analyser.frequencyBinCount;

    state.data.current =
      new Float32Array(fftLength);

    state.data.smooth =
      new Float32Array(fftLength);

    state.data.current.fill(-120);
    state.data.smooth.fill(-120);

    state.running = true;

    startBtn.textContent =
      "Audio Running";

    startBtn.disabled = true;

    loop();

  } catch (error) {
    console.error(
      "Audio initialization failed:",
      error
    );

    startBtn.textContent =
      "Microphone Error";
  }
};


bpoSelect.addEventListener(
  "change",
  () => {
    const bpo =
      Number(bpoSelect.value);

    state.rta.bandsPerOctave =
      bpo;

    if (!bandEngine) {
      return;
    }

    bandEngine.setBandsPerOctave(
      bpo
    );

    allocateBandBuffers();
  }
);


function allocateBandBuffers() {
  const size =
    bandEngine.bands.length;

  state.rta.current =
    new Float32Array(size);

  state.rta.smooth =
    new Float32Array(size);

  state.rta.peak =
    new Float32Array(size);

  state.rta.current.fill(-120);
  state.rta.smooth.fill(-120);
  state.rta.peak.fill(-120);

  peakTimes =
    new Float64Array(size);

  peakTimes.fill(
    performance.now()
  );
}


function loop() {
  if (!state.running) {
    return;
  }

  const fft =
    audio.getData();

  state.data.current.set(
    fft
  );

  smoothArray(
    state.data.smooth,
    state.data.current,
    state.smoothing
  );

  const bands =
    bandEngine.process(
      state.data.smooth
    );

  state.rta.current.set(
    bands
  );

  smoothArray(
    state.rta.smooth,
    state.rta.current,
    0.65
  );

  updateBandPeaks(
    state.rta.peak,
    state.rta.smooth,
    peakTimes,
    performance.now(),
    state.rta.peakHoldMs,
    state.rta.peakDecayDbPerSecond
  );

  renderer.render(
    bandEngine.bands,
    state.rta.smooth,
    state.rta.peak
  );

  requestAnimationFrame(
    loop
  );
}
