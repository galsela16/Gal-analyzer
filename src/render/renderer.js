export class Renderer {
  constructor(canvas, sampleRate = 48000, fftSize = 16384) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.sampleRate = sampleRate;
    this.fftSize = fftSize;

    this.minFreq = 20;
    this.maxFreq = 20000;

    this.minDb = -100;
    this.maxDb = 0;

    this.padding = {
      left: 58,
      right: 18,
      top: 20,
      bottom: 38
    };

    this.resize();

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;

    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.w = cssWidth;
    this.h = cssHeight;

    this.plotLeft = this.padding.left;
    this.plotRight = this.w - this.padding.right;
    this.plotTop = this.padding.top;
    this.plotBottom = this.h - this.padding.bottom;

    this.plotWidth = this.plotRight - this.plotLeft;
    this.plotHeight = this.plotBottom - this.plotTop;
  }

  freqToX(freq) {
    const minLog = Math.log10(this.minFreq);
    const maxLog = Math.log10(this.maxFreq);
    const fLog = Math.log10(freq);

    const normalized = (fLog - minLog) / (maxLog - minLog);

    return this.plotLeft + normalized * this.plotWidth;
  }

  dbToY(db) {
    const clamped = Math.max(this.minDb, Math.min(this.maxDb, db));

    const normalized =
      (clamped - this.minDb) / (this.maxDb - this.minDb);

    return this.plotBottom - normalized * this.plotHeight;
  }

  drawBackground() {
    const ctx = this.ctx;

    ctx.fillStyle = "#0b0d10";
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.fillStyle = "#10141a";
    ctx.fillRect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );
  }

  drawFrequencyGrid() {
    const ctx = this.ctx;

    const frequencies = [
      20,
      30,
      40,
      50,
      60,
      80,
      100,
      200,
      300,
      400,
      500,
      600,
      800,
      1000,
      2000,
      3000,
      4000,
      5000,
      6000,
      8000,
      10000,
      20000
    ];

    const labelFreqs = new Set([
      20,
      50,
      100,
      200,
      500,
      1000,
      2000,
      5000,
      10000,
      20000
    ]);

    ctx.font = "11px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (const freq of frequencies) {
      const x = this.freqToX(freq);

      const major = labelFreqs.has(freq);

      ctx.strokeStyle = major ? "#36404d" : "#222933";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(x, this.plotTop);
      ctx.lineTo(x, this.plotBottom);
      ctx.stroke();

      if (major) {
        ctx.fillStyle = "#9aa6b2";

        let label;

        if (freq >= 1000) {
          label = `${freq / 1000}k`;
        } else {
          label = `${freq}`;
        }

        ctx.fillText(label, x, this.plotBottom + 9);
      }
    }
  }

  drawDbGrid() {
    const ctx = this.ctx;

    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let db = this.minDb; db <= this.maxDb; db += 10) {
      const y = this.dbToY(db);

      ctx.strokeStyle = db % 20 === 0 ? "#36404d" : "#222933";
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(this.plotLeft, y);
      ctx.lineTo(this.plotRight, y);
      ctx.stroke();

      ctx.fillStyle = "#9aa6b2";
      ctx.fillText(`${db}`, this.plotLeft - 8, y);
    }
  }

  drawSpectrum(data) {
    const ctx = this.ctx;

    const binHz = this.sampleRate / this.fftSize;

    ctx.save();

    ctx.beginPath();
    ctx.rect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );
    ctx.clip();

    ctx.beginPath();

    let started = false;

    for (let i = 1; i < data.length; i++) {
      const freq = i * binHz;

      if (freq < this.minFreq) continue;
      if (freq > this.maxFreq) break;

      const x = this.freqToX(freq);
      const y = this.dbToY(data[i]);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = "#35e0a1";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  drawPeaks(peaks) {
    const ctx = this.ctx;

    const binHz = this.sampleRate / this.fftSize;

    ctx.save();

    ctx.beginPath();
    ctx.rect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );
    ctx.clip();

    ctx.beginPath();

    let started = false;

    for (let i = 1; i < peaks.length; i++) {
      const freq = i * binHz;

      if (freq < this.minFreq) continue;
      if (freq > this.maxFreq) break;

      const x = this.freqToX(freq);
      const y = this.dbToY(peaks[i]);

      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.strokeStyle = "#f2c14e";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawLabels() {
    const ctx = this.ctx;

    ctx.fillStyle = "#e6edf3";
    ctx.font = "600 13px Arial";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    ctx.fillText("GAL ANALYZER", this.plotLeft, 4);

    ctx.font = "11px Arial";
    ctx.fillStyle = "#778391";

    ctx.textAlign = "right";
    ctx.fillText(
      "Frequency (Hz)",
      this.plotRight,
      this.plotBottom + 23
    );

    ctx.save();

    ctx.translate(14, this.plotTop + this.plotHeight / 2);
    ctx.rotate(-Math.PI / 2);

    ctx.textAlign = "center";
    ctx.fillText("Level (dBFS)", 0, 0);

    ctx.restore();
  }

  render(data, peaks) {
    this.drawBackground();
    this.drawFrequencyGrid();
    this.drawDbGrid();

    this.drawSpectrum(data);
    this.drawPeaks(peaks);

    this.drawLabels();
  }
}
