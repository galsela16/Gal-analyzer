export function smoothArray(prev, next, alpha) {
  for (let i = 0; i < prev.length; i++) {
    if (!Number.isFinite(prev[i])) {
      prev[i] = next[i];
      continue;
    }

    prev[i] =
      alpha * prev[i] +
      (1 - alpha) * next[i];
  }
}

export function updateBandPeaks(
  peak,
  current,
  peakTimes,
  now,
  holdMs = 1500,
  decayDbPerSecond = 12
) {
  for (let i = 0; i < peak.length; i++) {
    if (current[i] >= peak[i]) {
      peak[i] = current[i];
      peakTimes[i] = now;
      continue;
    }

    const holdElapsed = now - peakTimes[i];

    if (holdElapsed <= holdMs) {
      continue;
    }

    const decay =
      decayDbPerSecond / 60;

    peak[i] -= decay;

    if (peak[i] < current[i]) {
      peak[i] = current[i];
      peakTimes[i] = now;
    }
  }
}
