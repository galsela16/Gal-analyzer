# GAL Analyzer 5.5.37

- Restored the RTA graph to its original single-input band presentation.
- Added a separate `M/R` tab beside RTA for microphone/reference comparison.
- M/R displays microphone Input 1 in blue and Reference Input 2 in red on one shared graph.
- Added matching blue/red outlines, translucent fills and an explicit on-graph legend.
- Added five-bin frequency smoothing plus slow temporal smoothing to both inputs, eliminating the fast, jumpy raw-FFT presentation while preserving fair channel comparison.
- Kept M/R state separate from RTA, Waterfall and TF navigation.
- Preserved the RTA calculation and capture path and the single-input fallback.
- Updated version identifiers and service-worker cache busting to 5.5.37.
