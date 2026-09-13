# GAL Analyzer 5.5.76

- Uses one H1 transfer estimator for live TF, saved traces, and Sub/Top measurements.
- Computes each audio block once instead of reinforcing the same data twice.
- Captures a Sweep as a complete accumulated frequency pass so early frequencies do not decay before the sweep ends.
- Extends Sweep verification to the full configured sweep duration.
- Requires broad logarithmic frequency coverage, sufficient mean coherence, and valid MIC/REF energy before marking TF as verified.
- Keeps TF acquisition active while viewing RTA or Waterfall.
- Adds robust Reference detection with multi-bin validation and short hysteresis.
- Resets confidence history and working averages between captures and routing changes.
- Saves a clearly labelled MIC Spectrum instead of a misleading TF trace when Reference is missing.
- Keeps saved TF traces on the same absolute magnitude scale as the live response.
