# GAL Analyzer 5.5.35

- TF Capture no longer requires Delay Sync or verification.
- Captures with a valid Reference, completed sync and successful verification are stored as `Verified` with full magnitude, phase, coherence and delay data.
- All other TF captures are stored and visibly labeled `Unverified`; mic-only TF captures retain the displayed spectrum without claiming transfer-function validity.
- Verified/Unverified state appears in the graph legend, permanent Traces rail and measurement-session list.
- TF traces retain rename, show/hide and delete support in either state.
- Removed the remaining workspace and measurement-health capture blocks for missing Reference or low coherence; safety blocks for clipping, headroom and SNR remain active.
- Updated application version identifiers and service-worker cache busting to 5.5.35.
- Made TF self-explanatory in the canvas: the upper area is labeled as source-vs-system input comparison, the lower area as `MIC − REF` system response with a 0 dB reference, and an always-visible trust guide says whether the view is Verified or must not yet be used for tuning.
- Renamed the header's misleading `READY` audio indicator to `AUDIO LIVE`; measurement readiness remains the separate health status.
