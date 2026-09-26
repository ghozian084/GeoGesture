// Pengenal gestur dari 21 titik tangan MediaPipe — fungsi murni, bisa diuji tanpa kamera.
//
// Indeks titik: 0 pergelangan, 4 ujung ibu jari, 5 pangkal telunjuk, 8 ujung telunjuk,
// 9 pangkal jari tengah, 12 tengah, 16 manis, 17 pangkal kelingking, 20 kelingking.
// Semua ambang ada di THRESHOLDS agar mudah di-tuning di kelas.

export const THRESHOLDS = {
  pinchOn: 0.42,      // jarak ibu jari–telunjuk / ukuran telapak → mulai jepit
  pinchOff: 0.62,     // histeresis: lepas jepit hanya jika lebih renggang dari ini
  pinchReach: 1.15,   // ujung telunjuk harus lebih jauh dari pangkalnya × faktor ini (membedakan jepit dari kepal)
  extend: 1.12,       // jari dianggap lurus jika ujung lebih jauh dari sendi PIP × faktor ini
  stableFrames: 3,    // label harus muncul N frame berturut-turut
  pinchFrames: 2,     // jepit lebih cepat dikenali (terasa responsif saat memegang)
  // Area gerak TELAPAK yang dipetakan ke seluruh bidang (lebih kecil = cukup gerak sedikit).
  boxX: [0.22, 0.78],
  boxY: [0.18, 0.72],
  // Filter One Euro untuk kursor: minCutoff kecil = diam lebih stabil, beta besar = gerak cepat tanpa lag.
  minCutoff: 1.2,
  beta: 8,
};

const d = (a, b, ax = 1) => Math.hypot((a.x - b.x) * ax, a.y - b.y);
const TIPS = [8, 12, 16, 20];
const PIPS = [6, 10, 14, 18];
const PALM = [0, 5, 9, 13, 17];
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * @param lm 21 titik {x, y, z} ternormalisasi (koordinat kamera, BELUM dicerminkan)
 * @param aspect lebar/tinggi video (untuk sudut yang benar)
 * @param wasPinching status jepit frame sebelumnya (histeresis)
 */
export function classify(lm, aspect = 4 / 3, wasPinching = false) {
  const size = d(lm[0], lm[9], aspect) || 1e-6;
  const pinchRatio = d(lm[4], lm[8], aspect) / size;
  const ext = TIPS.map((tip, i) => d(lm[0], lm[tip], aspect) > d(lm[0], lm[PIPS[i]], aspect) * THRESHOLDS.extend);
  const [idx, mid, ring, pinky] = ext;
  const count = ext.filter(Boolean).length;

  // Jepit sah jika ibu jari menempel telunjuk DAN telunjuk tidak tergulung ke telapak (itu kepal).
  // Jari lain boleh lurus atau tertekuk — siswa tidak perlu memikirkannya.
  const pinchLimit = wasPinching ? THRESHOLDS.pinchOff : THRESHOLDS.pinchOn;
  const reach = d(lm[0], lm[8], aspect) / (d(lm[0], lm[5], aspect) || 1e-6);
  const reachLimit = wasPinching ? 1 : THRESHOLDS.pinchReach;
  const isPinch = pinchRatio < pinchLimit && reach > reachLimit;

  let label = 'other';
  if (isPinch) label = 'pinch';
  else if (count === 0) label = 'fist';
  else if (idx && !mid && !ring && !pinky) label = 'point';
  else if (idx && mid && !ring && !pinky) label = 'victory';
  else if (count >= 4) label = 'open';

  // Kursor mengikuti TENGAH TELAPAK, bukan ujung jari: menjepit, membuka dua jari, atau
  // melepas jepitan tidak menggeser kursor. Dicerminkan (seperti cermin).
  const raw = {
    x: PALM.reduce((s, i) => s + lm[i].x, 0) / PALM.length,
    y: PALM.reduce((s, i) => s + lm[i].y, 0) / PALM.length,
  };
  const [x0, x1] = THRESHOLDS.boxX;
  const [y0, y1] = THRESHOLDS.boxY;
  const cursor = { x: clamp01((1 - raw.x - x0) / (x1 - x0)), y: clamp01((raw.y - y0) / (y1 - y0)) };

  // Seberapa dekat ke jepit (0 = renggang, 1 = menjepit) — untuk umpan balik visual.
  const pinchLevel = clamp01((1 - pinchRatio) / (1 - THRESHOLDS.pinchOn));

  // Kemiringan telapak (pergelangan → pangkal jari tengah), dari sudut pandang pengguna.
  // 0° = tegak, positif = miring ke kanan.
  const dx = (lm[0].x - lm[9].x) * aspect; // sudah dicerminkan
  const dy = lm[9].y - lm[0].y;
  const roll = (Math.atan2(dx, -dy) * 180) / Math.PI;

  return { label, cursor, roll, pinchRatio, pinchLevel, count };
}

