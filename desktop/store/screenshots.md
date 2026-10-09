# Screenshot drafts

Five captures show the actual app renderer, fed synthetic PCM through the native
test transport in a separate temporary profile. They do not capture private audio
or play a signal. They are not captures of the signed MAS distribution build.

Run from desktop: `npm run screenshots:store`.
Output: `build/store-submission/6.0.0-preview.20/screenshots/`.

| Order | File | Content |
| --- | --- | --- |
| 1 | 01-rta-traces.jpg | Live spectrum and named, colored traces |
| 2 | 02-input-comparison.jpg | Microphone/reference spectra |
| 3 | 03-waterfall.jpg | Frequency history |
| 4 | 04-transfer-function.jpg | Measured, verified synthetic loopback magnitude |
| 5 | 05-phase.jpg | Phase from the same selected input pair |

Every capture includes DEMO · Synthetic audio. A manifest records the prepared
release, capture dimensions and measured demo delay. JPEG avoids an alpha channel.
1440 × 900 is one of Apple's accepted 16:10 Mac screenshot sizes.

Recapture from the accepted signed MAS release before submission. Inspect all
images for clipping, overlaps, legible names and unobscured controls. The App Store
version and visible app version must correspond to the selected release. Keep the
user's approved logo separate; it is not a substitute for an app screenshot.

Reference checked October 9, 2026:
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
