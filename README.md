# GAL Analyzer V5.5.49 — Clean Header

V5.5.49 removes the redundant technical health strip from the header. Detailed SNR, noise, headroom, coherence and stability information remains available in the canonical Measurement panel.

V5.5.41 adds a compact segmented resolution selector directly below the RTA / M/R / Waterfall / TF row. The four canonical choices—1/3, 1/6, 1/12 and 1/24 octave—are always visible, synchronized with every existing resolution control and laid out without covering the graph.

V5.5.40 keeps the RTA / M/R / Waterfall / TF display selector visible at the top of the graph in narrow-window, tablet and phone layouts. The graph is positioned below the compact selector while the obsolete contextual action bar remains removed.

V5.5.39 removes the legacy contextual action bar from tablet, phone and narrow-window layouts. Peak Hold, Tools, Generator, Freeze and duplicate Capture controls no longer cover the graph when the window is reduced; the canonical navigation and command surfaces remain available.

V5.5.38 calculates M/R through the same canonical band-power engine used by RTA rather than through a separate raw-FFT renderer. Both M/R channels now use the exact TF smoothing coefficient selected by Analysis Speed, so M/R and TF move at the same rate in Fast, Normal and Slow. Missing Reference audio is shown explicitly instead of appearing as a valid flat red measurement.

V5.5.37 restores the original RTA presentation and moves the two-input comparison into a dedicated `M/R` graph tab. M/R overlays a temporally and spatially smoothed blue microphone spectrum with a red Reference spectrum, keeping the display stable enough for direct visual comparison without changing RTA behavior.

V5.5.36 shows microphone Input 1 and Reference Input 2 together on one canonical RTA graph. The microphone uses a magenta filled spectrum and the Reference uses a green filled spectrum, with clear outlines and an on-graph legend. The existing RTA band calculations and trace capture remain active beneath the new presentation.

V5.5.35 lets TF Capture save the current trace without Delay Sync or verification. Every TF trace now carries an explicit Verified or Unverified status in its name, graph legend, permanent Traces rail and measurement-session list. A verified Reference path still stores the complete magnitude, phase, coherence and delay snapshot; a mic-only TF view is stored as an Unverified spectrum. Show/hide, delete and rename continue to operate on both trust states, and legacy context/health guards no longer block an Unverified TF capture solely because Reference or coherence is unavailable.

V5.5.33 redesigns the RTA / Waterfall / TF selector as a compact segmented control with a restrained active indicator and no nested bright outline. The left and right collapse buttons are now slim, centered edge handles that stay visually attached to their rails.

V5.5.33 adds independent persistent collapse controls for the left and right desktop rails. The measurement canvas expands into the released space immediately. The bottom Traces action now reopens and focuses the permanent trace rail, and TF capture always uses the canonical two-channel TF trace path instead of silently creating an RTA trace.

V5.5.33 disconnects the desktop canvas geometry from the legacy Generator and I/O open-state classes. Opening either floating panel can no longer subtract its height from the graph or move the level meter. Every Traces entry point now focuses the permanent left-rail list and cannot reactivate the old drawer layout.

V5.5.33 embeds the canonical Trace list directly in the left desktop rail. Traces remain open at all times, use every remaining pixel down to the bottom command bar, and expose capture, visibility and deletion without opening a drawer. The bottom Traces action now focuses this persistent section instead of launching an overlay.

V5.5.33 makes Generator, Traces and I/O non-modal workspace panels: opening them no longer darkens or blurs the measurement canvas, so the live graph remains visible and interactive throughout the workflow. The I/O panel is reduced to a balanced 500px desktop width with tighter cards, fields and spacing.

V5.5.33 connects the Mic-only TF spectrum to the shared Analysis Speed control. Its dense FFT silhouette now uses the selected TF temporal response instead of drawing raw microphone frames directly, so Fast, Normal and Slow produce visibly different motion with or without a valid Reference input.

V5.5.33 replaces the separate graph-speed settings with one persistent Analysis Speed control. Fast, Normal and Slow now coordinate the RTA response time, Waterfall history cadence and TF temporal smoothing as a single workspace behavior. FFT size, frequency resolution and measurement calculations remain unchanged.

V5.5.33 adds a persistent Fast/Normal/Slow RTA response selector, with Normal tuned to 420 ms for a steadier field display. The top TF tab is now a graph-only action and no longer opens the measurement workflow panel. The full TF workflow is available as its own first-class item in the right Tools rail, whose icons are enlarged to match the visual reference.

