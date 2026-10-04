import SwiftUI
import AppKit
import CoreAudio

@main struct GALAnalyzerApp: App {
    init() {
        if CommandLine.arguments.contains("--generator-test") {
            do { try testGeneratorOffline(); exit(0) }
            catch { fputs("Generator offline test failed: \(error)\n", stderr); exit(1) }
        }
        if CommandLine.arguments.contains("--smoke-test") {
            let devices = AudioInputs.devices()
            print("GAL Analyzer Native \(AnalyzerModel.version)")
            print("Audio inputs: \(devices.count)")
            for device in devices { print("\(device.name): \(device.channels) channels") }
            print("Audio outputs: \(AudioInputs.devices(scope: kAudioObjectPropertyScopeOutput).count)")
            print("DSP 1/48 octave: \(gal_band_count(48)) bands")
            exit(0)
        }
    }
    var body: some Scene {
        WindowGroup("GAL Analyzer Native") { AnalyzerView() }
            .defaultSize(width: 1320, height: 820)
            .commands {
                CommandGroup(replacing: .appInfo) {
                    Button("About GAL Analyzer Native") {
                        NSApplication.shared.orderFrontStandardAboutPanel(options: [
                            .applicationName: "GAL Analyzer Native",
                            .applicationVersion: AnalyzerModel.version,
                            .credits: NSAttributedString(string: "Free native macOS audio analyzer.\nSwiftUI · Core Audio · Native DSP")
                        ])
                    }
                }
            }
    }
}
