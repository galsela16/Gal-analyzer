# GAL Analyzer 5.5.12

- Added continuous time interpolation between Waterfall captures to remove stepwise movement.
- Replaced per-frequency-segment strokes with one continuous gradient stroke per ridge.
- Removed per-frame interpolated-row array allocations to reduce garbage-collection pauses.
- Preserved the ultra-dense 157-ridge view and reference colour palette.
