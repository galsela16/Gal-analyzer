# GAL Analyzer 5.5.55

- Added a live field guide for the complete TF sequence: play continuous broadband stimulus, Sync, Verify, wait for Stable, then Capture.
- Preserved the stable Working Average on the graph after the stimulus stops, allowing inspection and capture afterward.
- Changed measurement-triggered sweeps to one complete deferred cycle instead of a repeating loop.
- Kept manual Generator sweeps continuous; only measurement sweeps use single-cycle behavior.
- Collapsing the EQ correction workspace now closes it completely and releases the full canvas.
- Kept the latest EQ result available from SPL / EQ for reopening.
- Added clear held, paused, acquiring, and stable feedback without changing RTA, M/R, or Waterfall.
