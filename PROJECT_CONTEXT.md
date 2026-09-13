# GAL Analyzer — Project Context

This file is the short, persistent context for future AI-assisted work on GAL Analyzer. Read this file first, then inspect only the files relevant to the current task. GitHub `main` is the source of truth; old chat history and ZIP snapshots are not.

## Project goal

GAL Analyzer is a browser-based professional live-sound measurement and field-analysis tool. The interface is intended to behave like a focused field instrument: clear live measurement, minimal clutter, predictable controls, and useful workflows for system tuning.

Current release documented in the repository: **V5.5.76 — TF Field Rebuild**.

## Current product areas

The application includes or is evolving around:

- RTA spectrum analysis
- Waterfall display
- M/R microphone/reference comparison
- Transfer Function (TF): magnitude, phase and coherence
- TF synchronization / delay workflow
- Trace capture, visibility, rename and delete
- Signal generator
- I/O and microphone calibration
- SPL / EQ measurement and correction workflow
- Speaker arrival / delay comparison
- Sub/Top alignment workflow
- RT60 measurement
- Dark/daylight UI and responsive field use

## Current TF behavior (V5.5.76)

- One H1 transfer estimator is shared by live TF, saved traces and Sub/Top measurements.
- Sweep capture accumulates a complete frequency pass.
- TF verification checks broad logarithmic coverage, coherence and valid MIC/REF energy.
- TF acquisition continues even while another graph such as RTA or Waterfall is displayed.
- Reference detection uses multi-bin validation and hysteresis.
- Capture state/averages reset between captures and routing changes.
- If Reference is missing, capture is explicitly saved as a MIC Spectrum rather than pretending it is a verified TF trace.
- Saved TF traces use the same absolute magnitude scale as the live response.

## Architecture rules

The stable runtime order documented in `ARCHITECTURE.md` is:

1. `app.js` starts the application in controlled order.
2. `js/core/config.js` defines shared limits and release version.
3. `js/core/diagnostics.js` provides visible startup/runtime diagnostics.
4. `js/app-core.js` contains the current proven analyzer functionality.

The repository also contains legacy/root compatibility files and a large `app-core.js`; do not assume similarly named files are canonical without checking the runtime loading path.

### Migration rule

Move only one coherent feature at a time from `js/app-core.js` into `js/features/`. Preserve public button IDs and behavior. The documented safe extraction order is Generator, Trace manager, then I/O/calibration. Keep Audio/TF together until dedicated measurement tests make separation safe.

## UI/product decisions to preserve

- The live graph is the primary workspace and should remain visible as much as possible.
- Avoid duplicate controls and duplicate ways to perform the same action unless they serve a clear responsive/accessibility need.
- RTA and Waterfall belong to the same graph/display workflow rather than becoming competing tool surfaces.
- Generator and I/O should behave as workspace tools/panels and should not unnecessarily cover or shrink the graph.
- Traces are a first-class persistent workflow; users must be able to decide which captured traces are visible.
- Target/correction curves should be explicitly show/hide-able rather than permanently forced on the graph.
- Day mode must affect the whole interface, not only part of it.
- Functional color should communicate live data, selected states or tool meaning; structural UI should stay restrained and instrument-like.
- Keep graph frequency scales consistent across RTA, Waterfall, M/R and TF.

## Current UX cleanup direction

When improving the interface, prioritize:

1. Remove duplicated controls or competing entry points.
2. Keep the graph unobstructed.
3. Make every visible button perform a real, understandable action.
4. Prefer one canonical control for each function.
5. Keep advanced functions available without making the default workspace busy.
6. Preserve measurement behavior while changing layout or styling unless the task explicitly targets DSP/measurement logic.

Known areas that have recently needed attention include Generator behavior, I/O controls (including Advanced and Mic Cal), Trace workflow clarity, graph/tool duplication and responsive/day-mode consistency. Re-check the current code before treating any of these as still broken.

## Important repository files

- `PROJECT_CONTEXT.md` — start here for project orientation.
- `ARCHITECTURE.md` — runtime and migration rules.
- `README.md` — detailed release history and product behavior.
- `CHANGELOG-5.5.76.md` — latest documented release changes.
- `index.html` — main UI structure; large file, inspect targeted sections only.
- `js/app-core.js` — canonical proven application logic per architecture docs; very large, search before fetching large ranges.
- `app.js` — boot entry point.
- `js/core/` — shared configuration/diagnostics.
- `audio/`, `dsp/`, `render/`, `src/`, `js/` — feature/engine modules; inspect only when relevant.
- `scripts/validate-static-site.mjs` and validation scripts — regression/static checks.

The repository contains many historical `CHANGELOG-*` files and old ZIP snapshots. Do **not** load them all for normal work. Use the latest changelog plus targeted older entries only when investigating a regression.

## Working method for future AI sessions

To keep context/token use low:

1. Read `PROJECT_CONTEXT.md` first.
2. Check `ARCHITECTURE.md` when architecture or file ownership matters.
3. Check the latest changelog/current commit before assuming an old issue still exists.
4. Search for the relevant control/function/file before fetching large source files.
5. Load only targeted line ranges from large files such as `index.html` and `js/app-core.js`.
6. Work on one user-visible change at a time when practical.
7. Preserve working behavior outside the requested scope.
8. Run the relevant validation scripts after code changes.
9. Commit completed changes to GitHub so the repository remains the cross-device source of truth.
10. Update this file only when a durable product/architecture/workflow decision changes; do not turn it into a changelog.

## Communication/workflow preference

The project owner is not relying on manual code editing as the normal workflow. For assistance, prefer completing a focused change end-to-end, explaining the result in plain language, and avoiding unnecessary code dumps or long multi-step instructions. If manual action is required, give one clear action at a time.

## Session restart prompt

A fresh conversation can begin with:

> Continue GAL Analyzer from GitHub. Read `PROJECT_CONTEXT.md` first, check the current `main` branch, and only load the files relevant to the task I give you.

That should be enough context to resume work without carrying a long previous chat.