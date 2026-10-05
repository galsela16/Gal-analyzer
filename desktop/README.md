# GAL Analyzer Desktop — 6.0.0-preview.10

This is the preferred Mac edition: the existing GAL Analyzer web interface and measurement code packaged as an offline Electron application. It keeps the existing RTA, transfer-function, delay, RT60, generator, meters, routing and trace/session controls instead of rebuilding them in SwiftUI. Their existing web implementation and accuracy limitations still apply. The independent `native/` preview remains an experimental DSP foundation; this desktop edition does not yet connect that C++ engine.

## Run

Unzip `GAL-Analyzer-Desktop-6.0.0-preview.10-arm64.zip`, then open **GAL Analyzer.app**. This build is for Apple Silicon Macs. It is locally ad-hoc signed, not notarized for public distribution. No server, account, subscription or network connection is required. Microphone access is requested by macOS when the existing Start audio control is used. No microphone or audible generator playback is started by build tests.

The desktop profile is independent of browser storage. Export a session from the web edition and import it with the existing session controls to transfer settings/traces. Closing the application stops its audio processes. Input capture uses a native Core Audio HAL helper and preserves the device's actual channel count. Analysis and generator output retain the existing Web Audio implementation.

## Build

Install free Node.js (22.16+), then:

```sh
cd desktop
npm ci
npm test
npm run build:mac
```

Electron and the packager are pinned in `package-lock.json`. `prepare.cjs` copies shared runtime assets from the repository into generated `web/`; it changes only desktop version labels and disables hosted service-worker updates. Root web source files are not forked or modified. Each build refreshes the copy, so future interface fixes apply to both editions.

The generated bundle contains Chromium and is consequently larger than the SwiftUI prototype. It preserves the web engine's behavior and avoids rebuilding working features. Native input capture is bridged into the existing analysis interface. Native DSP and generator output remain future work.

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

## Native Core Audio input (preview.7)

Desktop input enumeration and capture now bypass Chromium getUserMedia. The signed Swift helper opens the selected Core Audio device directly through a HAL AudioUnit, captures every input channel into a preallocated lock-free ring, converts the hardware sample rate when needed with AVAudioConverter, and delivers framed Float32 PCM through a restricted preload bridge and AudioWorklet. Device disconnects, sequence gaps, overflow and underrun stop capture with an explicit error. No channels are duplicated to fill missing inputs.

EVO8 exposes six Core Audio input channels: four analog inputs and two loopback channels. The I/O selector labels these separately. The device's physical sample rate is preserved; conversion occurs outside the real-time callback. MIC and REF can be assigned to any received channel, while independent raw RTA monitoring remains available for all channels.

The integration test checks six distinct native helper signals through the actual IPC, preload, AudioWorklet and measurement pipeline without capturing hardware or playing sound. The build also checks ring wraparound, channel order, partial reads and overflow. Earlier preview notes above describe their historical browser capture limitations; preview.7 replaces that desktop input path. Electrical loopback validation of measurement accuracy remains required.

## TF field reliability (preview.8)

Delay/sync recording now explicitly preserves all received channels and completes from an exact sample count plus a recorder acknowledgement. Higher input assignments cannot be down-mixed into a default stereo recorder. Incomplete captures time out explicitly; cancellations disconnect only their recorder, keeping the input graph running through a permanent silent sink. Switching from mono to a multichannel interface restores the reference automatically unless None was explicitly chosen. Audio start/stop transitions are serialized.

A stable verified TF trace captures its held working average immediately, including after the stimulus stops. Source-assisted verification/capture preserves sync; cancellation clears pending capture/verification timers. TF computation is limited to 30 updates per second to avoid redundant FFT work.

The native delivery buffer now tolerates longer UI work and automatically re-buffers after a delivery interruption. Both channels resume together. An interruption invalidates any in-flight measurement and resets TF verification rather than saving a result containing missing samples. The input itself stays active; format errors and physical disconnection still stop capture explicitly. This does not claim uninterrupted audio under arbitrary CPU overload.

The synthetic field integration test uses six real helper/IPC/AudioWorklet channels with a known 5 ms broadband delay. It checks mono-to-multichannel routing, TF sync and verification, verified capture, held capture after stimulus ends, four consecutive path recordings, channels 3/4, persistence of the captured trace during subsequent measurements, and input survival during a 350 ms UI stall. It uses no audible playback. Physical electrical loopback and prolonged field validation remain necessary.

## Trace labels and colors (preview.9)

Every captured or averaged trace receives an unused color from a 24-color palette, with additional colors available for larger average collections. Deleting a trace makes its color available without changing existing trace colors. Trace names are directly editable in the sidebar with one click: Enter or leaving the field saves, Escape cancels, and blank names retain the original. Naming uses an inline field rather than an unsupported Electron prompt dialog. The list shows a matching colored marker and keeps TF trust on a separate line.

## Performance work (preview.9)

Extra input FFT data is fetched only when its RTA overlays can be drawn, and hidden I/O meter DOM is left alone. TF normalization and confidence use an exact upper-median selection instead of sorting full arrays. Snapshots are reused only for the same processed TF frame; captured traces always copy their arrays. Native capture delivers approximately 20 ms blocks, reducing IPC/message overhead, and playback prefill is reduced from 150 to 100 ms. Channel count, sample rate, FFT resolution and the selected analysis smoothing remain unchanged.

Delay/TF sync correlation now runs in a dedicated worker using the same tested numerical functions. The renderer stays responsive and can deliver input packets during analysis. The recording graph detaches separately; the measurement stays busy until analysis finishes. Cancellation, input interruptions, errors and timeouts terminate the worker and cannot publish stale results. Integration checks compare worker and synchronous sweep results, exercise cancellation during analysis, and check that the renderer remains responsive.

Run `Contents/MacOS/GAL Analyzer --performance-test` to profile the owned application with six synthetic inputs and no audible output. [Recorded results](performance-results.json) show TF draw median 8.0 → 5.9 ms and M/R 3.8 → 2.8 ms. RTA remained around 3.6–3.8 ms. Transport messages fell from approximately 100 to 50 per second in that fixture; physical capture previously pumped every 5 ms and now pumps every 20 ms. These are short controlled before/after measurements, not a comparison against the user's browser or proof of a field latency improvement.

## Waterfall depth (preview.9)

Stronger perspective and more vertical display relief make sustained peaks easier to distinguish. Shaded surface faces occlude the rear ridges instead of accumulating transparent haze; distant contours fade and the current slice remains prominent. Frequency cursor and resonance markers share the same floor axis, with room reserved for the level scale. Measured samples, history duration, spectral filtering and the bounded row/point count are unchanged.

## Larger Waterfall (preview.10)

The surface now fills more of the graph with a wider horizon, greater time depth and taller level relief. Blue, cyan, teal and warm amber replace the previous full rainbow; softer historical contours and opaque shaded faces keep the foreground readable. Resize measures toolbar clearance once so tall peaks remain below the resolution controls. Frequency cursor and resonance guides follow the same perspective floor. The ten-second history, measured samples, smoothing and row/point bounds are unchanged.

The same 85-row, 240-point synthetic display fixture was visually checked at normal and smaller window sizes. Short isolated draw timings are recorded in `performance-results.json`; they are display checks, not hardware latency measurements.
