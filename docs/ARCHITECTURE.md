# GAL Analyzer Foundation

GitHub Pages is still the deployment target. The application now has a stable
boot layer and a validation workflow, so an incomplete script or missing file
is caught before publishing.

## Runtime order

1. `app.js` starts the app in a controlled order.
2. `js/core/config.js` defines shared limits and the release version.
3. `js/core/diagnostics.js` shows a visible in-app error instead of silently
   leaving controls unresponsive.
4. `js/app-core.js` contains the current, proven analyzer functionality.

## Migration rule

New work moves one coherent feature at a time from `js/app-core.js` to
`js/features/`. Each move must keep the same public button IDs and pass
`node scripts/validate-static-site.mjs`.

The next safe extractions are: Generator, Trace manager, then I/O and
calibration. Audio/TF stays together until it has dedicated measurement tests.
