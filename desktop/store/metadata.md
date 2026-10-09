# Mac App Store listing draft

Not submitted. The account owner's legal seller name is supplied by Apple after
enrollment; do not invent a company name or certification.

Name: GAL Analyzer

Subtitle: Sound system measurement tools

Category: Music

Price: Free

Platform: macOS 13 or later, Apple Silicon

Keywords: audio,spectrum,RTA,transfer function,delay,waterfall,sound,acoustics,measurement,calibration

## Description

GAL Analyzer brings audio measurement tools into one local Mac application.
Explore live frequency spectra, compare microphone and reference inputs, view a
Waterfall history, and capture named traces for sound system tuning.

- Real-time spectrum analysis with 1/3 through 1/48 octave display resolution.
- Core Audio input capture with up to 32 simultaneous channels, subject to the
  interface and its macOS driver.
- Assign microphone and reference roles to available inputs. Additional channels
  can be monitored with separate digital level meters and raw spectrum curves.
- Transfer-function magnitude, phase and coherence for a selected input pair.
- Delay measurement and an integrated signal generator.
- Named, colored traces, session import/export, and CSV/image export.
- Offline operation: audio and measurements stay on your Mac.

Input and reference availability depend on your connected interface. Install any
macOS driver required by its manufacturer. The app does not install device
drivers. TF and delay measure a selected pair; they do not run an independent TF
measurement on every channel at once.

Displayed SPL estimates require appropriate microphone calibration. The app is
not a certified sound level meter. Use a reference feed and the verification
workflow when taking transfer-function measurements.

## URLs

Support: https://github.com/galsela16/Gal-analyzer/issues

Privacy: https://github.com/galsela16/Gal-analyzer/blob/main/desktop/PRIVACY.md

## Review notes draft

The app includes its interface and native Core Audio helper locally. No account
or internet connection is needed to use it. Audio input starts only when the
user selects Start audio and grants microphone access. A built-in microphone is
enough for RTA and Waterfall. TF and delay require valid selected microphone and
reference signals; a multichannel interface/electrical loopback can supply them.

Privacy Policy is available in the GAL Analyzer application menu. The signal
generator requires the user's explicit Start signal action.

Before submission, add a short hardware setup guide and review video for TF,
final screenshots from the signed MAS build, and the confirmed release version.
Reviewers must not be asked to disable macOS security protections.

## Still to complete in App Store Connect

Confirm seller identity, age-rating questionnaire, encryption/export compliance
for Electron's included cryptography, and final App Privacy responses against
the submitted binary and dependency audit. The intended app declaration is
Data Not Collected; that must be verified before submission.

Do not submit generated logo images as product screenshots. Store screenshots
must show the real app and label demonstration/synthetic measurement content.
