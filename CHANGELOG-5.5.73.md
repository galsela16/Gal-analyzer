# GAL Analyzer 5.5.73

- Loopback Auto Sync no longer opens a blocking “measurement active” alert.
- When another measurement is finishing, Auto Sync waits and retries automatically.
- Retry count is bounded, so the preparation screen cannot remain stuck forever.
- If the previous task does not release, the TF panel shows an actionable status and returns control to the user.
