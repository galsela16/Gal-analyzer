import Foundation
import AVFoundation
import CoreAudio
import AudioToolbox

struct InputDevice: Identifiable, Hashable {
    let id: AudioDeviceID
    let name: String
    let channels: Int
}

enum AudioInputs {
    static func devices() -> [InputDevice] {
        var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        var size: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else { return [] }
        var ids = [AudioDeviceID](repeating: 0, count: Int(size) / MemoryLayout<AudioDeviceID>.size)
        let status = ids.withUnsafeMutableBytes { AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, $0.baseAddress!) }
        guard status == noErr else { return [] }
        return ids.compactMap { id in
            var config = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreamConfiguration,
                mScope: kAudioDevicePropertyScopeInput, mElement: kAudioObjectPropertyElementMain)
            var bytes: UInt32 = 0
            guard AudioObjectGetPropertyDataSize(id, &config, 0, nil, &bytes) == noErr, bytes > 0 else { return nil }
            let storage = UnsafeMutableRawPointer.allocate(byteCount: Int(bytes), alignment: MemoryLayout<AudioBufferList>.alignment)
            defer { storage.deallocate() }
            guard AudioObjectGetPropertyData(id, &config, 0, nil, &bytes, storage) == noErr else { return nil }
            let buffers = UnsafeMutableAudioBufferListPointer(storage.assumingMemoryBound(to: AudioBufferList.self))
            let channels = buffers.reduce(0) { $0 + Int($1.mNumberChannels) }
            guard channels > 0 else { return nil }
            var nameAddress = AudioObjectPropertyAddress(mSelector: kAudioObjectPropertyName,
                mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
            var name: Unmanaged<CFString>?
            var nameSize = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
            guard AudioObjectGetPropertyData(id, &nameAddress, 0, nil, &nameSize, &name) == noErr else { return nil }
            guard let name = name else { return nil }
            return InputDevice(id: id, name: name.takeRetainedValue() as String, channels: channels)
        }.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    static func defaultDeviceID() -> AudioDeviceID {
        var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultInputDevice,
            mScope: kAudioObjectPropertyScopeGlobal, mElement: kAudioObjectPropertyElementMain)
        var id: AudioDeviceID = 0
        var size = UInt32(MemoryLayout<AudioDeviceID>.size)
        _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &id)
        return id
    }
}

struct InputFrame {
    let frequencies: [Double]
    let micBands: [Double]
    let refBands: [Double]?
    let micRMS: Double
    let refRMS: Double?
    let micPeak: Double
    let sampleRate: Double
    let channelCount: Int
    let timestamp: TimeInterval
}

final class AudioInputEngine {
    private var engine: AVAudioEngine?
    private let worker = DispatchQueue(label: "com.galanalyzer.native.analysis", qos: .userInitiated)
    private let fftSize = 16384

    func start(device: AudioDeviceID, micChannel: Int, refChannel: Int?, resolution: Int,
               receive: @escaping (InputFrame) -> Void) throws {
        stop()
        let engine = AVAudioEngine()
        let input = engine.inputNode
        if let unit = input.audioUnit {
            var selected = device
            let status = AudioUnitSetProperty(unit, kAudioOutputUnitProperty_CurrentDevice,
                kAudioUnitScope_Global, 0, &selected, UInt32(MemoryLayout<AudioDeviceID>.size))
            guard status == noErr else { throw InputError.device(status) }
        }
        let format = input.outputFormat(forBus: 0)
        let channels = Int(format.channelCount)
        guard format.commonFormat == .pcmFormatFloat32, !format.isInterleaved,
              format.sampleRate >= 40000, format.sampleRate <= 192000,
              channels > micChannel, micChannel >= 0,
              refChannel == nil || (refChannel! >= 0 && refChannel! < channels && refChannel! != micChannel)
        else { throw InputError.format }
        let fftSize = self.fftSize
        // All selected channels are copied from one callback and use one sample clock.
        var micSamples = [Float]()
        var refSamples = [Float]()
        micSamples.reserveCapacity(fftSize * 2)
        refSamples.reserveCapacity(fftSize * 2)
        var framesSinceAnalysis = 0
        input.installTap(onBus: 0, bufferSize: 1024, format: format) { [worker] buffer, _ in
            guard let data = buffer.floatChannelData else { return }
            let count = Int(buffer.frameLength)
            let mic = Array(UnsafeBufferPointer(start: data[micChannel], count: count))
            let ref = refChannel.map { Array(UnsafeBufferPointer(start: data[$0], count: count)) }
            worker.async {
                micSamples.append(contentsOf: mic)
                if let ref = ref { refSamples.append(contentsOf: ref) }
                if micSamples.count > fftSize { micSamples.removeFirst(micSamples.count - fftSize) }
                if refSamples.count > fftSize { refSamples.removeFirst(refSamples.count - fftSize) }
                framesSinceAnalysis += count
                guard micSamples.count == fftSize, framesSinceAnalysis >= Int(format.sampleRate / 30) else { return }
                framesSinceAnalysis = 0
                let capacity = Int(gal_band_count(Int32(resolution)))
                var frequencies = [Double](repeating: 0, count: capacity)
                var micBands = [Double](repeating: -120, count: capacity)
                var micResult = GalAnalysis()
                let status = micSamples.withUnsafeBufferPointer { samples in
                    gal_analyze(samples.baseAddress, fftSize, format.sampleRate, Int32(resolution), &frequencies, &micBands, capacity, &micResult)
                }
                guard status == 0 else { return }
                var refBands: [Double]?
                var refRMS: Double?
                if refChannel != nil, refSamples.count == fftSize {
                    var bands = [Double](repeating: -120, count: capacity)
                    var result = GalAnalysis()
                    let status = refSamples.withUnsafeBufferPointer { samples in
                        gal_analyze(samples.baseAddress, fftSize, format.sampleRate, Int32(resolution), &frequencies, &bands, capacity, &result)
                    }
                    if status == 0 { refBands = bands; refRMS = result.rms_dbfs }
                }
                receive(InputFrame(frequencies: frequencies, micBands: micBands, refBands: refBands,
                    micRMS: micResult.rms_dbfs, refRMS: refRMS, micPeak: micResult.peak_dbfs,
                    sampleRate: format.sampleRate, channelCount: channels, timestamp: ProcessInfo.processInfo.systemUptime))
            }
        }
        engine.prepare()
        do { try engine.start() }
        catch { input.removeTap(onBus: 0); throw error }
        self.engine = engine
    }

    func stop() {
        if let engine = engine { engine.inputNode.removeTap(onBus: 0); engine.stop() }
        engine = nil
    }

    enum InputError: LocalizedError {
        case device(OSStatus)
        case format
        var errorDescription: String? {
            switch self {
            case .device(let code): return "Unable to open this audio input (\(code)). Select another device and try again."
            case .format: return "Choose distinct, available MIC/REF channels on an input running at 44.1–192 kHz. REF may be set to None."
            }
        }
    }
}
