import { state } from "./src/core/state.js";
import { AudioEngine } from "./src/audio/audioEngine.js";
import { Renderer } from "./src/render/renderer.js";
import { smoothArray, updatePeak } from "./src/dsp/smoothing.js";

const canvas = document.getElementById("canvas");
const renderer = new Renderer(canvas);

let audio;

document.getElementById("startBtn").onclick = async () => {
  if (state.running) return;

  audio = new AudioEngine(state.fftSize);
  await audio.init();

  const size = audio.analyser.frequencyBinCount;

  state.data.current = new Float32Array(size);
  state.data.smooth = new Float32Array(size);
  state.data.peak = new Float32Array(size).fill(-100);

  state.running = true;

  loop();
};

function loop() {
  if (!state.running) return;

  const raw = audio.getData();

  state.data.current.set(raw);

  smoothArray(state.data.smooth, state.data.current, state.smoothing);
  updatePeak(state.data.peak, state.data.smooth);

  renderer.render(state.data.smooth, state.data.peak);

  requestAnimationFrame(loop);
}
