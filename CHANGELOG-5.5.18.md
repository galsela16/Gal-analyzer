# GAL Analyzer 5.5.18

- Fixed Traces opening the I/O panel by giving each workspace drawer an exclusive state.
- Rebuilt the Waterfall renderer around real captured slices rather than synthetic interpolated lines.
- Reduced the rendering workload from roughly 160 ridges per frame to at most 52 measured ridges.
- Added a short frequency-domain display filter for cleaner contours without blending history frames.
- Rebalanced perspective depth and amplitude to match a readable measurement waterfall instead of a filled waveform wall.
