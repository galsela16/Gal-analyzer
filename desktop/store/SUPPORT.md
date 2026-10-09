# GAL Analyzer support — contact page draft

This page is not the final App Store Support URL. The owner is creating a
public support email. Add that confirmed address and publish the completed page
before submission; never publish private App Review contact details here.

GAL Analyzer is a local audio measurement application for Apple Silicon Macs
with macOS 13 or later. It can capture up to 32 Core Audio inputs when exposed by
the interface and its driver. TF and Delay use a selected microphone/reference
pair. It does not install audio drivers.

## Common setup questions

**No input signal:** Select the correct input device in I / O, check its actual
input channels and your interface routing, then check the app's microphone
permission in System Settings > Privacy & Security > Microphone. A built-in mono
microphone provides one input and cannot supply an independent REF.

**Fewer inputs than expected:** Install the manufacturer's required macOS driver,
check which channels it exposes to Core Audio, refresh the list and select the
interface. Inputs beyond the current 32-channel limit cannot be captured.

**TF is unverified:** Send the same broadband source to MIC and REF, assign
separate available inputs, keep levels unclipped, then run Sync TF and Verify TF.
A microphone spectrum by itself is not a verified transfer function.

**SPL reading:** Apply appropriate microphone calibration. Estimated SPL does
not make the application a certified sound level meter.

## Reporting an issue

Supplementary public issue tracker:
https://github.com/galsela16/Gal-analyzer/issues

Include the application version, macOS version, interface model/driver version,
input channel count, selected MIC/REF channels and reproduction steps. Attach
screenshots only if they do not reveal private information. Do not post private
audio, personal details, credentials or signing files. Audio is not automatically
uploaded by the application.

Privacy policy:
https://github.com/galsela16/Gal-analyzer/blob/main/desktop/PRIVACY.md

Public support email: pending owner's new dedicated address.
