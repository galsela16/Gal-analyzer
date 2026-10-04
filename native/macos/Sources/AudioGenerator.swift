import Foundation
import AVFoundation
import AudioToolbox
import CoreAudio

// Owned by the render block until the engine has stopped and released the node.
private final class GeneratorState {
    let pointer: OpaquePointer
    init(rate: Double, waveform: Int, frequency: Double, level: Double) throws {
        guard let value = gal_generator_create(rate, Int32(waveform), frequency, level) else { throw GeneratorError.configuration }
        pointer = value
    }
    deinit { gal_generator_destroy(pointer) }
}
private enum GeneratorError: LocalizedError {
    case configuration, device(OSStatus), format
    var errorDescription: String? {
        switch self {
        case .configuration: return "Choose a frequency from 20–20000 Hz and a level from −80 to −6 dBFS peak."
        case .device(let status): return "Unable to open this audio output (\(status)). Select another device."
        case .format: return "This output must support 44.1–192 kHz Float32 audio and the selected channel."
        }
    }
}

@MainActor final class GeneratorModel: ObservableObject {
    @Published var devices: [InputDevice] = []
    @Published var deviceID: AudioDeviceID = 0
    @Published var channel = 0
    @Published var waveform = 2
    @Published var frequency = 1000.0
    @Published var level = -30.0
    @Published var running = false
    @Published var stopping = false
    @Published var message = "Output is off. Choose a device and channel, then start the signal."
    private var engine: AVAudioEngine?
    private var state: GeneratorState?
    private var observer: NSObjectProtocol?
    private var stopToken = 0
    var channelCount: Int { devices.first(where: { $0.id == deviceID })?.channels ?? 0 }
    init() { refreshDevices() }

    func refreshDevices() {
        devices = AudioInputs.devices(scope: kAudioObjectPropertyScopeOutput)
        if !devices.contains(where: { $0.id == deviceID }) {
            stop()
            let defaultID = AudioInputs.defaultDeviceID(output: true)
            deviceID = devices.contains(where: { $0.id == defaultID }) ? defaultID : devices.first?.id ?? 0
        }
        if channel >= channelCount { channel = 0 }
    }
    func settingsChanged() {
        if running { stop(); message = "Output settings changed. Start the signal again." }
        if channel >= channelCount { channel = 0 }
    }
    func start() {
        guard !running, !stopping, deviceID != 0 else { return }
        do {
            let engine = AVAudioEngine()
            let output = engine.outputNode
            guard let unit = output.audioUnit else { throw GeneratorError.format }
            var selected = deviceID
            let status = AudioUnitSetProperty(unit, kAudioOutputUnitProperty_CurrentDevice,
                kAudioUnitScope_Global, 0, &selected, UInt32(MemoryLayout<AudioDeviceID>.size))
            guard status == noErr else { throw GeneratorError.device(status) }
            let format = output.inputFormat(forBus: 0)
            guard format.commonFormat == .pcmFormatFloat32, !format.isInterleaved,
                  format.sampleRate >= 40000, format.sampleRate <= 192000,
                  channel >= 0, channel < Int(format.channelCount) else { throw GeneratorError.format }
            let state = try GeneratorState(rate: format.sampleRate, waveform: waveform, frequency: frequency, level: level)
            let source = generatorSource(format: format, state: state, selectedChannel: channel)
            engine.attach(source)
            // Direct channel-preserving connection: every unselected hardware channel is silent.
            engine.connect(source, to: output, format: format)
            engine.prepare()
            try engine.start()
            self.engine = engine; self.state = state; running = true
            message = "Signal live · Output \(channel + 1) · \(String(format: "%.0f", level)) dBFS peak ceiling"
            let session = stopToken
            observer = NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange,
                object: engine, queue: .main) { [weak self] _ in
                Task { @MainActor in
                    guard let self = self, self.stopToken == session else { return }
                    self.stop(); self.message = "Output device changed or disconnected. Refresh outputs and start again."
                }
            }
        } catch { message = error.localizedDescription }
    }
    func stop(immediate: Bool = false) {
        if let observer = observer { NotificationCenter.default.removeObserver(observer); self.observer = nil }
        guard engine != nil else { return }
        stopToken += 1
        let token = stopToken
        running = false
        gal_generator_stop(state?.pointer)
        if immediate { finishStop(); return }
        stopping = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.04) { [weak self] in
            guard let self = self, self.stopToken == token else { return }
            self.finishStop()
        }
        message = "Signal stopped."
    }
    private func finishStop() {
        engine?.stop(); engine = nil; state = nil; stopping = false
    }
}

private func generatorSource(format: AVAudioFormat, state: GeneratorState, selectedChannel: Int) -> AVAudioSourceNode {
    return AVAudioSourceNode(format: format) { _, _, frameCount, audioBufferList in
                let buffers = UnsafeMutableAudioBufferListPointer(audioBufferList)
                for (index, buffer) in buffers.enumerated() {
                    guard let data = buffer.mData else { continue }
                    let samples = data.assumingMemoryBound(to: Float.self)
                    if index == selectedChannel { gal_generator_render(state.pointer, samples, Int(frameCount)) }
                    else { samples.update(repeating: 0, count: Int(frameCount)) }
                }
                return noErr
            }
}

// Uses the production render block with manual rendering. Opens no hardware output.
func testGeneratorOffline() throws {
    for channel in 0..<2 {
        let format = AVAudioFormat(standardFormatWithSampleRate: 48000, channels: 2)!
        let state = try GeneratorState(rate: 48000, waveform: 0, frequency: 1000, level: -30)
        let source = generatorSource(format: format, state: state, selectedChannel: channel)
        let engine = AVAudioEngine()
        engine.attach(source)
        engine.connect(source, to: engine.mainMixerNode, format: format)
        try engine.enableManualRenderingMode(.offline, format: format, maximumFrameCount: 1024)
        try engine.start()
        defer { engine.stop() }
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: 1024)!
        var power = 0.0
        for block in 0..<8 {
            guard try engine.renderOffline(1024, to: buffer) == .success,
                  let data = buffer.floatChannelData else { throw GeneratorError.format }
            for i in 0..<Int(buffer.frameLength) {
                guard data[1-channel][i] == 0 else { throw GeneratorError.format }
                if block > 0 { power += Double(data[channel][i]) * Double(data[channel][i]) }
            }
        }
        let rms = 10 * log10(power / (7 * 1024))
        guard abs(rms + 33.0103) < 0.03 else { throw GeneratorError.format }
        gal_generator_stop(state.pointer)
        for _ in 0..<3 { guard try engine.renderOffline(1024, to: buffer) == .success else { throw GeneratorError.format } }
        for i in 0..<Int(buffer.frameLength) {
            guard buffer.floatChannelData![channel][i] == 0 else { throw GeneratorError.format }
        }
    }
    print("Native output offline test passed: left/right routing, silent unselected channels, level and fade-out. No audio played.")
}
