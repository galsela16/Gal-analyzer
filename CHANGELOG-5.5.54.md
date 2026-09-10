# GAL Analyzer 5.5.54

- Added a thick, stable Working Average trace to TF while retaining a subdued live trace.
- Added progressive, coherence-weighted accumulation that ignores unreliable frequency bins.
- Automatically pauses accumulation until Reference, Delay Sync, verification, and confidence are valid.
- Added Fast, Normal, and Precision averaging modes plus Reset Average.
- Added clear WAITING, ACQUIRING, STABLE, and PAUSED status feedback.
- Verified Capture now stores the stable working average; premature or unsupported captures remain Unverified.
- Kept RTA, M/R, and Waterfall behavior unchanged.
