# GAL Analyzer — App Review walkthrough

Preparation draft, October 9, 2026. No login or subscription. The final signed
MAS build must pass the steps below before this guide is attached to App Review.
The included screenshot drafts use synthetic PCM and are explicitly labeled DEMO.
They do not establish physical interface accuracy or App Sandbox compatibility.

## Basic review with a built-in microphone

1. Launch the application and select START MICROPHONE. Grant the macOS microphone
   permission when prompted. The input meters and RTA should respond to sound.
2. Open I / O. Choose the Core Audio device in Input device. Measurement selects
   MIC; Reference selects REF. A mono device should expose exactly one available
   input. REF is unavailable; it must not show a copy of MIC.
3. Return to RTA. Select 1/3, 1/6, 1/12, 1/24 and 1/48 resolution.
4. Capture Trace. Click its name and type a new one, then press Enter or leave
   the field. The visibility button hides/shows it; × removes that trace. A second
   captured trace receives a different color. Clear all clears captured traces.
5. Select M/R to compare the selected inputs when a valid reference exists.
   Select WATERFALL to inspect the recent frequency history.
6. Open the top-left menu for Export PNG or Export CSV. Confirm the chosen file
   is created and readable. Review session import/export separately with the
   corresponding Session controls; do not assume every export type contains the
   same measurement objects.
7. Open GAL Analyzer > Privacy Policy in the native Mac menu. The policy is
   available offline and scrolls to its end. Close the app and confirm capture stops.

## TF / Delay setup using electrical loopback

Use a compatible Core Audio interface with at least two actual inputs. Class-
compliant interfaces and manufacturer drivers are both supported subject to their
exposed formats. Install the manufacturer's driver first if required. This guide
is independent of the interface brand.

Connection:

    Broadband line-level source
          |---> compatible line input 1 (Measurement / MIC)
          |---> compatible line input 2 (Reference / REF)

Use suitable line-level routing or the manufacturer's supported loopback. Start
with output muted/low and both input gains low, then raise to an unclipped level.
Do not use an amplified speaker output as an interface input. Disable phantom
power on line inputs where the equipment requires it. No loudspeaker is needed
for the electrical check; use the same source for both inputs.

1. In I / O select the interface, Measurement input 1 and Reference input 2.
   Verify both meters respond to their distinct connected inputs. Muting input 2
   should affect REF without muting MIC; restore both feeds afterward.
2. Keep a broadband noise source playing. Open TF Measurement.
3. Choose 1 · Sync TF and External source (manual playback). Allow the delay
   capture to finish. A reliable result enables the next step.
4. Choose 2 · Verify TF and the same external source. The app checks coherence
   and phase while capture continues. A verified status should appear.
5. Choose 3 · Capture Trace. A verified trace should be added. Edit its name
   directly, then inspect Magnitude, Phase and Coherence.
6. Repeat sync, verification and capture at least five times. Audio must remain
   live, and earlier trace data/names must survive later captures.
7. Open Delay and measure the same pair. Compare the result against the loopback
   setup and any known delay in the path. Missing/weak REF must not produce a
   falsely verified TF. A cancelled measurement must not save interrupted audio.
8. For interfaces with more than two inputs, select the higher channels and
   repeat. Do not infer input count or loopback labels from the product name.

For an acoustic test, MIC receives the measurement microphone and REF receives
the original source that also drives the sound system. Calibration and the actual
room/system then determine the result; electrical loopback and acoustic results
should not be presented as interchangeable.

## Permission and file checks in the signed MAS build

- Test first launch with permission not yet granted, denial, then permission
  enabled in macOS System Settings. Give a useful error when denied.
- Test import/export to user-selected locations under App Sandbox, including
  cancellation and a read-only destination.
- Change devices and unplug/replug while idle and during measurement. No stale
  result should become a new verified trace.
- Run RTA, Waterfall and repeated TF captures for a sustained session.

## Optional App Review video attachment

Record the accepted signed build: launch → select interface → show distinct MIC
and REF feeds → Sync TF → Verify TF → Capture Trace → edit name → repeat capture
without restarting input → switch graph views → stop audio. Show the interface
routing and the app version. Avoid desktop notifications, account details and
private recordings. Keep this attachment separate from an optional marketing
App Preview. No final hardware review video has been recorded yet.
