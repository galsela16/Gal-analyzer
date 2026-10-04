# Measurement accuracy audit — 5.7.13

Synthetic validation passed at 44.1, 48 and 96 kHz. The tests execute functions extracted from the production engine, rather than a separate implementation.

- RMS and peak levels: −6, −20 and −60 dBFS peak sine waves; tolerance 0.001 dB.
- TF: −12, 0 and +6 dB channel gain; magnitude, coherence and gain normalization. Maximum observed magnitude error below 0.001 dB.
- Phase: known 73-sample delay, before and after compensation; tolerance 0.01 degree.
- Independent channel noise rejected by coherence after averaging.
- Silent and weak reference inputs rejected by verification, including stale coherent history.
- Capture verification now checks current signal quality, not only historical verification flags. Both acceptance and rejection paths covered.
- Existing engine suite passed 30 delay scenarios including reflections, inverted polarity, sweeps and unstable delay. Routing, lifecycle and meter stability suites also passed.

Run `node validate-signal-accuracy.mjs` from this folder. Numerical results are saved to `signal-accuracy-results.json`.

## Physical loopback acceptance — still required

1. Feed the same continuous signal to MIC and REF through the audio interface. Verify TF gain near 0 dB and delay near the measured interface path offset.
2. Apply a known −6 dB gain and confirm raw TF magnitude changes by −6 dB; normalized response intentionally removes uniform gain.
3. Add known 5 ms and 20 ms delays; compare measured change against the baseline (target error below 0.15 ms).
4. Disconnect REF, then reconnect it. Confirm a new capture while disconnected is Unverified and verification recovers only with valid current signals.
5. Repeat at the interface sample rates used in practice and check channel mapping.

This audit validates software numerics. It does not establish microphone calibration, interface latency, physical SPL accuracy or room measurement accuracy.