V5.5.33 fixes the TF presentation path itself. Selecting TF now activates the new display directly instead of waiting for the hidden TF workflow state. With no usable Reference, the microphone is still rendered as a dense full-resolution, frequency-colored FFT silhouette; when Reference becomes valid, the canvas automatically switches to the detailed Reference/Mic/system-difference comparison.

V5.5.33 turns the TF system-difference view into a dense field-analysis display. Every two horizontal pixels now carry a coherence-qualified deviation column, colored by direction and severity, while a bright detailed contour keeps narrow peaks, cancellations and comb filtering easy to follow. Reference and microphone remain visible together in the upper comparison area. The dense columns are grouped into seven render paths so the added detail does not require hundreds of separate canvas strokes per frame.

V5.5.1 makes the swept-sine delay path safe at every supported sample rate and sweep duration. Long 96 kHz captures are analysed in bounded, zero-padded windows instead of overflowing the FFT buffer; narrow-band sub sweeps use a bandwidth-aware peak guard and stability tolerance; and unknown external audio can no longer fall through to the sweep-only estimator. The delay preflight now includes long 96 kHz, inverted-polarity, sub-band and strong-reflection cases (30 accepted delay cases in total).

## V5.4.63

V5.4.63 makes the Sub/Top workflow self-contained: steps 2 and 3 now open a focused choice between internal Pink Noise and an external source, start the selected signal automatically and stop it after the three-second capture. The separate Pink Noise button was removed. Sweep is intentionally unavailable here because matching steady-state captures are required for reliable phase comparison around the crossover.

The detailed EQ correction dock now preserves its current expanded/collapsed state when “Full graph / Cuts only”, target or correction-range changes trigger a recalculation. A new result still opens in the compact state by default, while controls clicked inside an expanded result can no longer fold the panel. The rail's “EQ correction display” button now hides and restores both the detail dock and the proposed-EQ ribbon on the RTA graph.

## V5.4.62

V5.4.62 applies the Delay result-unit selector consistently to the main result, saved loudspeaker rows, status messages, stability spread, alternative peaks and equivalent alignment differences. Existing results are reformatted immediately when switching units; meter mode no longer leaves the primary result in milliseconds. TF step 2 now opens the shared source selector, can run Pink Noise or Sweep without opening the Generator dock, collects two seconds of fresh data and then verifies phase/coherence.

V5.4.61 validates a known-distance calibration against the measured raw arrival time before saving it. A known distance that would require a significantly negative system delay is rejected with the raw milliseconds and maximum physically possible distance; tiny negative values within 0.25ms measurement tolerance are clamped to zero. Invalid calibration input and negative stored offsets can no longer produce a “calibrated” meter result.

V5.4.60 turns the TF dock into a guided three-step workflow: synchronize TF, verify live phase/coherence quality, then choose either a Trace capture or a six-second EQ measurement. Trace and EQ actions remain locked until synchronization and verification succeed; routing changes, FFT changes and coherence-threshold changes invalidate the appropriate stage. Less-frequent TF utilities remain behind “More”.

V5.4.59 moves TF synchronization into the Sub/Top measurement bar and presents the full sequence as three adjacent, numbered steps: TF Sync, capture Sub, capture Top. Each step unlocks only after the preceding measurement succeeds, and the recommendation panel tells the operator exactly which source must remain active next.

V5.4.58 replaces the single-frequency Sub/Top verdict with a coherence-gated optimizer across one-third octave around the selected crossover. It simulates positive delay on either source and normal/inverted relative polarity, rejects weak or severely imbalanced data, prefers the smallest near-optimal physical change and reports the source to delay, exact milliseconds, polarity state, predicted improvement and confidence. Individual snapshots now use transfer-magnitude (Pxy/Pxx), reducing sensitivity to Reference-level drift between the Sub and Top captures.

V5.4.57 adds a milliseconds/meters selector to the arrival-time workspace. Absolute distance is never calculated from raw path delay: meter mode requires a known-distance acoustic calibration, subtracts the measured electronic/system offset and labels the result as estimated. The calibration is session-only and resets after input, routing, channel or audio-session changes. Speaker alignment continues to show the exact millisecond value that must be entered in the DSP, with an optional equivalent distance difference alongside it.

V5.4.56 replaces the two different delay paths with one long-capture engine shared by TF synchronization and speaker-arrival comparison. Every accepted result must pass three independent time-window checks, agree within 0.20ms and match the full recording. The search range is selectable at 20/50/100ms and the FFT window grows automatically at high sample rates.

The interface now separates the jobs explicitly: “TF Sync” aligns MIC and Reference for transfer-function phase/coherence; speaker alignment measures each loudspeaker alone and presents only the relative Δ and the positive delay to add. Absolute path time is no longer presented as physical distance. A same-signal 0ms loopback check was also added.

