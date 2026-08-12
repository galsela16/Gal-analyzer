export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.minFreq = 20;
    this.maxFreq = 20000;

    this.minDb = -100;
    this.maxDb = 0;

    this.padding = {
      left: 58,
      right: 18,
      top: 30,
      bottom: 38
    };

    this.resize();

    window.addEventListener("resize", () => {
      this.resize();
    });
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;

    this.ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    this.w = width;
    this.h = height;

    this.plotLeft = this.padding.left;
    this.plotRight = this.w - this.padding.right;

    this.plotTop = this.padding.top;
    this.plotBottom = this.h - this.padding.bottom;

    this.plotWidth =
      this.plotRight - this.plotLeft;

    this.plotHeight =
      this.plotBottom - this.plotTop;
  }

  freqToX(freq) {
    const minLog =
      Math.log10(this.minFreq);

    const maxLog =
      Math.log10(this.maxFreq);

    const freqLog =
      Math.log10(freq);

    const position =
      (freqLog - minLog) /
      (maxLog - minLog);

    return (
      this.plotLeft +
      position * this.plotWidth
    );
  }

  dbToY(db) {
    const clamped =
      Math.max(
        this.minDb,
        Math.min(this.maxDb, db)
      );

    const position =
      (clamped - this.minDb) /
      (this.maxDb - this.minDb);

    return (
      this.plotBottom -
      position * this.plotHeight
    );
  }

  drawBackground() {
    this.ctx.fillStyle = "#0b0d10";

    this.ctx.fillRect(
      0,
      0,
      this.w,
      this.h
    );

    this.ctx.fillStyle = "#10141a";

    this.ctx.fillRect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );
  }

  drawFrequencyGrid() {
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

    const labels = new Set([
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

    this.ctx.font =
      "11px Arial";

    this.ctx.textAlign =
      "center";

    this.ctx.textBaseline =
      "top";

    for (const freq of frequencies) {
      const x =
        this.freqToX(freq);

      const major =
        labels.has(freq);

      this.ctx.strokeStyle =
        major
          ? "#36404d"
          : "#222933";

      this.ctx.lineWidth = 1;

      this.ctx.beginPath();

      this.ctx.moveTo(
        x,
        this.plotTop
      );

      this.ctx.lineTo(
        x,
        this.plotBottom
      );

      this.ctx.stroke();

      if (major) {
        this.ctx.fillStyle =
          "#9aa6b2";

        let text;

        if (freq >= 1000) {
          text =
            `${freq / 1000}k`;
        } else {
          text = `${freq}`;
        }

        this.ctx.fillText(
          text,
          x,
          this.plotBottom + 9
        );
      }
    }
  }

  drawDbGrid() {
    this.ctx.font =
      "11px Arial";

    this.ctx.textAlign =
      "right";

    this.ctx.textBaseline =
      "middle";

    for (
      let db = this.minDb;
      db <= this.maxDb;
      db += 10
    ) {
      const y =
        this.dbToY(db);

      this.ctx.strokeStyle =
        db % 20 === 0
          ? "#36404d"
          : "#222933";

      this.ctx.lineWidth = 1;

      this.ctx.beginPath();

      this.ctx.moveTo(
        this.plotLeft,
        y
      );

      this.ctx.lineTo(
        this.plotRight,
        y
      );

      this.ctx.stroke();

      this.ctx.fillStyle =
        "#9aa6b2";

      this.ctx.fillText(
        `${db}`,
        this.plotLeft - 8,
        y
      );
    }
  }

  drawBands(bands, data) {
    this.ctx.save();

    this.ctx.beginPath();

    this.ctx.rect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );

    this.ctx.clip();

    this.ctx.beginPath();

    let started = false;

    for (
      let i = 0;
      i < bands.length;
      i++
    ) {
      const freq =
        bands[i].center;

      if (
        freq < this.minFreq ||
        freq > this.maxFreq
      ) {
        continue;
      }

      const x =
        this.freqToX(freq);

      const y =
        this.dbToY(data[i]);

      if (!started) {
        this.ctx.moveTo(x, y);
        started = true;
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.strokeStyle =
      "#35e0a1";

    this.ctx.lineWidth = 2;

    this.ctx.lineJoin =
      "round";

    this.ctx.lineCap =
      "round";

    this.ctx.stroke();

    this.ctx.restore();
  }

  drawBandPeaks(bands, peaks) {
    this.ctx.save();

    this.ctx.beginPath();

    this.ctx.rect(
      this.plotLeft,
      this.plotTop,
      this.plotWidth,
      this.plotHeight
    );

    this.ctx.clip();

    this.ctx.fillStyle =
      "#f2c14e";

    for (
      let i = 0;
      i < bands.length;
      i++
    ) {
      const freq =
        bands[i].center;

      if (
        freq < this.minFreq ||
        freq > this.maxFreq
      ) {
        continue;
      }

      const x =
        this.freqToX(freq);

      const y =
        this.dbToY(peaks[i]);

      this.ctx.beginPath();

      this.ctx.arc(
        x,
        y,
        2,
        0,
        Math.PI * 2
      );

      this.ctx.fill();
    }

    this.ctx.restore();
  }

  drawLabels() {
    this.ctx.fillStyle =
      "#e6edf3";

    this.ctx.font =
      "600 13px Arial";

    this.ctx.textAlign =
      "left";

    this.ctx.textBaseline =
      "top";

    this.ctx.fillText(
      "GAL ANALYZER",
      this.plotLeft,
      7
    );

    this.ctx.font =
      "11px Arial";

    this.ctx.fillStyle =
      "#778391";

    this.ctx.textAlign =
      "right";

    this.ctx.fillText(
      "Frequency (Hz)",
      this.plotRight,
      this.plotBottom + 23
    );
  }

  render(bands, data, peaks) {
    this.drawBackground();

    this.drawFrequencyGrid();

    this.drawDbGrid();

    this.drawBands(
      bands,
      data
    );

    this.drawBandPeaks(
      bands,
      peaks
    );

    this.drawLabels();
  }
}
