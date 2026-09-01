# GAL Analyzer V5.5.3 — Visual Workspace Refresh

- New glass-style header and LIVE status pill.
- New mobile bottom toolbar: RTA, Waterfall, Generator, Traces, I/O.
- Graph area is visually framed and receives more space on mobile.
- Existing I/O, Generator and Trace tools are connected to the new controls.
- Measurement/DSP logic remains based on the validated V5.5.1 engine behavior.
- Cache/release identifiers bumped to V5.5.3.

## Graph mode refinement
- TF is now a first-class graph choice alongside RTA and Waterfall.
- Mobile quick toolbar now exposes RTA / Waterfall / TF directly.
- TF choice opens the live Transfer Function workspace and keeps graph-mode state synced.

- Delay Finder field diagnostics: STABLE/UNSTABLE, confidence %, usable bandwidth, excitation method, acoustic travel equivalent and clearer Pink Noise failure guidance.


## TF Pro workspace
- TF main graph now uses true relative magnitude after TF sync.
- Added professional TF status cards: delay, coherence/correlation, reference and traces.
- Added direct Magnitude / Phase / Coherence / Freeze-Trace / Auto Delay controls.
- Mobile TF panel redesigned as a bottom workspace.


## Phase Pro
- Added phase cursor with live phase/coherence readout.
- Added coherence gate toggle, wrapped/unwrapped phase view and 0-degree cursor reference.
- Added phase degree grid and cursor line on the main TF graph.
- Existing TF DSP and delay workflow retained.


## Sub / Top Alignment Pro
- Existing multi-bin phase/coherence optimizer retained and surfaced as engineer-friendly recommendation cards.
- Shows which source to delay, exact milliseconds, phase delta before/after and confidence.
- Shows expected summation improvement and evaluated crossover band.
- Added explicit re-measure verification flow; the app never silently applies DSP to external PA hardware.


## Unified Workspace
- Reduced the primary graph navigation to RTA / Waterfall / TF.
- Moved Delay Finder, Sub/Top, RT60 and SPL/EQ into one Measurement Tools area.
- Added a single contextual action bar that changes behavior with the current graph mode.
- Removed duplicate Generator / Traces / I/O actions from the mobile primary navigation while preserving access through the workspace/menu.
- Measurement engines and legacy tool entry points remain intact; this is a UI architecture cleanup, not a DSP rewrite.


## Workspace cleanup — I/O / Generator / Traces
- I/O, Generator and Traces now share one canonical workspace drawer position.
- Removed the duplicate permanent Generator header action.
- Context-bar Generator opens the same Generator drawer as the main menu.
- Mobile and desktop now use the same drawer concept instead of separate duplicate navigation patterns.
- Existing controls and DSP behavior are preserved inside their original panels.


## Unified Settings
- Consolidated Display, Measurement and Audio settings into one Settings area.
- Settings reuse existing engine controls instead of creating parallel state.
- I/O and Generator links inside Settings open the same canonical workspace drawers.
- Legacy Display control is retained internally for compatibility but removed from the visible workspace grid.


## Graph Focus
- Removed the duplicate graph-mode navigation from the header; RTA / Waterfall / TF now has one canonical switcher.
- Removed header-level resolution, theme, help, guide and accent controls from the measurement view; they remain available in Workspace/Settings.
- Reduced header height and visual chrome to give the graph more working area.
- Target visibility is now controlled from Settings rather than duplicated beside graph modes.
- LIVE pill can show READY when the existing audio engine reports an active/running state.


## Contextual Workspace
- Context bar now changes content and its secondary action for RTA, Waterfall and TF.
- RTA surfaces live peak context and Peak Hold when the underlying control exists.
- Waterfall surfaces time/frequency context and a Clear action when available.
- TF surfaces live Delay/Coherence context and Auto Delay using the existing TF sync control.
- Capture remains contextual: standard Trace in RTA/Waterfall and TF Trace in TF.
- No parallel DSP state was added; contextual actions bridge to existing controls.


## Waterfall Resonance Finder
- Automatic persistent-resonance detection is built directly into Waterfall.
- Persistent low-frequency peaks are marked on the graph with frequency and strength.
- Added Waterfall-only Resonance toggle and live readout.
- Clear resets both Waterfall history and resonance analysis.


## 3D Waterfall visual refresh
- Replaced the flat Waterfall presentation with a perspective ridge history inspired by the approved UI direction.
- Frequency/intensity uses a blue → cyan → green → yellow → orange/red progression.
- Newest spectrum is emphasized in the foreground; older captures recede into depth.
- Resonance Finder remains integrated and overlays its detected frequencies directly on the new Waterfall.
- Existing spectral analysis and measurement engines remain unchanged.