Measurement-engine preflight coverage now tests delay at 44.1/48/96 kHz with noise and reflections, rejects silence and single-tone ambiguity, verifies TF phase compensation, band coherence, low-frequency band integration, mic-cal interpolation, RT60 regression, EQ safety limits and the six-band parametric optimizer.

Important fixes from the audit:
- TF Auto Delay is now applied as an exact frequency-domain phase correction; the previous time-window shift could not move when FFT and capture lengths were equal.
- TF EQ recommendations now require per-band coherence as well as adequate Reference level, and TF accumulators reset for every new measurement.
- Auto Delay resets on MIC/REF swap and session reset.
- RT60 now owns and cancels all arming/cut/finish timers, preventing an old or closed measurement from continuing and blocking overlapping measurements correctly.

The TF correlation meter is now a slim single-row status control with a small value, short rounded scale and concise state text. The large scale labels and oversized card spacing were removed while preserving polarity and signal-quality feedback.

The same refined draggable HPF/LPF handles now appear on the live RTA graph while either SPL/EQ or TF is open. Both workspaces share one synchronized correction range, and moving a handle recomputes the active TF recommendations.

A compact guide button next to Help opens an in-app field workflow plus concise instructions for RTA, Waterfall, TF, Delay, RT60, SPL/EQ, Sub/Top and Trace comparison.

Delay speaker alignment rows are compact and responsive, showing speaker name, total path time, measurement stability and the anchor-relative delay to add. The misleading equivalent-distance field was removed.

The RTA HPF/LPF controls now use thin semi-transparent dashed lines, small rounded labels and subtle grab points. Only the active handle becomes stronger while dragging; the large banners, triangles and center instruction were removed.

After measurement, the proposed EQ curve appears as a compact ±6 dB ribbon inside the lower part of the live RTA graph. The large correction dock now opens collapsed by default; its detailed curve and priority cards are available only through “הצג פירוט”, so the spectrum remains visible.

In SPL/EQ mode, the correction limits are now large draggable handles directly on the live RTA graph (cyan HPF, orange LPF). The lower selector row is hidden to preserve graph space; all range values remain synchronized internally.

TF Sync is not stored in preferences or session exports. It resets whenever audio starts, stops or switches input, so every physical setup gets a fresh synchronization. The opening description reflects the current 1/6-octave RTA, TF, arrival-time, SPL/EQ and Sub/Top workflow.

The SPL/EQ measurement dock contains a prominent, always-visible HPF/LPF correction-range bar. The experimental forced cache-navigation behavior from V5.4.46 was removed to restore stable startup and audio initialization.

Parametric mode now fits up to six Bell filters (frequency, gain and Q) together against the measured correction target. It no longer selects peaks from the graphic-EQ result. The optimizer respects HPF/LPF, cut-only mode and safe gain limits.

The HPF and LPF correction limits are now permanently visible in the EQ graph header, synchronized with the SPL/EQ panel controls. Larger cyan/orange handles are drawn above the curve and can be dragged directly.

- The left-rail EQ button now toggles the entire correction workspace on/off. The arrow inside the workspace remains dedicated only to collapsing or expanding its contents.

- TF Sync lives in the persistent bottom bar next to I/O, works from every measurement view, shows the measured result on its button and keeps a detailed stability status inside TF.

- The rail EQ button now uses a direct, explicit action in the HTML rather than depending on the later workspace initialization sequence. It also shows immediate press feedback.

- The left-rail EQ button now resolves the latest result from TF, SPL or spatial measurements, raises the workspace above measurement docks and redraws only after its canvas is visible.

- Day mode now covers correlation, measurement cards, advanced TF/Delay content, global EQ controls, rail tools, generator controls and help tooltips.
- Help mode includes the newer workspace, I/O, EQ, Trace and TF controls and provides an automatic explanation fallback for controls without custom help text.

- The floating MIC 1 / REF 2 panel now starts to the right of the side-rail toggle, keeping the arrow and both level readouts fully visible.

- The TF More/Less and Close controls now have fixed, non-overlapping positions with reserved title space, including on narrow screens.

- Hovering near any point on the EQ correction curve now highlights it and shows frequency, exact dB value and the required action (cut/boost).

- The EQ workspace now uses a middle-density layout: a slightly shorter graph and six compact priority rows containing frequency, action and dB on one line; remaining bands stay under “show more”.

- Full correction / cut-only is now a global control in the EQ result header and applies equally to SPL, spatial and TF calculations.
- The left rail now opens the latest EQ result from any measurement mode and includes a protected session reset button.

