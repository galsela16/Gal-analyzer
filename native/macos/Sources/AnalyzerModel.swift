import Foundation
import SwiftUI
import AVFoundation
import AppKit

struct CapturedTrace: Identifiable, Codable {
    let id: UUID
    var name: String
    let date: Date
    let frequencies: [Double]
    let levels: [Double]
    var visible: Bool = true
}

@MainActor final class AnalyzerModel: ObservableObject {
    static let version = "6.0.0-preview.1"
    @Published var devices: [InputDevice] = []
    @Published var deviceID: AudioDeviceID = 0
    @Published var micChannel = 0
    @Published var refChannel = -1
    @Published var resolution = 6
    @Published var running = false
    @Published var requestingAccess = false
    @Published var frozen = false
    @Published var message = "Choose an audio input, then start audio."
    @Published var frequencies: [Double] = []
    @Published var displayBands: [Double] = []
    @Published var displayRefBands: [Double] = []
    @Published var micMeter = -120.0
    @Published var refMeter = -120.0
    @Published var micPeak = -120.0
    @Published var sampleRate = 0.0
    @Published var traces: [CapturedTrace] = []
    private var measuredBands: [Double] = []
    private var averagePower: [Double] = []
    private var lastTime: TimeInterval = 0
    private var generation = 0
    private var lastPeakTime: TimeInterval = 0
    private let audio = AudioInputEngine()
    private var watchdog: Timer?

    init() { refreshDevices() }
    var channelCount: Int { devices.first(where: { $0.id == deviceID })?.channels ?? 0 }
    var selectedDeviceName: String { devices.first(where: { $0.id == deviceID })?.name ?? "No input" }

    func refreshDevices() {
        devices = AudioInputs.devices()
        if !devices.contains(where: { $0.id == deviceID }) {
            if running { stop() }
            deviceID = devices.contains(where: { $0.id == AudioInputs.defaultDeviceID() }) ? AudioInputs.defaultDeviceID() : devices.first?.id ?? 0
        }
        if micChannel >= channelCount { micChannel = 0 }
        if refChannel >= channelCount || refChannel == micChannel { refChannel = -1 }
        if devices.isEmpty { message = "No audio input found. Connect an audio interface and click Refresh." }
    }

    func configurationChanged() {
        if requestingAccess { generation += 1; requestingAccess = false }
        if running { stop(); message = "Input settings changed. Start audio again." }
        if micChannel >= channelCount { micChannel = 0 }
        if refChannel >= channelCount || refChannel == micChannel { refChannel = -1 }
        clearSpectrum()
    }

    func start() {
        guard !running, !requestingAccess, deviceID != 0 else { return }
        requestingAccess = true
        generation += 1
        let session = generation
        AVCaptureDevice.requestAccess(for: .audio) { [weak self] allowed in
            Task { @MainActor in
                guard let self = self, self.generation == session else { return }
                self.requestingAccess = false
                guard allowed else {
                    self.message = "Microphone access is required. Allow GAL Analyzer Native in System Settings → Privacy & Security → Microphone."
                    return
                }
                self.startAuthorized(session: session)
            }
        }
    }

