const LAND = "rgba(64, 150, 230, 0.5)";
const MARKER = "#5fe1ff";
const HOT = "#ffcf5c";
const FLIGHT = "rgba(150, 220, 255, 0.85)";

export class WorldMap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.dots = null;
    this.points = [];
    this.flights = [];
    this._resize();
    new ResizeObserver(() => { this._resize(); this._draw(); }).observe(canvas);
    this._load();
  }

  _resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth || 400;
    this.h = this.canvas.clientHeight || 400;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  async _load() {
    try {
      const geo = await fetch("/geo/countries.geojson").then((r) => r.json());
      const dots = [];
      for (const f of geo.features) {
        const g = f.geometry;
        if (!g) continue;
        const polys = g.type === "Polygon" ? [g.coordinates]
          : g.type === "MultiPolygon" ? g.coordinates : [];
        for (const poly of polys) {
          const ring = poly[0];
          if (!ring) continue;
          for (let i = 0; i < ring.length; i += 2) {
            const [lon, lat] = ring[i];
            dots.push([(lon + 180) / 360, (90 - lat) / 180]);
          }
        }
      }
      this.dots = dots;
    } catch (e) {
      console.warn("geo load failed", e);
    }
    this._draw();
  }

  setNews(points) { this.points = points || []; this._draw(); }
  setFlights(flights) { this.flights = flights || []; this._draw(); }

  _draw() {
    const { ctx, w, h } = this;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    if (!this.dots) return;

    ctx.fillStyle = LAND;
    for (const [nx, ny] of this.dots) ctx.fillRect(nx * w - 0.6, ny * h - 0.6, 1.4, 1.4);

    ctx.fillStyle = FLIGHT;
    for (const f of this.flights) {
      const x = ((f.lon + 180) / 360) * w, y = ((90 - f.lat) / 180) * h;
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    const max = Math.max(1, ...this.points.map((p) => p.count || 1));
    for (const p of this.points) {
      const x = ((p.lon + 180) / 360) * w, y = ((90 - p.lat) / 180) * h;
      const n = (p.count || 1) / max;
      const col = n > 0.5 ? HOT : MARKER;
      const r = 3 + n * 5;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
      g.addColorStop(0, col);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
  }
}
