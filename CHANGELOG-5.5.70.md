# GAL Analyzer 5.5.70

- Added Generator Loopback under Settings → Audio.
- Routes an internal copy of the generator output directly to the Reference analyser.
- Disconnects the physical reference input while Loopback is active to prevent mixed references.
- Restores the configured physical reference channel immediately when Loopback is disabled.
- Persists the Loopback preference and resets stale TF averaging whenever routing changes.
