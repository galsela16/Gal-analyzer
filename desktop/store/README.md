# GAL Analyzer — submission preparation

Prepared preview.18, October 9, 2026. This packet is not an App Store submission.

- `listing.en-US.json`: authoritative listing draft and pending owner fields.
- `description.en-US.txt`, `promotional-text.en-US.txt`, `keywords.en-US.txt`:
  plain text ready to copy after final release verification.
- `review-notes.en-US.txt`, `reviewer-guide.md`: review workflow and hardware setup.
- `SUPPORT.md`: public support page with galanalyzer@gmail.com and setup help.
- `screenshots.md`: capture provenance, order and final replacement requirements.
- `submission-checklist.md`: owner/account entries and remaining release gates.
- `privacy-audit.md`, `acceptance.md`: technical readiness and hardware checks.

The delivered folder includes `screenshots/` with five JPEG drafts and its
manifest. Generated screenshots are not tracked in Git. Source capture and
validation scripts are reproducible in the repository.

Run `node store/validate.cjs` from desktop to check metadata. Add
`--screenshots build/store-submission/6.0.0-preview.18/screenshots` to verify the
capture set and JPEG dimensions. Pending account/hardware details are reported
separately; a successful metadata check does not grant release readiness.
