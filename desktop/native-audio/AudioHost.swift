import Foundation
import CoreAudio
import AudioToolbox
import AVFoundation

struct Device: Codable {
    let id: UInt32
    let uid: String
    let name: String
    let channels: Int
    let labels: [String]
    let sampleRate: Double
    let isDefault: Bool
}
func stringProperty(_ id: AudioObjectID, _ selector: AudioObjectPropertySelector, element: UInt32 = 0) -> String? {
    var address = AudioObjectPropertyAddress(mSelector: selector, mScope: kAudioObjectPropertyScopeGlobal, mElement: element)
    var value: Unmanaged<CFString>?
    var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
    guard AudioObjectGetPropertyData(id, &address, 0, nil, &size, &value) == noErr, let value = value else { return nil }
    return value.takeRetainedValue() as String
}
func defaultInput() -> AudioDeviceID {
    var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDefaultInputDevice, mScope: kAudioObjectPropertyScopeGlobal, mElement: 0)
    var value: UInt32 = 0, size = UInt32(MemoryLayout<UInt32>.size)
    _ = AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &value)
    return value
}
func devices() -> [Device] {
    var address = AudioObjectPropertyAddress(mSelector: kAudioHardwarePropertyDevices, mScope: kAudioObjectPropertyScopeGlobal, mElement: 0)
    var size: UInt32 = 0
    guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size) == noErr else { return [] }
    var ids = [UInt32](repeating: 0, count: Int(size)/MemoryLayout<UInt32>.size)
    guard ids.withUnsafeMutableBytes({ AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, $0.baseAddress!) }) == noErr else { return [] }
    return ids.compactMap { id in
        var config = AudioObjectPropertyAddress(mSelector: kAudioDevicePropertyStreamConfiguration, mScope: kAudioObjectPropertyScopeInput, mElement: 0)
        var bytes: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(id, &config, 0, nil, &bytes) == noErr, bytes > 0 else { return nil }
        let memory = UnsafeMutableRawPointer.allocate(byteCount: Int(bytes), alignment: MemoryLayout<AudioBufferList>.alignment)
        defer { memory.deallocate() }
        guard AudioObjectGetPropertyData(id, &config, 0, nil, &bytes, memory) == noErr else { return nil }
        let channels = UnsafeMutableAudioBufferListPointer(memory.assumingMemoryBound(to: AudioBufferList.self)).reduce(0) { $0 + Int($1.mNumberChannels) }
        guard channels > 0, channels <= 32, let uid = stringProperty(id, kAudioDevicePropertyDeviceUID), let name = stringProperty(id,kAudioObjectPropertyName) else { return nil }
        var rateAddress = AudioObjectPropertyAddress(mSelector:kAudioDevicePropertyNominalSampleRate,mScope:kAudioObjectPropertyScopeGlobal,mElement:0)
        var rate = 0.0, rateSize = UInt32(MemoryLayout<Double>.size)
        _ = AudioObjectGetPropertyData(id,&rateAddress,0,nil,&rateSize,&rate)
        let labels = (0..<channels).map { channel -> String in
            // EVO8 exposes four analog inputs followed by its two loopback inputs.
            if name.uppercased().replacingOccurrences(of: " ", with: "").contains("EVO8"), channels == 6, channel >= 4 { return "Loopback \(channel - 3)" }
            return "Input \(channel + 1)"
        }
        return Device(id:id,uid:uid,name:name,channels:channels,labels:labels,sampleRate:rate,isDefault:id==defaultInput())
    }
}
struct HostError: LocalizedError {
    let text: String
    var errorDescription: String? { text }
}
func check(_ status: OSStatus, _ operation: String) throws {
    if status != noErr { throw HostError(text:"\(operation) failed (\(status)).") }
}
func event(_ value: [String:Any]) {
    if let json = try? JSONSerialization.data(withJSONObject:value) { FileHandle.standardError.write(json); FileHandle.standardError.write(Data([10])) }
}
func packet(_ samples: [Float], channels: Int, rate: Double, sequence: UInt32) {
    var header = [UInt32(0x504c4147),UInt32(channels),UInt32(samples.count/channels),UInt32(rate),sequence].map { $0.littleEndian }
    let data = header.withUnsafeMutableBytes { Data($0) }
    FileHandle.standardOutput.write(data)
    samples.withUnsafeBytes { FileHandle.standardOutput.write(Data($0)) }
}
final class Capture {
    var unit: AudioUnit?
    var ring: OpaquePointer?
    var list: UnsafeMutablePointer<AudioBufferList>?
    var storage: [UnsafeMutablePointer<Float>] = []
    var maximumFrames: UInt32 = 4096
    let device: Device
    let targetRate: Double
    var nativeRate = 0.0
    private let worker = DispatchQueue(label:"com.galanalyzer.audio.transport",qos:.userInteractive)
    private var timer: DispatchSourceTimer?
    private var converter: AVAudioConverter?
    private var nativeFormat: AVAudioFormat?
    private var outputFormat: AVAudioFormat?
    private var sequence: UInt32 = 0
    private var started = false
    init(device: Device, rate: Double) { self.device=device; targetRate=rate }
    func set<T>(_ property: AudioUnitPropertyID, _ scope: AudioUnitScope, _ element: UInt32, _ value: inout T) throws {
        guard let unit = unit else { throw HostError(text:"No audio unit.") }
        try withUnsafePointer(to:&value) { try check(AudioUnitSetProperty(unit,property,scope,element,$0,UInt32(MemoryLayout<T>.size)),"Configure audio input") }
    }
    func start() throws {
        var description=AudioComponentDescription(componentType:kAudioUnitType_Output,componentSubType:kAudioUnitSubType_HALOutput,componentManufacturer:kAudioUnitManufacturer_Apple,componentFlags:0,componentFlagsMask:0)
        guard let component=AudioComponentFindNext(nil,&description) else { throw HostError(text:"Core Audio input component not found.") }
        try check(AudioComponentInstanceNew(component,&unit),"Open Core Audio")
        var on: UInt32=1, off: UInt32=0, id=device.id
        try set(kAudioOutputUnitProperty_EnableIO,kAudioUnitScope_Input,1,&on)
        try set(kAudioOutputUnitProperty_EnableIO,kAudioUnitScope_Output,0,&off)
        try set(kAudioOutputUnitProperty_CurrentDevice,kAudioUnitScope_Global,0,&id)
        var hardware=AudioStreamBasicDescription(), bytes=UInt32(MemoryLayout<AudioStreamBasicDescription>.size)
        try check(AudioUnitGetProperty(unit!,kAudioUnitProperty_StreamFormat,kAudioUnitScope_Input,1,&hardware,&bytes),"Read input format")
        nativeRate=hardware.mSampleRate
        guard Int(hardware.mChannelsPerFrame)==device.channels, nativeRate >= 40000, nativeRate <= 192000 else { throw HostError(text:"The interface format does not expose all \(device.channels) channels at 44.1–192 kHz.") }
        guard let layout=AVAudioChannelLayout(layoutTag:kAudioChannelLayoutTag_DiscreteInOrder | UInt32(device.channels)) else { throw HostError(text:"Invalid channel layout.") }
        let format=AVAudioFormat(commonFormat:.pcmFormatFloat32,sampleRate:nativeRate,interleaved:false,channelLayout:layout)
        let output=AVAudioFormat(commonFormat:.pcmFormatFloat32,sampleRate:targetRate,interleaved:false,channelLayout:layout)
        nativeFormat=format;outputFormat=output
        var stream=format.streamDescription.pointee
        try set(kAudioUnitProperty_StreamFormat,kAudioUnitScope_Output,1,&stream)
        bytes=UInt32(MemoryLayout<UInt32>.size)
        _ = AudioUnitGetProperty(unit!,kAudioUnitProperty_MaximumFramesPerSlice,kAudioUnitScope_Global,0,&maximumFrames,&bytes)
        maximumFrames=max(maximumFrames,4096)
        let listBytes=MemoryLayout<AudioBufferList>.size+(device.channels-1)*MemoryLayout<AudioBuffer>.size
        let memory=UnsafeMutableRawPointer.allocate(byteCount:listBytes,alignment:MemoryLayout<AudioBufferList>.alignment)
        memory.initializeMemory(as:UInt8.self,repeating:0,count:listBytes)
        list=memory.assumingMemoryBound(to:AudioBufferList.self);list!.pointee.mNumberBuffers=UInt32(device.channels)
        let buffers=UnsafeMutableAudioBufferListPointer(list!)
        for channel in 0..<device.channels {
            let data=UnsafeMutablePointer<Float>.allocate(capacity:Int(maximumFrames));storage.append(data)
            buffers[channel]=AudioBuffer(mNumberChannels:1,mDataByteSize:maximumFrames*4,mData:UnsafeMutableRawPointer(data))
        }
        ring=gal_capture_ring_create(device.channels,Int(nativeRate/4))
        guard ring != nil else { throw HostError(text:"Unable to allocate bounded audio buffer.") }
        var callback=AURenderCallbackStruct(inputProc:{ refCon, flags, timestamp, _, frames, _ in
            let capture=Unmanaged<Capture>.fromOpaque(refCon).takeUnretainedValue()
            guard frames<=capture.maximumFrames,let unit=capture.unit,let list=capture.list,let ring=capture.ring else { gal_capture_ring_fail(capture.ring,-4); return -1 }
            let buffers=UnsafeMutableAudioBufferListPointer(list)
            for i in buffers.indices { buffers[i].mDataByteSize=frames*4 }
            let status=AudioUnitRender(unit,flags,timestamp,1,frames,list)
            if status==noErr { _=gal_capture_ring_write(ring,list,Int(frames)) }
            else { gal_capture_ring_fail(ring,Int32(status)) }
            return status
        },inputProcRefCon:Unmanaged.passUnretained(self).toOpaque())
        try set(kAudioOutputUnitProperty_SetInputCallback,kAudioUnitScope_Global,0,&callback)
        if nativeRate != targetRate {
            converter=AVAudioConverter(from:format,to:output)
            guard converter != nil else { throw HostError(text:"Sample-rate converter unavailable.") }
            converter!.sampleRateConverterQuality=AVAudioQuality.max.rawValue
        }
        try check(AudioUnitInitialize(unit!),"Initialize capture")
        try check(AudioOutputUnitStart(unit!),"Start capture")
        started=true
        let timer=DispatchSource.makeTimerSource(queue:worker)
        timer.schedule(deadline:.now(),repeating:.milliseconds(5))
        timer.setEventHandler { [weak self] in self?.pump() }
        self.timer=timer
        event(["type":"ready","channels":device.channels,"labels":device.labels,"sampleRate":targetRate,"nativeSampleRate":nativeRate,"uid":device.uid,"name":device.name])
        timer.resume()
    }
    private func pump() {
        guard let ring=ring, let format=nativeFormat, let output=outputFormat else { return }
        let error=gal_capture_ring_error(ring)
        if error != 0 { event(["type":"error","message":"Native capture stopped: audio discontinuity (\(error)). Restart audio."]); exit(2) }
        var samples=[Float](repeating:0,count:1024*device.channels)
        let count=gal_capture_ring_read(ring,&samples,1024)
        guard count>0 else { return }
        if let converter=converter {
            let input=AVAudioPCMBuffer(pcmFormat:format,frameCapacity:AVAudioFrameCount(count))!
            input.frameLength=AVAudioFrameCount(count)
            for i in 0..<count { for c in 0..<device.channels { input.floatChannelData![c][i]=samples[i*device.channels+c] } }
            let capacity=AVAudioFrameCount(ceil(Double(count)*targetRate/nativeRate)+128)
            let converted=AVAudioPCMBuffer(pcmFormat:output,frameCapacity:capacity)!
            var supplied=false, conversionError:NSError?
            let status=converter.convert(to:converted,error:&conversionError) { _, state in
                if supplied { state.pointee = .noDataNow;return nil }
                supplied=true;state.pointee = .haveData;return input
            }
            if status == .error { event(["type":"error","message":"Sample-rate conversion failed."]);exit(2) }
            let frames=Int(converted.frameLength)
            guard frames>0 else { return }
            samples=[Float](repeating:0,count:frames*device.channels)
            for i in 0..<frames { for c in 0..<device.channels { samples[i*device.channels+c]=converted.floatChannelData![c][i] } }
        } else { samples.removeLast(samples.count-count*device.channels) }
        packet(samples,channels:device.channels,rate:targetRate,sequence:sequence);sequence &+= 1
    }
    func stop() {
        if let unit=unit,started { AudioOutputUnitStop(unit);started=false }
        timer?.cancel();timer=nil;worker.sync {}
        if let unit=unit { AudioUnitUninitialize(unit);AudioComponentInstanceDispose(unit) };unit=nil
        if let ring=ring { gal_capture_ring_destroy(ring) };ring=nil
        for data in storage { data.deallocate() };storage=[]
        list?.deallocate();list=nil
    }
    deinit { stop() }
}
let arguments=CommandLine.arguments
if arguments.contains("--list") {
    let data=try JSONEncoder().encode(devices());FileHandle.standardOutput.write(data);exit(0)
}
let test=arguments.contains("--test-stream")
let requestedUID=arguments.count>2 ? arguments[2] : ""
let targetRate=arguments.count>3 ? Double(arguments[3]) ?? 0 : 48000
if !targetRate.isFinite || targetRate<40000 || targetRate>192000 { event(["type":"error","message":"Invalid analysis sample rate."]);exit(1) }
if test {
    event(["type":"ready","channels":6,"labels":(1...6).map { "Test input \($0)" },"sampleRate":targetRate,"nativeSampleRate":targetRate,"uid":"synthetic","name":"Native transport test"])
    var sequence:UInt32=0, frame=0
    var random:UInt32=123456789;let delay=Int(targetRate * 0.005);var history=[Float](repeating:0,count:delay);var historyIndex=0
    let timer=DispatchSource.makeTimerSource(queue:.main)
    timer.schedule(deadline:.now() + .milliseconds(20),repeating:.milliseconds(10))
    timer.setEventHandler {
        let frames=Int(targetRate/100)
        var samples=[Float](repeating:0,count:frames*6)
        for i in 0..<frames { for c in 0..<6 { samples[i*6+c]=Float(pow(10,Double(-12-c*3)/20)*sin(2*Double.pi*Double(300+c*300)*Double(frame+i)/targetRate)) } }
        if requestedUID=="field-test" {
            for i in 0..<frames {
                random ^= random << 13;random ^= random >> 17;random ^= random << 5
                let value=(Float(random)/Float(UInt32.max)*2-1)*0.2
                let delayed=history[historyIndex];history[historyIndex]=value;historyIndex=(historyIndex+1)%delay
                samples[i*6]=delayed*0.7;samples[i*6+1]=value
                samples[i*6+2]=delayed*0.5;samples[i*6+3]=value*0.8
            }
        }
        packet(samples,channels:6,rate:targetRate,sequence:sequence);sequence &+= 1;frame+=frames
    }
    timer.resume();dispatchMain()
}
do {
    let all=devices()
    guard let selected=requestedUID.isEmpty ? all.first(where:{$0.isDefault}) : all.first(where:{$0.uid==requestedUID}) else { throw HostError(text:"Selected audio interface is not connected. Refresh inputs.") }
    let capture=Capture(device:selected,rate:targetRate)
    try capture.start()
    signal(SIGTERM,SIG_IGN)
    let shutdown=DispatchSource.makeSignalSource(signal:SIGTERM,queue:.main)
    shutdown.setEventHandler { capture.stop();exit(0) };shutdown.resume()
    FileHandle.standardInput.readabilityHandler={ handle in
        if handle.availableData.isEmpty { DispatchQueue.main.async { capture.stop();exit(0) } }
    }
    dispatchMain()
} catch { event(["type":"error","message":error.localizedDescription]);exit(1) }
