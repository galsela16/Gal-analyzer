# GAL Analyzer 5.5.77 — Delay Field Rebuild

- Prevents a mono input from being duplicated into the Reference channel and falsely reporting 0 ms.
- Arms the delay recorder before a generated sweep starts, preserving the low-frequency and sub portion of the sweep.
- Records the complete sweep, including ten-second sweeps, without a hidden capture cap.
- Detects normal and inverted polarity with signed cross-correlation in both noise and sweep measurements.
- Requires agreement between independent time windows and their polarity before accepting a result.
- Prefers the earliest plausible direct arrival and rejects strong late reflections that could otherwise look like the system delay.
- Analyses only samples actually received from the recorder and reports interrupted captures as failures.
- Cancels active delay work safely when audio is stopped, restarted or the session is reset.
- Keeps repeatability histories separate for the signal path and for each individual speaker.
- Saves speaker names, stability and polarity, and warns when a speaker has opposite polarity to the selected anchor.
- Covers 36 delay scenarios at 44.1, 48 and 96 kHz, including fractional timing, gain mismatch, sub sweeps, inversion, reflections, long sweeps, silence and unrelated signals.