/** Kemiringan telapak → orientasi garis cermin. */
export function rollToOrientation(roll) {
  const a = Math.abs(roll);
  if (a < 22.5) return 'v';          // telapak tegak  → garis tegak x = k
  if (a > 67.5) return 'h';          // telapak rebah  → garis mendatar y = k
  return roll > 0 ? 'd1' : 'd2';     // miring kanan → y = x ; miring kiri → y = −x
}

/** Filter One Euro (Casiez dkk. 2012): halus saat diam, tanpa lag saat bergerak cepat. */
export class OneEuro {
  constructor(minCutoff = THRESHOLDS.minCutoff, beta = THRESHOLDS.beta, dCutoff = 1) {
    Object.assign(this, { minCutoff, beta, dCutoff });
    this.reset();
  }
  reset() { this.x = null; this.dx = 0; this.t = null; }
  static alpha(cutoff, dt) { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1); }
  filter(v, t) {
    if (this.x === null) { this.x = v; this.t = t; return v; }
    const dt = Math.max(1e-3, (t - this.t) / 1000);
    this.t = t;
    const dv = (v - this.x) / dt;
    this.dx += OneEuro.alpha(this.dCutoff, dt) * (dv - this.dx);
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
    this.x += OneEuro.alpha(cutoff, dt) * (v - this.x);
    return this.x;
  }
}

/** Menstabilkan label & menghaluskan kursor antar-frame. */
export class Stabilizer {
  constructor() { this.fx = new OneEuro(); this.fy = new OneEuro(); this.reset(); }
  reset() {
    this.stable = 'none'; this.candidate = null; this.count = 0; this.cursor = null;
    this.orient = null; this.orientCount = 0; this.orientCand = null;
    this.fx.reset(); this.fy.reset(); this.t = 0;
  }

  /** @param t waktu (ms); tanpa t dianggap 45 ms per frame (untuk uji). */
  push(r, t = (this.t ?? 0) + 45) {
    this.t = t;
    // Label
    const need = r.label === 'pinch' ? THRESHOLDS.pinchFrames : THRESHOLDS.stableFrames;
    if (r.label === this.stable) { this.candidate = null; this.count = 0; }
    else if (r.label === this.candidate) {
      if (++this.count >= need) { this.stable = r.label; this.candidate = null; this.count = 0; }
    } else {
      this.candidate = r.label; this.count = 1;
      if (need <= 1) { this.stable = r.label; this.candidate = null; this.count = 0; }
    }

    this.cursor = { x: this.fx.filter(r.cursor.x, t), y: this.fy.filter(r.cursor.y, t) };

    // Orientasi garis butuh 5 frame sepakat agar tidak berkedip
    const o = rollToOrientation(r.roll);
    if (o === this.orientCand) { if (++this.orientCount >= 5) this.orient = o; }
    else { this.orientCand = o; this.orientCount = 1; }

    return { label: this.stable, cursor: this.cursor, orientation: this.orient, pinchLevel: r.pinchLevel ?? 0 };
  }
}
