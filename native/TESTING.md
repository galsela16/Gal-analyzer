# Native preview acceptance

## Automated checks

- Build and run `GalDSPTests` using `native/scripts/build-macos.sh`.
- Confirm the bundled executable's `--smoke-test` starts and enumerates devices without requesting capture access.
- Verify the bundle contains both arm64 and x86_64 architectures.
- Verify the microphone usage description exists and the ad-hoc code signature is valid.

## Device and UI checks

1. Launch the `.app`. Confirm startup shows audio stopped, input-device names and RTA resolution choices.
2. Start audio and respond to the macOS permission dialog. A denied request must produce an actionable status message.
3. Verify distinct MIC and REF channel assignments on a multichannel interface. REF None must never show invented reference data.
4. Confirm the left MIC meter and bottom MIC meter move together.
5. Play a known electrical test signal and check the displayed RMS/peak levels and tone frequency.
6. Select every octave resolution, including 1/48. A running input must restart cleanly and discard stale spectrum frames.
7. Capture, rename, hide, show, delete and clear traces. Export and inspect JSON; names and level units must be preserved.
8. Freeze only the spectrum; live meters must continue. Resume must recover current spectrum data.
9. Stop or disconnect the interface. The meters must reset or show an input-stopped status, and old callbacks must not update a new session.
10. Close the app while audio is active; the tap and engine must stop.

Public field-readiness requires passing the physical-interface tests. The initial preview must not claim calibrated SPL or delay/TF/RT60 accuracy before those engines and tests are implemented.

## Generator acceptance (preview.2)

Automated: `GalGeneratorTests` checks sine RMS, noise ceiling/spectral slope, callback-size continuity, three sample rates, ramp to silence and invalid settings. `--generator-test` renders through the production AVAudioSourceNode callback in offline mode; it verifies both stereo destinations and silence on the other channel. Neither check plays audio.

Manual hardware checks:

1. Opening/closing the generator sheet must preserve output state. App startup must never play sound.
2. Select an output device and channel, then start at the default −30 dBFS ceiling. Verify only that channel receives signal. Check channels above 2 on a multichannel interface.
3. Check sine frequency and peak/RMS level in an electrical loopback. Capture MIC/REF while the generator runs; stopping capture must not stop output, and the generator Stop must not stop capture.
4. Check white/pink spectra. Digital ceiling must not be displayed as a noise RMS or physical SPL calibration.
5. Changing waveform, frequency, level or routing stops output until explicitly restarted. Rapid changes during a stop must not restart a stale configuration.
6. Disconnect/change the output device while active. Output must stop with an actionable message, without falling back to another speaker automatically.
7. Stop signal and quit while active; verify no stuck output or abrupt transient. Closing the settings sheet intentionally keeps an already-running signal active, visibly indicated in the side panel.