## Approved mockup visual layer
- Added a deeper cyan/teal instrument aesthetic across header, graph frame, graph switcher, context controls, drawers and mobile dock.
- Added segmented, tactile graph navigation and stronger active-state glow.
- Unified cards/drawers around darker glass surfaces and subtle cyan borders.
- Kept the one-main-graph architecture and all existing measurement behavior.


## RTA instrument finish
- Added a clearer major/minor frequency grid and subtle cyan graph depth.
- Tightened RTA contextual typography and instrument framing.
- Kept DSP/measurement calculations unchanged.


## Field controls and drawer finish
- Restyled Generator, I/O, Traces, measurement drawers and TF controls as one consistent instrument system.
- Added tactile active/pressed states, cyan status accents and glass instrument surfaces.
- Gave active Generator controls a distinct warm signal-state accent.
- Refined the mobile bottom dock to feel like a compact hardware control strip.
- Measurement logic remains unchanged.


## Product finishing pass
- Tightened typography, spacing and information hierarchy across graph navigation, context bar, menus, cards and drawers.
- Improved touch targets, pressed/focus states and narrow-phone behavior.
- Added safe-area handling and horizontal fallback for contextual actions on very narrow screens.
- Preserved the approved one-main-graph architecture and all measurement logic.


## Tighten pass
- Reduced decorative shadows/glow so measurement data has stronger visual priority.
- Tightened graph navigation and contextual action hierarchy.
- Increased usable graph area on phone and landscape field layouts.
- De-emphasized secondary Generator/Tools actions while preserving access.
- Kept all measurement engines and the V5.5.3 feature set unchanged.


## Persistent right tools rail
- Added a real quick-tools rail on the right side for desktop/tablet.
- Direct access to RTA, Waterfall, TF, Generator, I/O, Traces, Measure and Settings.
- On smaller screens the same rail becomes a compact horizontal field toolbar.
- Existing drawers and measurement engines are reused; no duplicate tool state was introduced.


## TF confidence and phase reliability
- Added a shared TF confidence score using mean coherence, coherent bandwidth coverage and short-term response stability.
- TF trace capture is blocked when confidence is LOW instead of saving a misleading trace.
- Sub/Top phase capture now evaluates coherence across a ±1/6-octave crossover band rather than trusting one FFT bin.
- Added crossover-band coverage to phase capture quality feedback.
- Added a live HIGH / MEDIUM / LOW TF Confidence card.


## Alignment repeatability confidence
- Added reliability scoring from optimizer confidence, crossover coverage, mean coherence and repeatability.
- Tracks recent results and evaluates delay spread plus polarity agreement.
- HIGH confidence requires repeatable evidence rather than a strong single result.


## Waterfall decay validation
- Added decay evidence to the integrated Waterfall Resonance Finder.
- Tracks 25–500 Hz band energy through falling-energy events rather than relying only on persistent peaks.
- Repeated slow-decay events increase resonance confidence; candidates can become decay-validated after repeated evidence.
- Keeps Resonance Finder inside Waterfall; no separate measurement mode and no RT60 workflow added.


## Full-spectrum Waterfall intelligence
- Expanded persistent-feature and decay analysis from the low-frequency room-mode range to approximately 20 Hz–20 kHz (subject to Nyquist).
- Added frequency-aware interpretation: ROOM MODE below 200 Hz, RESONANCE through the low-mid range, REFLECTION / RING through upper mids, and HF DECAY at high frequencies.
- Decay scoring now uses region-specific slope expectations instead of treating bass and treble identically.
- Tightened frequency matching at higher frequencies to reduce false associations between nearby features.
- Remains integrated inside the existing Waterfall; no separate analysis mode was added.


## Waterfall visual confidence
- Waterfall detections now expose a readable confidence percentage and frequency-aware issue label.
- Added ranked issue chips in the Waterfall context bar, showing up to three strongest current findings.
- Labels distinguish ROOM MODE, RESONANCE, REFLECTION / RING and HF DECAY.
- Confidence combines the existing persistence score with repeated decay evidence; low evidence is deliberately de-emphasized.


## Field reliability suite
- Added live Measurement Health for MIC, REF, relative SNR proxy, coherence, clipping, stability and overall readiness.
- Added explicit readiness reasons instead of a generic LIVE state.
- Added a reusable 3–5 sample Delay Repeatability scorer with spread and HIGH/MEDIUM/LOW classification.
- Added persistent Measurement Session / position naming scaffold for FOH, left/right, distance and sub workflows.
- Added Spatial Average UI entry point. True spectral averaging is intentionally not fabricated: it remains gated on wiring canonical captured trace arrays.
- This release does not claim Smaart-equivalent field accuracy; external reference validation remains a field-test task.


