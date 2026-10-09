# Initial desktop privacy review — October 9, 2026

## App behavior checked

The only desktop renderer origin is bundled `gal://app`. Remote HTTP/HTTPS
requests and remote navigation are blocked. No analytics, advertising, account,
cloud storage, auto-submission of logs, or enabled Electron crash reporter was
found in the runtime setup. Microphone permission precedes capture; settings and
traces use local browser storage. Exports are user-initiated files. The local
privacy policy documents these behaviors and the support-report boundary.

Support contact is galanalyzer@gmail.com. Email is initiated outside the app by
the user; the app does not send messages or attachments automatically. The policy
now describes the developer/email-provider boundary for voluntary support.

The proposed App Privacy response is Data Not Collected. Reconfirm this against
the final signed binary and dependencies immediately before submission.

## Binary inventory

The assembled MAS Electron 44.5.1 framework imports `NSUserDefaults`, `fstat`,
`fstatat`, `fstatfs`, `stat`, `statfs`, `statvfs`, `mach_absolute_time` and
`mach_continuous_time`. No `PrivacyInfo.xcprivacy` was found in that assembled
bundle. The same selected-symbol scan of our Swift capture helper produced no
matches. A symbol inventory does not establish all runtime uses or approved reasons.

Apple's current required-reason API documentation explicitly scopes that API
reporting to iOS, iPadOS, tvOS, visionOS and watchOS; it does not list macOS. Do not
automatically treat a macOS imported symbol as an iOS-style manifest rejection.
Data-collection disclosures apply across platforms. Apple's listed SDK/repackaged
SDK requirements must also be checked against Electron's embedded dependencies;
the absence of Electron's name from the list alone is not an exemption.

## Final distribution follow-up

Confirm the then-current SDK/manifest requirements, embedded libraries and
actual uses before submission. Obtain or supply any applicable dependency
manifests in their proper bundle locations. Do not add empty manifests or copy
unverified reason codes merely to silence a scanner. Signed MAS acceptance and
App Store Connect's own processing remain authoritative release checks.

References:
- https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
- https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api
- https://developer.apple.com/support/third-party-SDK-requirements/
