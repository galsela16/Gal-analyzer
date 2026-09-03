# GAL Analyzer 5.5.38

- Replaced the separate dense-FFT M/R calculation with the canonical RTA band-power calculation for both channels.
- M/R microphone and Reference now use identical frequency bands, overlap integration and display axes, so identical input content produces directly comparable measurements.
- Linked M/R temporal response to the same `tfSmoothA` coefficient used by TF. Fast, Normal and Slow now move identically in both modes.
- Removed the fixed 0.975 M/R smoothing that made 5.5.37 respond too slowly.
- Added an explicit `REF 2 · NO SIGNAL` warning when the Reference input is silent or unavailable, rather than presenting the floor line as a real measurement.
- Preserved the dedicated M/R tab, blue microphone, red Reference and original RTA presentation.
- Updated version identifiers and service-worker cache busting to 5.5.38.
