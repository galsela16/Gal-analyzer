import SwiftUI
import CoreAudio

private let panel = Color(red: 0.055, green: 0.085, blue: 0.10)
private let cyan = Color(red: 0.12, green: 0.80, blue: 0.86)
private let traceColors: [Color] = [.cyan, .orange, .pink, .green, .yellow, .purple]
private func typeface(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font { .custom("Arial", size: size).weight(weight) }
private func levelText(_ value: Double) -> String { value <= -110 ? "NO SIGNAL" : String(format: "%.1f dBFS", value) }

struct AnalyzerView: View {
    @StateObject private var model = AnalyzerModel()
    @StateObject private var generator = GeneratorModel()
    @State private var generatorVisible = false
    @State private var leftVisible = true
    @State private var ioVisible = true
    @State private var compareInputs = false
    var body: some View {
        VStack(spacing: 0) {
            header
            HStack(spacing: 8) {
                if leftVisible { leftRail.frame(width: 230) }
                Button { leftVisible.toggle() } label: { Image(systemName: leftVisible ? "chevron.left" : "chevron.right") }
                    .buttonStyle(.plain).help("Show or hide input meters and traces")
                VStack(spacing: 10) {
                    HStack {
                        Picker("View", selection: $compareInputs) { Text("RTA").tag(false); Text("MIC / REF").tag(true) }
                            .pickerStyle(.segmented).frame(width: 220)
                        Spacer()
                        Picker("Resolution", selection: $model.resolution) {
                            ForEach([3, 6, 12, 24, 48], id: \.self) { value in Text("1/\(value)").tag(value) }
                        }.pickerStyle(.segmented).frame(width: 270)
                    }
                    ZStack {
                        SpectrumChart(model: model, compareInputs: compareInputs)
                        if !model.running && model.frequencies.isEmpty {
                            VStack(spacing: 12) {
                                Text("Native audio analysis").font(typeface(21, .bold))
                                Text("Select an input device and start audio.").foregroundStyle(.secondary)
                                Button("Start audio") { model.start() }.buttonStyle(.borderedProminent).tint(cyan)
                                    .disabled(model.requestingAccess || model.deviceID == 0)
                            }.padding(28).background(panel.opacity(0.95), in: RoundedRectangle(cornerRadius: 12))
                        }
                    }.frame(maxWidth: .infinity, maxHeight: .infinity).background(Color(red: 0.025, green: 0.045, blue: 0.06))
                    HStack(spacing: 12) {
                        Text(levelText(model.micMeter)).font(typeface(15, .bold)).monospacedDigit().frame(width: 120, alignment: .leading)
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 3).fill(.black)
                                RoundedRectangle(cornerRadius: 3).fill(LinearGradient(colors: [.cyan, .green, .yellow, .red], startPoint: .leading, endPoint: .trailing))
                                    .frame(width: geometry.size.width * max(0, min(1, (model.micMeter + 90) / 90)))
                            }
                        }.frame(height: 12)
                        Text("MIC RMS").font(typeface(10, .bold)).foregroundStyle(.secondary)
                    }.padding(10).background(panel, in: RoundedRectangle(cornerRadius: 6))
                }.padding(12).background(panel.opacity(0.45), in: RoundedRectangle(cornerRadius: 8))
                Button { ioVisible.toggle() } label: { Image(systemName: ioVisible ? "chevron.right" : "chevron.left") }
                    .buttonStyle(.plain).help("Show or hide audio settings")
                if ioVisible { settings.frame(width: 220) }
            }.padding(10)
            HStack {
                Text(model.message).lineLimit(2).foregroundStyle(.secondary)
                Spacer()
                Text(model.sampleRate > 0 ? String(format: "%.1f kHz · FFT 16384", model.sampleRate / 1000) : "FFT 16384")
                    .foregroundStyle(.secondary)
            }.font(typeface(11)).padding(.horizontal, 16).padding(.vertical, 9).background(panel)
        }
        .font(typeface(12))
        .foregroundStyle(Color(red: 0.80, green: 0.89, blue: 0.92))
        .background(Color(red: 0.025, green: 0.035, blue: 0.045))
        .frame(minWidth: 1060, minHeight: 670)
        .preferredColorScheme(.dark)
        .onChange(of: model.deviceID) { _ in model.configurationChanged() }
        .onChange(of: model.micChannel) { _ in model.configurationChanged() }
        .onChange(of: model.refChannel) { _ in model.configurationChanged() }
        .onChange(of: model.resolution) { _ in
            let restart = model.running
            model.configurationChanged()
            if restart { model.start() }
        }
        .sheet(isPresented: $generatorVisible) { GeneratorView(model: generator) }
        .onReceive(NotificationCenter.default.publisher(for: NSApplication.willTerminateNotification)) { _ in model.stop(); generator.stop(immediate: true) }
    }

    private var header: some View {
        HStack(spacing: 12) {
            Text("GAL").foregroundColor(cyan) + Text(" ANALYZER")
            Text("NATIVE · \(AnalyzerModel.version)").font(typeface(10)).foregroundStyle(.secondary)
            Spacer()
            Button(model.frozen ? "Resume" : "Freeze") { model.frozen.toggle() }.disabled(!model.running)
            Button("Capture trace") { model.capture() }.disabled(!model.running)
            Button(model.running ? "Stop audio" : model.requestingAccess ? "Requesting access…" : "Start audio") {
                if model.running { model.stop() } else { model.start() }
            }.buttonStyle(.borderedProminent).tint(model.running ? .red : cyan).disabled(model.requestingAccess || model.deviceID == 0)
            Circle().fill(model.running ? .green : .gray).frame(width: 8, height: 8)
            Text(model.running ? "AUDIO LIVE" : "AUDIO OFF").font(typeface(10, .bold))
        }.font(typeface(22, .bold)).padding(.horizontal, 18).padding(.vertical, 14).background(panel)
    }

    private var leftRail: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                InputMeter(name: "MIC", channel: "INPUT \(model.micChannel + 1)", level: model.micMeter, peak: model.micPeak, color: .cyan)
                InputMeter(name: "REF", channel: model.refChannel < 0 ? "NOT ASSIGNED" : "INPUT \(model.refChannel + 1)", level: model.refMeter, peak: nil, color: .orange)
            }.frame(height: 310)
            VStack(alignment: .leading, spacing: 12) {
                HStack { Text("TRACES").font(typeface(12, .bold)); Spacer(); Text("\(model.traces.count) / 6").foregroundStyle(.secondary) }
                if model.traces.isEmpty { Text("No captured traces").foregroundStyle(.secondary) }
                ScrollView {
                    VStack(spacing: 8) {
                        ForEach(Array(model.traces.enumerated()), id: \.element.id) { index, trace in
                            HStack {
                                Circle().fill(traceColors[index % traceColors.count]).frame(width: 7, height: 7)
                                TextField("Trace name", text: Binding(get: { model.traces.first(where: { $0.id == trace.id })?.name ?? "" },
                                    set: { name in if let i = model.traces.firstIndex(where: { $0.id == trace.id }) { model.traces[i].name = String(name.prefix(40)) } }))
                                Button { if let i = model.traces.firstIndex(where: { $0.id == trace.id }) { model.traces[i].visible.toggle() } }
                                    label: { Image(systemName: trace.visible ? "eye" : "eye.slash") }.buttonStyle(.plain)
                                Button { model.traces.removeAll { $0.id == trace.id } } label: { Image(systemName: "xmark") }.buttonStyle(.plain)
                            }
                        }
                    }
                }
                Spacer(minLength: 0)
                HStack {
                    Button("Capture") { model.capture() }.disabled(!model.running)
                    Button("Clear all") { model.traces.removeAll() }.disabled(model.traces.isEmpty)
                }
                Button("Export traces…") { model.exportTraces() }.disabled(model.traces.isEmpty)
            }.padding(12).background(panel, in: RoundedRectangle(cornerRadius: 8))
        }
    }

    private var settings: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack { Text("AUDIO INPUT").font(typeface(12, .bold)); Spacer(); Button { model.refreshDevices() } label: { Image(systemName: "arrow.clockwise") }.help("Refresh audio inputs") }
            Picker("Device", selection: $model.deviceID) {
                if model.devices.isEmpty { Text("No input available").tag(AudioDeviceID(0)) }
                ForEach(model.devices) { device in Text(device.name).tag(device.id) }
            }.labelsHidden().frame(maxWidth: .infinity)
            Text("\(model.channelCount) input channels").foregroundStyle(.secondary)
            Picker("MIC", selection: $model.micChannel) {
                ForEach(0..<max(1, model.channelCount), id: \.self) { channel in Text("Input \(channel + 1)").tag(channel) }
            }
            Picker("REF", selection: $model.refChannel) {
                Text("None").tag(-1)
                ForEach(0..<model.channelCount, id: \.self) { channel in
                    if channel != model.micChannel { Text("Input \(channel + 1)").tag(channel) }
                }
            }
            Divider()
            Text("SIGNAL GENERATOR").font(typeface(11, .bold)).foregroundStyle(cyan)
            Button("Open generator…") { generatorVisible = true }
            Button(generator.running ? "Stop signal" : "Start signal") {
                if generator.running { generator.stop() } else { generator.start() }
            }.disabled(generator.stopping || generator.deviceID == 0)
            Text(generator.running ? "OUTPUT LIVE" : "OUTPUT OFF").font(typeface(10, .bold)).foregroundStyle(generator.running ? cyan : .gray)
            Divider()
            Text("NATIVE PREVIEW").font(typeface(11, .bold)).foregroundStyle(cyan)
            Text("Real audio capture, paired meters, RTA, MIC/REF comparison and trace export.").foregroundStyle(.secondary)
            Text("Levels are dBFS. Physical SPL calibration is not included in this preview.").foregroundStyle(.secondary)
            Text("TF, delay and RT60 will be added in following milestones.").foregroundStyle(.secondary)
            Spacer()
            Text("Free · Local · Offline").font(typeface(11, .bold)).foregroundStyle(cyan)
        }.padding(14).background(panel, in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct InputMeter: View {
    let name: String
    let channel: String
    let level: Double
    let peak: Double?
    let color: Color
    var body: some View {
        VStack(spacing: 8) {
            Text(name).font(typeface(13, .bold))
            Text(channel).font(typeface(8)).foregroundStyle(.secondary)
            GeometryReader { geometry in
                HStack(spacing: 6) {
                    VStack { ForEach([0, -12, -24, -36, -60, -90], id: \.self) { value in Text("\(value)").font(typeface(9)).foregroundStyle(.secondary); if value != -90 { Spacer() } } }.frame(width: 25)
                    ZStack(alignment: .bottom) {
                        Rectangle().fill(.black)
                        Rectangle().fill(LinearGradient(colors: [color, .green, .yellow, .red], startPoint: .bottom, endPoint: .top))
                            .frame(height: geometry.size.height * max(0, min(1, (level + 90) / 90)))
                        if let peak = peak, peak > -110 {
                            Rectangle().fill(.white).frame(height: 2).offset(y: -geometry.size.height * max(0, min(1, (peak + 90) / 90)))
                        }
                    }.frame(width: 22)
                }.frame(maxWidth: .infinity)
            }
            Text(levelText(level)).font(typeface(9, .bold)).monospacedDigit().lineLimit(1)
        }.padding(10).frame(maxWidth: .infinity).background(panel, in: RoundedRectangle(cornerRadius: 8))
    }
}

private struct SpectrumChart: View {
    @ObservedObject var model: AnalyzerModel
    let compareInputs: Bool
    var body: some View {
        Canvas { context, size in
            let left: CGFloat = 34, bottom: CGFloat = 30, top: CGFloat = 18
            let width = max(1, size.width - left - 12), height = max(1, size.height - bottom - top)
            let x: (Double) -> CGFloat = { left + CGFloat(log2(max(20, $0) / 20) / log2(1000)) * width }
            let y: (Double) -> CGFloat = { top + CGFloat(1 - max(0, min(1, ($0 + 90) / 90))) * height }
            for value in [0, -15, -30, -45, -60, -75, -90] {
                var line = Path(); line.move(to: CGPoint(x: left, y: y(Double(value)))); line.addLine(to: CGPoint(x: left + width, y: y(Double(value))))
                context.stroke(line, with: .color(.white.opacity(0.09)), lineWidth: 1)
                context.draw(Text("\(value)").font(typeface(9)).foregroundColor(.gray), at: CGPoint(x: left - 6, y: y(Double(value))), anchor: .trailing)
            }
            for frequency in [20.0, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] {
                var line = Path(); line.move(to: CGPoint(x: x(frequency), y: top)); line.addLine(to: CGPoint(x: x(frequency), y: top + height))
                context.stroke(line, with: .color(.white.opacity(0.07)), lineWidth: 1)
                let label = frequency >= 1000 ? "\(Int(frequency / 1000))k" : "\(Int(frequency))"
                context.draw(Text(label).font(typeface(10)).foregroundColor(.gray), at: CGPoint(x: x(frequency), y: top + height + 16))
            }
            if compareInputs {
                curve(context: &context, frequencies: model.frequencies, levels: model.displayBands, color: .cyan, x: x, y: y)
                curve(context: &context, frequencies: model.frequencies, levels: model.displayRefBands, color: .orange, x: x, y: y)
                context.draw(Text(model.refChannel < 0 ? "MIC · REF not assigned" : "MIC (cyan) · REF (orange)").font(typeface(11)).foregroundColor(.gray), at: CGPoint(x: left + 8, y: 8), anchor: .topLeading)
            } else {
                let bandWidth = width / CGFloat(max(1, model.frequencies.count))
                for i in model.displayBands.indices {
                    let point = CGPoint(x: x(model.frequencies[i]), y: y(model.displayBands[i]))
                    let rect = CGRect(x: point.x - bandWidth / 2, y: point.y, width: max(0.5, bandWidth * 0.88), height: max(0, top + height - point.y))
                    context.fill(Path(rect), with: .color(.purple.opacity(0.83)))
                }
            }
            for (index, trace) in model.traces.enumerated() where trace.visible {
                curve(context: &context, frequencies: trace.frequencies, levels: trace.levels, color: traceColors[index % traceColors.count], x: x, y: y)
            }
        }.clipped().accessibilityLabel("Native real-time spectrum, 20 Hz to 20 kHz, dBFS")
    }
    private func curve(context: inout GraphicsContext, frequencies: [Double], levels: [Double], color: Color,
                       x: (Double) -> CGFloat, y: (Double) -> CGFloat) {
        guard frequencies.count == levels.count, !levels.isEmpty else { return }
        var path = Path()
        for i in levels.indices { let point = CGPoint(x: x(frequencies[i]), y: y(levels[i])); if i == 0 { path.move(to: point) } else { path.addLine(to: point) } }
        context.stroke(path, with: .color(color), lineWidth: 1.5)
    }
}

private struct GeneratorView: View {
    @ObservedObject var model: GeneratorModel
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                Text("Signal generator").font(typeface(22, .bold))
                Spacer()
                Button("Done") { dismiss() }
            }
            Text("Output device").font(typeface(12, .bold))
            HStack {
                Picker("Output device", selection: $model.deviceID) {
                    if model.devices.isEmpty { Text("No output available").tag(AudioDeviceID(0)) }
                    ForEach(model.devices) { device in Text(device.name).tag(device.id) }
                }.labelsHidden()
                Button { model.refreshDevices() } label: { Image(systemName: "arrow.clockwise") }.help("Refresh audio outputs")
            }
            Picker("Channel", selection: $model.channel) {
                ForEach(0..<max(1, model.channelCount), id: \.self) { channel in Text("Output \(channel + 1)").tag(channel) }
            }
            Text("Only the selected output channel receives the signal.").foregroundStyle(.secondary)
            Picker("Signal", selection: $model.waveform) {
                Text("Sine").tag(0); Text("White noise").tag(1); Text("Pink noise").tag(2)
            }.pickerStyle(.segmented)
            if model.waveform == 0 {
                HStack {
                    Text("Frequency (Hz)")
                    TextField("Frequency", value: $model.frequency, format: .number).frame(width: 95)
                    Stepper("", value: $model.frequency, in: 20...20000, step: 10).labelsHidden()
                }
            }
            HStack { Text("Peak ceiling"); Spacer(); Text(String(format: "%.0f dBFS", model.level)).monospacedDigit() }
            Slider(value: $model.level, in: -80 ... -6, step: 1)
            Text("Noise RMS is lower than its peak ceiling. This level is digital dBFS, not calibrated SPL.").foregroundStyle(.secondary)
            HStack {
                Circle().fill(model.running ? cyan : .gray).frame(width: 8, height: 8)
                Text(model.running ? "OUTPUT LIVE" : "OUTPUT OFF").font(typeface(11, .bold))
                Spacer()
                Button(model.running ? "Stop signal" : "Start signal") {
                    if model.running { model.stop() } else { model.start() }
                }.buttonStyle(.borderedProminent).tint(model.running ? .red : cyan)
                    .disabled(model.stopping || model.deviceID == 0)
            }
            Text(model.message).foregroundStyle(.secondary).frame(minHeight: 35, alignment: .topLeading)
        }.font(typeface(12)).padding(24).frame(width: 490).background(panel).preferredColorScheme(.dark)
            .onChange(of: model.deviceID) { _ in model.settingsChanged() }
            .onChange(of: model.channel) { _ in model.settingsChanged() }
            .onChange(of: model.waveform) { _ in model.settingsChanged() }
            .onChange(of: model.frequency) { _ in model.settingsChanged() }
            .onChange(of: model.level) { _ in model.settingsChanged() }
    }
}
