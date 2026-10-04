# GAL Analyzer Native

The desktop edition is free to use and is being developed with free tools. It runs locally, with native audio capture, native drawing and an offline measurement engine.

## First milestone

A launchable desktop application with audio input selection, separate MIC/REF channel assignment, paired live meters and an RTA with 1/3, 1/6, 1/12, 1/24 and 1/48 octave resolution. The interface stays in English with one consistent typeface.

The native DSP foundation is platform independent. UI and device capture are implemented using the selected platform's native APIs. Measurement processing is independent of graph animation and UI refresh rate.

## Numerical contract

- Audio samples are normalized floating point; full-scale peak is 0 dBFS.
- A full-scale sine wave measures approximately -3.0103 dBFS RMS.
- FFT input uses a Hann window. Single-sided spectral power is normalized so its sum agrees with the window-weighted time-domain mean square.
- Octave bands integrate overlapping FFT-bin power, including fractional bin overlap.
- Sample-rate tests cover 44.1, 48 and 96 kHz.
- MIC/REF data must come from the same input callback and sample clock.
- dBFS must never be labeled as calibrated physical SPL.
- Delay, transfer function, coherence, RT60 and Sub/Top recommendations follow in later milestones, with numerical parity and hardware loopback tests before release.

Local execution and command-line builds use no paid SDKs or subscription services. Store publishing and public distribution signing are separate from local development.

## macOS preview 6.0.0-preview.2

The first executable preview uses SwiftUI, AVAudioEngine/Core Audio and the shared C++ DSP engine. No browser, web server or web view is required.

Implemented: input-device enumeration, MIC/REF channel selection from one device, live RMS/peak readouts, RTA and MIC/REF spectrum comparison, all five octave resolutions, Freeze/Resume, capture/rename/show/hide/delete/clear traces, JSON trace export, and a native sine/white-noise/pink-noise generator with a separate settings sheet and Start/Stop controls. The horizontal MIC meter and the left MIC meter use the exact same smoothed level.

Not yet implemented: calibrated SPL, calibration-file import, transfer function/coherence, arrival-time measurement, RT60 and Sub/Top alignment. Trace JSON currently uses the native-preview schema and is not advertised as a web-session import format.

### Build and run

Requires macOS 13 or newer and Apple's free Command Line Tools (`xcode-select --install`). Full Xcode and a paid Apple Developer membership are not required for this local build.

```sh
native/scripts/build-macos.sh
open "native/build/GAL Analyzer Native.app"
```

The build checks the DSP numerics, builds both Apple Silicon and Intel executables and combines them into a universal `.app`. The executable is locally signed with an ad-hoc signature. This preview is not notarized for frictionless public distribution; App Store publication and Developer ID notarization are outside this free local-development milestone.

Click **Start audio** to request microphone access. Select one input device, assign MIC, and optionally assign a different REF channel from the same device. No audio leaves this Mac. Audio is analyzed in memory; only captured spectrum values are written when you explicitly export traces.

### Validation

`native/core/tests/GalDSPTests.cpp` covers 45 combinations of sample rate, level and octave resolution, plus silence, invalid configurations and spectral power conservation. `GALAnalyzerNative --smoke-test` enumerates input devices without starting capture. Apple Silicon execution is tested on the development Mac; the Intel binary is cross-compiled but has not been run on Intel hardware. A live physical-interface capture and channel/latency loopback test remain necessary before describing this as a validated field-measurement release.

### Signal generator

Open **Open generator…** in the side panel to choose an output device, one hardware output channel, sine/white/pink waveform, sine frequency and digital peak ceiling. Opening or dismissing the sheet does not start or stop the signal. **Start signal** and **Stop signal** are available both in the sheet and side panel. Input capture and output generation run independently.

Output starts off, defaults to −30 dBFS peak ceiling and is limited to −80…−6 dBFS. Changes to routing or signal settings stop playback; start again to apply them. A 20 ms envelope ramps the signal up/down. Only the selected channel is populated; other channels are explicitly zeroed. Device configuration changes stop output. App termination stops both engines. No system default audio device is changed.

Sine level is peak dBFS; RMS is about 3.01 dB lower. White noise is bounded uniform noise; pink uses a 16-row Voss-McCartney approximation. Noise level indicates its sample ceiling, not normalized RMS. Pink spectral accuracy is approximate and is tested across 200 Hz–6.4 kHz; it is not a calibrated full-band test-source specification.

The build also runs generator numerical tests and the executable's `--generator-test` using AVAudioEngine manual offline rendering. It verifies left/right routing, silent unselected channels, level and ramp to silence without opening a hardware output or playing sound. Live hardware playback, simultaneous capture/output and disconnect behavior still require the manual checks below; no audible playback was performed during automated validation.
