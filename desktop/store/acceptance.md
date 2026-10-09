# Release acceptance — preview.18

## Completed without paid membership

- Direct-download and MAS packaging target arm64; the native helper targets arm64.
- Numeric bundle version 6.0.0 and build 18, with preview.18 shown in the UI.
- Local privacy policy accessible through the native application menu.
- Separate unsigned MAS assembly and signed development/distribution commands.
- Signed commands refuse to proceed without the matching Apple signing profile.
- No interface brand is required for capture or channel naming. Channel names are
  read from the driver with Input N as fallback.
- Interfaces with more than 32 inputs are listed and rejected with an explicit
  limit at capture start instead of silently disappearing.

## Submission material preparation

English listing, review notes, screenshot capture and validation, a public support page and a hardware walkthrough are prepared in this directory. The public
support email is galanalyzer@gmail.com. Private review contact still needs the
owner’s information.
Draft screenshots are synthetic real-renderer captures, not final signed MAS
release screenshots. Existing preview.15 test evidence remains historical.

## Hardware acceptance still required

Use at least a built-in mono input, a two-input interface and a multichannel
interface. Test manufacturer-supplied Core Audio drivers as well as class-compliant
devices when available. A synthetic 32-channel test is not a physical-device test.

1. Select the interface; verify actual count and input labels, including available
   digital/loopback channels. Never infer those labels from the product name.
2. Send a distinct known signal into each physical input and verify its meter,
   frequency and selected MIC/REF routing. Missing inputs must remain unavailable.
3. Measure electrical loopback delay/TF repeatedly and capture named/color traces.
   Confirm input survives measurements and existing traces survive later captures.
4. Repeat at 44.1, 48 and 96 kHz when supported by the device; verify the reported
   native rate and analysis rate. Unsupported formats must give a useful error.
5. Switch between mono and multichannel devices while running. Unplug/replug and
   refresh the input list. In-flight measurements must not save interrupted audio.
6. Test export/import, cancellation and permission denial. No unintended audio
   playback or device-wide sample-rate change should occur.
7. Run the RTA, TF and Waterfall for a sustained field session under normal workload.
   Compare responsiveness and measured results with the existing web edition.

`GAL_AUDIO_DEVICE_UID` chooses the device for `--hardware-test`; without it the
system default input is used. This test captures eight seconds locally without
saving audio or playing a signal. It checks capture continuity/channel metadata,
not electrical measurement accuracy. Run it only when hardware input is intended.

## After Apple membership

- Install development/distribution certificates and matching profiles.
- Validate the real native helper inside the signed MAS App Sandbox, including
  first-run permission prompts, user-selected file import/export and device changes.
- Audit the app and embedded Electron frameworks for required-reason APIs and
  privacy manifests; do not claim compliance from an empty privacy manifest.
- Re-run hardware and prolonged measurement checks on the signed build.
- Capture final store screenshots; complete store metadata and privacy responses.
- Build the signed distribution PKG and upload only after acceptance is complete.

This preparation does not establish Apple approval, arbitrary-driver compatibility,
or faster processing than the web edition.
