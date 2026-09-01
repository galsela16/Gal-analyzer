# GAL Analyzer V5.5.3 — Deep Audit 2

- Inline scripts checked: **7**, failures: **0**
- Project JS/MJS checked: **31**, failures: **0**
- Missing local HTML assets: **4**
- Duplicate static HTML IDs: **0**
- Unresolved static getElementById targets: **4**
- Missing manifest icons: **0**
- Duplicate named core functions: **0**
- Stale integration tokens: **1**

## Validators
- node validate-static-site.mjs: **PASS** — GAL Foundation validation passed.
- node validate-measurement-engines.mjs: **PASS** — Measurement engine validation passed (30 delay cases).
- node validate-v552-regressions.mjs: **PASS** — PASS runtime core copies match
PASS no undefined isoBands dependency
PASS waterfall decay uses canonical FFT data
PASS waterfall confidence uses hz
PASS waterfall label has confidence
PASS delay repeatability wired to capture
PASS health reads analyser samples
PASS health reads reference samples
PASS right tools no dead uiTools selector
PASS right tools no dead uiSettings selector
PASS trace capacity supports field sessions
PASS visual issue chips use hz
V5.5.3 regression validation passed (12 checks).

## Details
- Inline syntax failures: `[]`
- JS syntax failures: `[]`
- Missing assets: `['pink', 'sweep', 'external', 'cancel']`
- Duplicate IDs: `[]`
- Unresolved IDs: `['frzBtn', 'holdBtn', 'peakHoldBtn', 'tfSyncBtn']`
- Missing icons: `[]`
- Duplicate functions: `{}`
- Stale tokens: `['window.audioCtx']`

## Remaining field-test scope
Static/source checks cannot emulate Safari/WebAudio hardware, microphone permissions, real interfaces, acoustic reflections, CPU throttling, or long-session memory behavior.

## Follow-up inspection

The first-pass scanner produced several false positives:
- `pink`, `sweep`, `external`, `cancel` were button/data values, not asset URLs. Actual script/link/image assets were re-scanned: **0 missing**.
- `frzBtn`, `holdBtn`, `peakHoldBtn`, `tfSyncBtn` are intentional legacy fallbacks with valid primary/fallback controls.

One **real integration bug** was confirmed:
- TF Confidence checked `window.audioCtx`, but the application declares `audioCtx` with top-level `let`, which does not become a `window` property. The confidence card could therefore fail to update even while audio was running.
- Fixed by removing the invalid global-property gate and relying on `tfCurrentSnapshot()` readiness.
- Added a regression check for this exact failure.

Final regression suite: **13/13 PASS**.
