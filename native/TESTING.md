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
