#!/bin/bash
set -euo pipefail
native_root="$(cd "$(dirname "$0")/.." && pwd)"
output="$native_root/build"
app="$output/GAL Analyzer Native.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
clang++ -std=c++17 -O2 -Wall -Wextra -Werror -I "$native_root/core/include" "$native_root/core/src/GalDSP.cpp" "$native_root/core/tests/GalDSPTests.cpp" -o "$output/GalDSPTests"
"$output/GalDSPTests"
for architecture in arm64 x86_64; do
    clang++ -std=c++17 -O2 -Wall -Wextra -Werror -target "$architecture-apple-macosx13.0" \
        -I "$native_root/core/include" -c "$native_root/core/src/GalDSP.cpp" -o "$output/GalDSP-$architecture.o"
    swiftc -swift-version 5 -parse-as-library -O -target "$architecture-apple-macosx13.0" \
        -import-objc-header "$native_root/core/include/GalDSP.h" \
        "$native_root/macos/Sources/AudioInput.swift" "$native_root/macos/Sources/AnalyzerModel.swift" \
        "$native_root/macos/Sources/AnalyzerView.swift" "$native_root/macos/Sources/GALAnalyzerApp.swift" \
        "$output/GalDSP-$architecture.o" -Xlinker -lc++ -o "$output/GALAnalyzerNative-$architecture"
done
lipo -create "$output/GALAnalyzerNative-arm64" "$output/GALAnalyzerNative-x86_64" -output "$app/Contents/MacOS/GALAnalyzerNative"
cp "$native_root/macos/Resources/Info.plist" "$app/Contents/Info.plist"
codesign --force --sign - "$app"
codesign --verify --deep --strict "$app"
"$app/Contents/MacOS/GALAnalyzerNative" --smoke-test
archive="$output/GAL-Analyzer-Native-6.0.0-preview.1.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$archive"
printf '\nBuilt: %s\n' "$app"
printf 'Archive: %s\n' "$archive"