- EQ corrections are now presented as a prioritized action list: the eight most important bands appear first as clear Cut/Boost cards, while smaller corrections stay behind an optional “show more” row.

- The RTA resolution chip in the header is now interactive and offers direct 1/3, 1/6, 1/12 and 1/24 octave selection, synchronized with I/O and saved for the next session.

- Correlation now has a dedicated full-width meter row; its scale, coloured bar and moving marker can no longer collapse into the surrounding controls.

- The TF correlation readout is now a wide, high-contrast meter with a moving marker, a −1 to +1 scale, a large signed value and a plain-language status.

- TF now shows MIC 1 and REF 2 live together across the full graph, even before a Transfer Function measurement is taken.

- MIC 1 uses a clear blue curve and REF 2 uses orange, with a shared dBFS scale, live level readouts and an uncluttered legend.

- Low Reference level no longer removes the live dual-input view; it only pauses the calculated TF measurement.

- The empty legacy TF canvas is removed from the advanced view and replaced by clear frequency + dB correction cards.

- Exact frequency and dB correction values are shown below the result curve for every actionable EQ band.

- EQ correction results now appear as a compact response curve above the measurement dock, with a clear 0 dB line, frequency scale and cut/boost colours.

- The redesigned Delay panel is hidden by default and opens only when Delay is selected, using the original dock behavior.

- Delay is forcibly closed and hidden as soon as any non-Delay workspace is selected.

- Changing measurement modes always closes the previous dock before the next workspace opens.

- Delay is arranged as inputs → measure → speaker alignment.
- TF keeps Mic 1 and Reference 2 live spectra visible together under the TF response.

- “עוד” in TF is always available; before a result exists it shows clear next-step guidance instead of a blank results area.

- MEAS and REF now read the live input waveforms continuously, with smooth movement, peak hold and clear clip indication.

- Field preflight validates syntax, cached assets, PWA icons and all visible UI hookups before packaging.

- The shared SPL meter stays visible above the Sub / Top controls.

- The compact TF dock now keeps its live inputs and primary controls visible, with secondary settings behind “עוד”.

- The SPL meter now spans the usable width of the graph and stays directly above any open bottom dock.

- RTA and Waterfall are a clean two-button switch.
- The left rail is narrower with compact cards and calibration typography.

- Mic CAL is compact: calibration list, selection and file loading only.
- SPL / dBFS toggle now works in both directions.

- Calibration status is shown only in the left workspace rail.
- The header is freed up for day mode and colour controls.

- SPL uses the original horizontal meter bar in every measurement mode.
- The floating graph SPL card has been removed.

- “עוד” in TF stays closed until a real TF measurement is available.
- After measurement it reveals a rendered EQ correction result, never a blank canvas.

- TF now falls back to a full-size live RTA graph whenever Input 2 has no reference signal.
- TF controls use a compact dock by default; deeper options remain under “עוד”.

- Fixed canvas resizing when the I/O dock opens.
- Target uses the correct dB scale in TF.

- The left workspace rail can be collapsed and restored.
- Target is available in every non-alignment graph view.
- TF retains a compact live RTA spectrum strip.
- SPL is visible as a persistent graph HUD.

זו חבילת GitHub Pages מלאה. לפני העלאה אפשר להריץ:

`node scripts/validate-static-site.mjs`

GitHub Actions מריץ את אותה בדיקה בכל Commit/Push.

## מה חדש
- RTA ו-Waterfall נמצאים במצב Analysis אחד עם מעבר פנימי.
- Generator נפתח כ-Dock תחתון שמקטין את הגרף.
- פעולות Device, Channels, Mic CAL, SPL, Output ו-Export פועלות בתוך I/O החדש.
- Trace הוא צילום עקומה להשוואה, עם הצגה/הסתרה, שינוי שם ומחיקה.

## שינוי מרכזי
הפאנל התחתון הישן הוחלף ב-Quick Bar קומפקטי:
- MIC 1 + level
- REF 2 + level
- Sample Rate
- FFT
- Calibration status
- I/O
- Generator
- Freeze
- Capture

## I/O Dock
לחיצה על I/O פותחת Dock מסודר עם:
- Audio Device
- Measurement / Reference channels
- meters לשני הערוצים
- Sample Rate
- FFT Size
- RTA Resolution
- Mic Calibration
- SPL Offset
- Meter Unit
- Advanced I/O כגשר זמני להגדרות הישנות

ה-controls הישנים נשארו ב-DOM כדי לא לשבור פונקציות קיימות, אבל אינם מוצגים בממשק הראשי.
