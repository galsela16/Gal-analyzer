# Mac App Store build preparation

All packaging targets arm64. Electron's MAS runtime and a native Core Audio helper
are assembled separately from the direct-download app. The parent requests
App Sandbox, audio/microphone input and user-selected file access; child executables
inherit the sandbox. No camera or network entitlement is requested.

## Before Apple membership

Run `npm run check:store` to show missing signing configuration.
Run `npm run build:mas:unsigned` to assemble and inspect an unsigned MAS bundle.
This checks bundle versions and the arm64 app/helper binaries. It does not establish
sandbox operation, hardware acceptance or submission readiness.

The normal app remains available with `npm run build:mac`.

## After membership

For a development build, set GAL_MAS_IDENTITY to the exact installed Apple
Development certificate name, GAL_MAS_TEAM to the Team ID, and GAL_MAS_PROFILE
to a development profile for com.galanalyzer.desktop that includes the test Mac.
Run `npm run build:mas:development`.

For distribution, use an Apple Distribution application certificate, an App Store
profile and GAL_MAS_INSTALLER_IDENTITY naming the installed Mac Installer Distribution
certificate (shown as 3rd Party Mac Developer Installer). Run
`npm run build:mas:distribution` to produce a signed PKG. This does not upload it.

Profiles must match the team, bundle ID and build mode and must not be expired.
Private keys/profiles must remain outside Git. Signing uses the pinned
@electron/osx-sign 2.7.1 API. Development builds run on registered Macs; distribution
builds are for store processing and cannot substitute for development testing.

Before upload, complete [release acceptance](../store/acceptance.md), the dependency
privacy manifest audit and actual signed sandbox tests. The current preview version
is development branding; confirm the final numeric store release version.

References:
- https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide
- https://developer.apple.com/app-store/review/guidelines/
