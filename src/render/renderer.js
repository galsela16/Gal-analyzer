export class Renderer {
  constructor(canvas) {
    this.ctx = canvas.getContext("2d");
    this.resize(canvas);
  }

  resize(canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.9;

    this.w = canvas.width;
    this.h = canvas.height;
  }

  drawGrid() {
    const ctx = this.ctx;

    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;

    for (let i = 0; i < 10; i++) {
      const y = (i / 10) * this.h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }
  }

  drawSpectrum(data) {
    const ctx = this.ctx;

    ctx.beginPath();

    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * this.w;

      // dB range: -100 → 0
      const y = this.h - ((data[i] + 100) / 100) * this.h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = "#00ffcc";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawPeaks(peaks) {
    const ctx = this.ctx;

    ctx.beginPath();

    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * this.w;
      const y = this.h - ((peaks[i] + 100) / 100) * this.h;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  render(data, peaks) {
    this.ctx.clearRect(0, 0, this.w, this.h);

    this.drawGrid();
    this.drawSpectrum(data);
    this.drawPeaks(peaks);
  }
}