## Trace Manager + real Spatial Average
- Measurement Session now works directly with the canonical captured trace collection.
- Added select, rename, show/hide and delete controls for captured traces.
- Capture Position now creates a real RTA/TF trace through the existing capture engine.
- Spatial Average is implemented for RTA traces and TF traces.
- TF spatial averaging uses coherence-weighted magnitude and circular phase averaging to avoid invalid arithmetic phase averaging.
- Mixed RTA/TF selections are rejected rather than producing misleading output.


## Delay repeatability integration
- Connected the existing repeatability scorer to the Delay engine integration layer.
- Added a field UI badge for sample count, HIGH/MEDIUM/LOW repeatability and measured delay spread.
- The estimator thresholds and delay math are unchanged; repeatability is an independent reliability guard.
- No repeatability claim is shown until actual repeated delay samples exist.


## Audio-grounded Measurement Health
- Replaced the previous fixed SNR proxy with a rolling measured noise-floor estimator.
- SNR is now calculated relative to the learned microphone noise floor.
- Added live MIC headroom and separate low-headroom readiness protection.
- Measurement readiness now gates on clipping, stability, SNR/headroom and TF reference/coherence when relevant.
- Noise floor is learned conservatively from quiet low-level windows and reports LEARN until enough samples exist.
- Values remain digital dBFS-relative until an external microphone/SPL calibration is supplied.


## Measurement Health guidance and capture guard
- Added actionable field guidance for LOW MIC, CLIPPING, LOW HEADROOM, LOW SNR, UNSTABLE, LOW REF and LOW COHERENCE.
- Health warnings now explain what the operator should change rather than showing only a status code.
- Trace/capture actions are blocked for clearly invalid signal conditions such as clipping, insufficient headroom/SNR, low reference or low coherence.
- The guard does not block on ordinary settling/learning states, avoiding unnecessary workflow friction.


## Full code audit / regression fixes
- Fixed Waterfall decay analyzer referencing nonexistent `isoBands`; it now uses the canonical ISO bands and FFT data with correct binOverlapPowerDb arguments.
- Fixed Waterfall confidence UI reading `c.f` while resonance candidates store frequency as `hz`.
- Confidence percentage and frequency-aware issue type are now rendered on the actual Waterfall overlay.
- Fixed Measurement Health reading nonexistent window audio buffers; it now samples the active MIC and REF analysers directly.
- Fixed Delay Repeatability being present but not connected to the canonical delay capture callback.
- Fixed right-side Measure and Settings buttons targeting nonexistent element IDs.
- Increased trace retention from 6 to 24 for real spatial measurement sessions.
- Removed dead legacy session rendering that could overwrite the canonical Trace Manager list.
- Added a dedicated V5.5.3 regression validator covering these integration failures.


## V5.5.3 release audit
- Promoted from the fully audited V5.5.2 codebase after the final source/integration pass.
- Verified all project JS/MJS syntax and all inline HTML scripts.
- Verified local HTML assets, manifest icons, duplicate IDs, synchronized runtime core copies and service-worker key references.
- Foundation, synthetic Delay and integration regression suites all pass before release promotion.


## Target workspace pass 2
- Strengthened desktop instrument hierarchy and visual grouping.
- Added explicit Generator / I-O / Traces rail labels and Measurement / Tools section hierarchy.
- Enlarged and clarified RTA / Waterfall / TF mode selector.
- Bottom command bar now mirrors the live Start/Stop state and emphasizes Capture.
- No measurement-engine logic changed.


## Target workspace pass 3
- Styled Generator, I/O and Trace workspaces as coherent field-instrument panels.
- Added a compact left-side live status surface for generator, MIC/REF levels and trace counts.
- Live status mirrors canonical state only; it does not introduce duplicate measurement controls.
- Drawer inputs, buttons and trace rows now share the target dark/cyan visual language.


## Target workspace pass 4
- Added the dedicated right-side Measurement panel from the target design.
- Measurement panel mirrors live MIC dBFS, peak, SNR, coherence, headroom and readiness reason.
- Added an in-graph Peak/Hold information card that mirrors an existing spectral readout when available.
- Increased central graph emphasis and adjusted right-side hierarchy so Measurement sits above Tools.
- No synthetic SPL values are introduced; uncalibrated level remains labeled dBFS.


## Target workspace pass 5 — Waterfall
- Strengthened the pseudo-3D Waterfall depth/perspective while retaining the existing FFT/decay analysis.
- Decay-validated resonance labels now carry an explicit diamond marker.
- Added Waterfall-specific legend and mode styling.
- Right-side Measurement/Peak cards now surface the strongest current Waterfall issue, confidence and cause classification.
- No RT60 claim was introduced; decay validation remains the existing event-based evidence model.
