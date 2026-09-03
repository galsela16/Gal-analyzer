# GAL Analyzer 5.5.36

- Replaced the single-input RTA bar presentation with one shared dual-input spectrum whenever a Reference channel is available.
- Microphone Input 1 is rendered as a magenta filled spectrum with a bright outline.
- Reference Input 2 is rendered as a green filled spectrum with a bright outline.
- Both inputs share the same logarithmic frequency and dB axes, allowing direct shape and level comparison without entering TF mode.
- Added a compact on-graph `MIC 1 / REF 2` legend.
- Preserved canonical RTA band calculations, peak detection, traces, capture and single-input fallback behavior.
- Updated release identifiers and service-worker cache busting to 5.5.36.
