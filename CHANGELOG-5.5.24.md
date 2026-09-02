# GAL Analyzer 5.5.24

- Rebuilt the TF difference graph as a dense per-frequency deviation display.
- Added direction and severity colors: warm colors for positive gain, green near unity, and cyan/blue for negative gain.
- Added a high-contrast detailed response contour for narrow peaks, cancellations and comb filtering.
- Expanded the TF difference area while retaining the separate Reference and Mic comparison above it.
- Kept coherence gating so unreliable frequency bins do not masquerade as useful detail.
- Batched the dense columns into seven canvas paths to preserve smooth motion and low rendering overhead.
