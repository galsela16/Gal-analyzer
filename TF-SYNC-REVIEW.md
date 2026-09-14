# TF sync review — 2026-09-14

Reviewed GitHub main at a5ffccf (5.5.77).

Fixed in this local copy:
- Managed measurements no longer schedule a competing generator-loopback auto-sync.
- Busy sync requests do not clear an in-progress measurement.
- Restoring a previously running generator preserves completed TF synchronization.
- Delay analysis retains the excitation type present when recording began.
- TF/Sub-Top failures display the existing detailed diagnostics persistently, including incomplete recording, missing input, narrow bandwidth and inconsistent checks.
- Offline cache identifier updated.

Validation passed: 36 delay cases plus existing Sub/Top optimizer scenarios, 167 regression checks, control wiring (168 ID controls), static-site validation, and new TF sync lifecycle tests for pink noise, sweep, generator restoration, busy state and persistent failure details.

No hardware recording was supplied. These fixes address verified code paths, but do not establish the cause of a failure with physical Reference input. No estimator acceptance thresholds were relaxed. Test TF Sync with Top alone before separate Sub and Top captures; use the same signal at microphone and reference and a sufficient search range.

This review accompanies the TF synchronization fix committed to the repository. Deployment remains a separate step.
