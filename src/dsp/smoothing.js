export function smoothArray(prev, next, alpha) {
  for (let i = 0; i < prev.length; i++) {
    prev[i] = alpha * prev[i] + (1 - alpha) * next[i];
  }
}

export function updatePeak(peak, current, decay = 0.97) {
  for (let i = 0; i < peak.length; i++) {
    peak[i] = Math.max(current[i], peak[i] * decay);
  }
}
