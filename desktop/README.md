# GAL Analyzer Desktop — 6.0.0-preview.6

This is the preferred Mac edition: the existing GAL Analyzer web interface and measurement code packaged as an offline Electron application. It keeps the existing RTA, transfer-function, delay, RT60, generator, meters, routing and trace/session controls instead of rebuilding them in SwiftUI. Their existing web implementation and accuracy limitations still apply. The independent `native/` preview remains an experimental DSP foundation; this desktop edition does not yet connect that C++ engine.

## Run

Unzip `GAL-Analyzer-Desktop-6.0.0-preview.6-arm64.zip`, then open **GAL Analyzer.app**. This build is for Apple Silicon Macs. It is locally ad-hoc signed, not notarized for public distribution. No server, account, subscription or network connection is required. Microphone access is requested by macOS when the existing Start audio control is used. No microphone or audible generator playback is started by build tests.

The desktop profile is independent of browser storage. Export a session from the web edition and import it with the existing session controls to transfer settings/traces. Closing the application stops its audio processes. Audio access uses the existing Chromium/Web Audio implementation; packaging alone does not claim a faster RTA or native multichannel Core Audio routing.

## Build

Install free Node.js (22.16+), then:

```sh
cd desktop
npm ci
npm test
npm run build:mac
```

Electron and the packager are pinned in `package-lock.json`. `prepare.cjs` copies shared runtime assets from the repository into generated `web/`; it changes only desktop version labels and disables hosted service-worker updates. Root web source files are not forked or modified. Each build refreshes the copy, so future interface fixes apply to both editions.

The generated bundle contains Chromium and is consequently larger than the SwiftUI prototype. It preserves the web engine's behavior and avoids rebuilding working features. A future native audio bridge can replace capture/processing while retaining this interface.

## Validation and boundaries

`npm test` starts an invisible Electron window and checks the actual shared bootstrap, secure local origin, microphone API, 1/48 control, chart canvases, isolated renderer and recorder AudioWorklet loading. It opens no hardware input and generates no audible signal. Run the same integration test on a packaged app using `Contents/MacOS/GAL Analyzer --self-test`.

The renderer has no Node access; it is sandboxed with context isolation. Only bundled `gal://app` assets are served; remote HTTP requests and remote navigation are blocked. Camera and screen-capture permissions are denied; microphone permission is confined to the local analyzer. Export downloads remain initiated through the existing user controls.

Manual acceptance still requires real microphone capture, electrical loopback, generator playback, session import/export and comparison with the browser edition. Intel packaging and native DSP bridging are future work. No speed improvement is claimed from the wrapper alone.

## Parallel input monitoring (preview.4)

I/O now offers requested input counts 2/4/8/16/32. The received stream's reported channel count controls the available inputs; unavailable channels are never invented. Each received channel has an independent digital RMS meter and raw dBFS RTA curve. Use the input checkboxes to hide individual curves, or Show all input curves to hide the overlay. MIC/REF can be selected from the received channels; TF/delay still operate on this selected pair. Extra RTA curves do not inherit the MIC calibration file.

The integration test sends eight distinct frequencies/levels through a real Chromium ChannelMerger and verifies individual meters and spectra, FFT changes and disposal. This does not establish physical-interface multichannel support: if Chromium or the driver delivers only two channels, this build can monitor only those two. A future Core Audio capture bridge will be needed for interfaces whose full channels are not exposed through Web Audio.

### Mono and layout correction (preview.5)

Received channel metadata is enforced through a discrete, explicitly sized gain node before all analyzers/recording. A device reporting one channel offers only Input 1 and REF None; the missing reference analyzer receives no connection, reference meters reset immediately, and the reference card is hidden. Coherence is unavailable without a real reference. This replaces the previous speculative channel-2 fallback, so interfaces that under-report channels require a future native capture bridge rather than invented availability.

Parallel input controls live in the I/O drawer, appear only for 3+ received channels, and do not expand the trace sidebar. Mono/stereo RTA retain their original presentation without duplicate curves. The integration test reproduces a stream with a hidden second channel but mono metadata and verifies zero reference audio, REF None, one input choice, hidden reference card and sidebar/label bounds. Live hardware verification remains necessary.

### Layout correction (preview.6)

Delay title/actions occupy separate grid cells, with measurement controls wrapping to two rows instead of being clipped. Expanded settings scroll within the dock. Integration checks run at 1440×940 and 1080×760 and assert that title/actions and range/unit controls do not intersect and that controls stay inside their card. TF explanatory labels use explicit left alignment and a bounded left column; reference/trust status uses the right column below the resolution strip. Filter handles occupy a separate lower row. Cursor readouts sit above frequency-axis labels.
