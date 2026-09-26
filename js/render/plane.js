// Renderer bidang koordinat Kartesius di <canvas>. Tidak tahu apa pun soal mode/gestur:
// cukup terima "scene" lalu gambar.

import { fmtLine } from '../geometry/describe.js';

const STYLE = {
  object: { fill: '--c-object-fill', stroke: '--c-object', dash: [] },
  image: { fill: '--c-image-fill', stroke: '--c-image', dash: [] },
  target: { fill: '--c-target-fill', stroke: '--c-target', dash: [8, 6] },
  preview: { fill: '--c-preview-fill', stroke: '--c-preview', dash: [4, 4] },
  ghost: { fill: 'transparent', stroke: '--c-muted', dash: [3, 5] },
};

export class Plane {
  constructor(canvas, { range = 8 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.range = range;
    this.scene = {};
    this.colors = {};
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
  }

  readColors() {
    const cs = getComputedStyle(this.canvas);
    const get = (v) => cs.getPropertyValue(v).trim() || '#888';
    this.colors = new Proxy({}, { get: (_, key) => (String(key).startsWith('--') ? get(key) : key) });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const size = Math.min(this.w, this.h);
    this.unit = (size - 24) / (2 * this.range);
    this.ox = this.w / 2; this.oy = this.h / 2;
    this.draw();
  }

  toScreen(p) { return { x: this.ox + p.x * this.unit, y: this.oy - p.y * this.unit }; }
  toWorld(sx, sy) { return { x: (sx - this.ox) / this.unit, y: (this.oy - sy) / this.unit }; }

  /** Koordinat ternormalisasi (0..1 terhadap kanvas) → dunia. Dipakai input gestur. */
  normToWorld(nx, ny) { return this.toWorld(nx * this.w, ny * this.h); }

  setScene(scene) { this.scene = scene; this.draw(); }

  draw() {
    if (!this.w) return;
    this.readColors();
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawGrid();
    const s = this.scene;
    if (s.rays) this.drawRays(s.rays);
    if (s.line) this.drawMirror(s.line);
    (s.layers || []).forEach((l) => this.drawPolygon(l));
    if (s.arrow) this.drawArrow(s.arrow);
    if (s.arc) this.drawArc(s.arc);
    if (s.anchor) this.drawAnchor(s.anchor);
    if (s.cursor) this.drawCursor(s.cursor);
  }

  drawGrid() {
    const { ctx, colors: C, range: R } = this;
    ctx.lineWidth = 1;
    for (let i = -R; i <= R; i++) {
      ctx.strokeStyle = i === 0 ? C['--c-axis'] : C['--c-grid'];
      ctx.lineWidth = i === 0 ? 1.6 : 1;
      let a = this.toScreen({ x: i, y: -R }), b = this.toScreen({ x: i, y: R });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      a = this.toScreen({ x: -R, y: i }); b = this.toScreen({ x: R, y: i });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // Label sumbu (setiap 2 satuan agar tidak padat di HP)
    ctx.fillStyle = C['--c-muted'];
    ctx.font = `${Math.max(9, Math.min(12, this.unit * 0.45))}px system-ui, sans-serif`;
    const step = this.unit < 22 ? 2 : 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = -R + 1; i < R; i++) {
      if (i === 0 || i % step) continue;
      const p = this.toScreen({ x: i, y: 0 });
      ctx.fillText(String(i).replace('-', '−'), p.x, p.y + 3);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let i = -R + 1; i < R; i++) {
      if (i === 0 || i % step) continue;
      const p = this.toScreen({ x: 0, y: i });
      ctx.fillText(String(i).replace('-', '−'), p.x - 4, p.y);
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    const xl = this.toScreen({ x: R, y: 0 }), yl = this.toScreen({ x: 0, y: R });
    ctx.fillText('x', xl.x - 12, xl.y - 6);
    ctx.fillText('y', yl.x + 6, yl.y + 12);
  }

  drawPolygon({ pts, kind = 'object', labels = [], pulse = false }) {
    if (!pts?.length) return;
    const { ctx, colors: C } = this;
    const st = STYLE[kind] ?? STYLE.object;
    ctx.save();
    ctx.beginPath();
    pts.forEach((p, i) => { const s = this.toScreen(p); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.closePath();
    ctx.fillStyle = st.fill === 'transparent' ? 'transparent' : C[st.fill];
    ctx.fill();
    ctx.setLineDash(st.dash);
    ctx.lineWidth = pulse ? 4 : 2.5;
    ctx.strokeStyle = C[st.stroke];
    ctx.stroke();
    ctx.setLineDash([]);
    // Titik sudut + label
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    ctx.font = `600 ${Math.max(11, Math.min(14, this.unit * 0.55))}px system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    pts.forEach((p, i) => {
      const s = this.toScreen(p);
      ctx.fillStyle = C[st.stroke];
      ctx.beginPath(); ctx.arc(s.x, s.y, 3.2, 0, Math.PI * 2); ctx.fill();
      if (labels[i]) {
        const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1;
        const lx = s.x + (dx / L) * 13, ly = s.y - (dy / L) * 13;
        ctx.lineWidth = 3; ctx.strokeStyle = C['--c-bg'];
        ctx.strokeText(labels[i], lx, ly);
        ctx.fillText(labels[i], lx, ly);
      }
    });
    ctx.restore();
  }

  drawMirror({ o, k }) {
    const { ctx, colors: C, range: R } = this;
    let a, b;
    if (o === 'v') { a = { x: k, y: -R }; b = { x: k, y: R }; }
    else if (o === 'h') { a = { x: -R, y: k }; b = { x: R, y: k }; }
    else if (o === 'd1') { a = { x: -R, y: -R + k }; b = { x: R, y: R + k }; }
    else { a = { x: -R, y: R + k }; b = { x: R, y: -R + k }; }
    const A = this.toScreen(a), B = this.toScreen(b);
    ctx.save();
    ctx.beginPath(); ctx.rect(this.toScreen({ x: -R, y: R }).x, this.toScreen({ x: -R, y: R }).y, 2 * R * this.unit, 2 * R * this.unit); ctx.clip();
    ctx.strokeStyle = C['--c-mirror']; ctx.lineWidth = 3; ctx.setLineDash([10, 5]);
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    ctx.restore();
    // Label persamaan garis
    const lab = fmtLine({ o, k });
    const pos = o === 'h' ? this.toScreen({ x: R - 2, y: k + 0.5 }) : o === 'v' ? this.toScreen({ x: k + 0.3, y: R - 0.6 }) : this.toScreen({ x: 3.5, y: o === 'd1' ? 3.5 + k + 0.6 : -3.5 + k + 0.6 });
    this.tag(lab, pos.x, pos.y, C['--c-mirror']);
  }

  drawAnchor({ pt, label }) {
    const { ctx, colors: C } = this;
    const s = this.toScreen(pt);
    ctx.save();
    ctx.strokeStyle = C['--c-anchor']; ctx.fillStyle = C['--c-bg']; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s.x - 11, s.y); ctx.lineTo(s.x + 11, s.y); ctx.moveTo(s.x, s.y - 11); ctx.lineTo(s.x, s.y + 11); ctx.stroke();
    ctx.restore();
    if (label) this.tag(label, s.x + 12, s.y + 18, C['--c-anchor']);
  }

  drawArc({ c, from, angle }) {
    if (!angle) return;
    const { ctx, colors: C } = this;
    const S = this.toScreen(c);
    const r = Math.max(18, Math.hypot(from.x - c.x, from.y - c.y) * this.unit);
    const a0 = Math.atan2(-(from.y - c.y), from.x - c.x);
    const a1 = a0 - (angle * Math.PI) / 180;
    ctx.save();
    ctx.strokeStyle = C['--c-anchor']; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(S.x, S.y, r, a0, a1, angle > 0); ctx.stroke();
    ctx.setLineDash([]);
    const end = { x: S.x + r * Math.cos(a1), y: S.y + r * Math.sin(a1) };
    const tang = a1 + (angle > 0 ? -Math.PI / 2 : Math.PI / 2);
    this.arrowHead(end, tang, C['--c-anchor']);
    ctx.restore();
    this.tag(`${Math.abs(angle)}°`, S.x + 10, S.y + 18, C['--c-anchor']);
  }

  drawRays({ c, pts }) {
    const { ctx, colors: C } = this;
    const S = this.toScreen(c);
    ctx.save();
    ctx.strokeStyle = C['--c-muted']; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
    pts.forEach((p) => { const P = this.toScreen(p); ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(P.x, P.y); ctx.stroke(); });
    ctx.restore();
  }

  drawArrow({ from, to }) {
    const { ctx, colors: C } = this;
    const A = this.toScreen(from), B = this.toScreen(to);
    if (Math.hypot(B.x - A.x, B.y - A.y) < 4) return;
    ctx.save();
    ctx.strokeStyle = C['--c-anchor']; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
    this.arrowHead(B, Math.atan2(B.y - A.y, B.x - A.x), C['--c-anchor']);
    ctx.restore();
  }

  arrowHead(p, ang, color) {
    const { ctx } = this;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 11 * Math.cos(ang - 0.4), p.y - 11 * Math.sin(ang - 0.4));
    ctx.lineTo(p.x - 11 * Math.cos(ang + 0.4), p.y - 11 * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }

  drawCursor({ pt, state }) {
    const { ctx, colors: C } = this;
    const s = this.toScreen(pt);
    const col = state === 'pinch' ? C['--c-image'] : state === 'victory' ? C['--c-anchor'] : state === 'open' ? C['--c-mirror'] : C['--c-cursor'];
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(s.x, s.y, state === 'pinch' ? 8 : 13, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  tag(text, x, y, color) {
    const { ctx, colors: C } = this;
    ctx.save();
    ctx.font = '600 12px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 10;
    ctx.fillStyle = C['--c-bg']; ctx.globalAlpha = 0.9;
    ctx.fillRect(x - 2, y - 10, w, 20);
    ctx.globalAlpha = 1; ctx.fillStyle = color; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 3, y);
    ctx.restore();
  }
}
