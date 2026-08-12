# GAL Analyzer V4 — Measurement Workspace

V4 focuses on real system measurement, not cosmetic changes.

## Main changes
- All measurement tools (TF, Delay Finder, RT60, SPL/EQ, Spatial Average) now open as bottom measurement docks, matching the Sub/Top alignment workflow. The graph stays visible.
- Each dock has a compact working view and an `עוד` button for advanced controls/results.
- TF main graph now shows the actual transfer magnitude (Measurement / Reference), centered relative to the mid-band, rather than simply drawing the two input spectra.
- TF Auto Delay is directly available in the TF dock.
- Live Phase and Coherence toggles are directly available in the TF dock.
- Capture up to 6 TF traces and compare them on the main graph.
- Saved TF traces remain visible while measuring the next position/system state.
- Existing TF phase/coherence gating, Delay Finder, RT60, Sub/Top alignment, EQ, generator, captures, mic calibration and session tools remain available.

## Install
Upload the CONTENTS of this folder to the root of the GitHub repository and replace the existing files. Then hard-refresh the deployed page.