    private func startAuthorized(session: Int) {
        clearSpectrum()
        do {
            try audio.start(device: deviceID, micChannel: micChannel,
                refChannel: refChannel < 0 ? nil : refChannel, resolution: resolution) { [weak self] frame in
                Task { @MainActor in
                    guard let self = self, self.running, self.generation == session else { return }
                    self.apply(frame)
                }
            }
            running = true
            lastTime = ProcessInfo.processInfo.systemUptime
            message = "Live audio · levels are dBFS (uncalibrated)."
            watchdog = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self = self, self.running else { return }
                    if self.lastTime > 0 && ProcessInfo.processInfo.systemUptime - self.lastTime > 2 {
                        self.stop()
                        self.message = "Audio input stopped responding. Refresh inputs and start audio again."
                    }
                }
            }
        } catch {
            audio.stop()
            message = error.localizedDescription
        }
    }

    func stop() {
        generation += 1
        requestingAccess = false
        audio.stop()
        watchdog?.invalidate()
        watchdog = nil
        running = false
        frozen = false
        micMeter = -120
        refMeter = -120
        micPeak = -120
        message = "Audio stopped."
    }

    private func clearSpectrum() {
        frequencies = []; displayBands = []; displayRefBands = []
        measuredBands = []; averagePower = []; lastTime = 0
        frozen = false
    }

    private func apply(_ frame: InputFrame) {
        let dt = lastTime > 0 ? min(0.25, max(0.001, frame.timestamp - lastTime)) : 1.0 / 30
        lastTime = frame.timestamp
        sampleRate = frame.sampleRate
        micMeter = meterStep(micMeter, frame.micRMS, dt)
        refMeter = frame.refRMS.map { meterStep(refMeter, $0, dt) } ?? -120
        if frame.micPeak > micPeak || frame.timestamp - lastPeakTime > 1.5 {
            micPeak = frame.micPeak; lastPeakTime = frame.timestamp
        }
        guard !frozen else { return }
        frequencies = frame.frequencies
        let alpha = exp(-dt / 0.42)
        if averagePower.count != frame.micBands.count {
            averagePower = frame.micBands.map { pow(10, $0 / 10) }
            displayBands = frame.micBands
        } else {
            for i in averagePower.indices { averagePower[i] = averagePower[i] * alpha + pow(10, frame.micBands[i] / 10) * (1 - alpha) }
        }
        measuredBands = averagePower.map { 10 * log10(max($0, 1e-12)) }
        for i in displayBands.indices { displayBands[i] = visualStep(displayBands[i], measuredBands[i], dt, frame.frequencies[i]) }
        if let ref = frame.refBands {
            if displayRefBands.count != ref.count { displayRefBands = ref }
            else { for i in ref.indices { displayRefBands[i] = visualStep(displayRefBands[i], ref[i], dt, frame.frequencies[i]) } }
        } else { displayRefBands = [] }
    }

    private func meterStep(_ previous: Double, _ next: Double, _ dt: Double) -> Double {
        let tau = next > previous ? 0.045 : 0.34
        return previous + (next - previous) * (1 - exp(-dt / tau))
    }
    private func visualStep(_ previous: Double, _ next: Double, _ dt: Double, _ frequency: Double) -> Double {
        let low = max(0, min(1, log2(250 / max(20, frequency)) / log2(250 / 20)))
        let delta = next - previous
        var tau = delta > 0 ? 0.07 + 0.09 * low : 0.18 + 0.14 * low
        if abs(delta) > 6 { tau = min(tau, delta > 0 ? 0.045 : 0.09) }
        return previous + delta * (1 - exp(-dt / tau))
    }

    func capture() {
        guard running, !measuredBands.isEmpty else { message = "Start audio before capturing a trace."; return }
        guard traces.count < 6 else { message = "Six traces are already captured. Clear a trace before adding another."; return }
        let name = "Trace \(traces.count + 1)"
        traces.append(CapturedTrace(id: UUID(), name: name, date: Date(), frequencies: frequencies, levels: measuredBands))
        message = "\(name) captured."
    }

    func exportTraces() {
        guard !traces.isEmpty else { message = "Capture a trace before exporting."; return }
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.json]
        panel.nameFieldStringValue = "GAL-Native-Traces.json"
        guard panel.runModal() == .OK, let url = panel.url else { return }
        do {
            let encoder = JSONEncoder(); encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            try encoder.encode(TraceExport(version: Self.version, unit: "dBFS", traces: traces)).write(to: url, options: .atomic)
            message = "Traces exported."
        } catch { message = error.localizedDescription }
    }
    private struct TraceExport: Codable { let version: String; let unit: String; let traces: [CapturedTrace] }
}
