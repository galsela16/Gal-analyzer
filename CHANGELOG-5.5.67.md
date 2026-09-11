# GAL Analyzer 5.5.67

- Measures narrow tones between FFT bins instead of rounding to a bin centre.
- Uses the local median spectrum as the noise floor so music and broadband energy do not bias the detected frequency.
- Tracks frequency with a rolling median and frequency-relative tolerance, preventing boundary jumps.
- Uses measured -3 dB bandwidth for improved feedback Q filtering.
- Applies the same precision peak engine to Waterfall resonance detection.
