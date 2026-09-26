// Pengenal gestur dari 21 titik tangan MediaPipe — fungsi murni, bisa diuji tanpa kamera.
//
// Indeks titik: 0 pergelangan, 4 ujung ibu jari, 8 ujung telunjuk, 12 tengah, 16 manis, 20 kelingking.
// Semua ambang ada di THRESHOLDS agar mudah di-tuning di kelas.

export const THRESHOLDS = {
  pinchOn: 0.32,      // jarak ibu jari–telunjuk / ukuran tangan → mulai jepit
  pinchOff: 0.48,     // histeresis: lepas jepit hanya jika lebih renggang dari ini
  extend: 1.12,       // jari dianggap lurus jika ujung lebih jauh dari sendi PIP × faktor ini
  stableFrames: 3,    // label harus muncul N frame berturut-turut
  box: [0.12, 0.88],  // area gerak tangan yang dipetakan ke seluruh bidang (lebih kecil = lebih sedikit gerak)
};

const d = (a, b, ax = 1) => Math.hypot((a.x - b.x) * ax, a.y - b.y);
const TIPS = [8, 12, 16, 20];
const PIPS = [6, 10, 14, 18];

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

  let label = 'other';
  const pinchLimit = wasPinching ? THRESHOLDS.pinchOff : THRESHOLDS.pinchOn;
  if (pinchRatio < pinchLimit && count < 4) label = 'pinch';
  else if (count === 0) label = 'fist';
  else if (idx && !mid && !ring && !pinky) label = 'point';
  else if (idx && mid && !ring && !pinky) label = 'victory';
  else if (count >= 4) label = 'open';

  // Kursor: titik tengah jepitan saat jepit, ujung telunjuk selain itu. Dicerminkan (seperti cermin).
  const raw = label === 'pinch'
    ? { x: (lm[4].x + lm[8].x) / 2, y: (lm[4].y + lm[8].y) / 2 }
    : { x: lm[8].x, y: lm[8].y };
  const [lo, hi] = THRESHOLDS.box;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const cursor = { x: clamp01((1 - raw.x - lo) / (hi - lo)), y: clamp01((raw.y - lo) / (hi - lo)) };

  // Kemiringan telapak (pergelangan → pangkal jari tengah), dari sudut pandang pengguna.
  // 0° = tegak, positif = miring ke kanan.
  const dx = (lm[0].x - lm[9].x) * aspect; // sudah dicerminkan
  const dy = lm[9].y - lm[0].y;
  const roll = (Math.atan2(dx, -dy) * 180) / Math.PI;

  return { label, cursor, roll, pinchRatio, count };
}

/** Kemiringan telapak → orientasi garis cermin. */
export function rollToOrientation(roll) {
  const a = Math.abs(roll);
  if (a < 22.5) return 'v';          // telapak tegak  → garis tegak x = k
  if (a > 67.5) return 'h';          // telapak rebah  → garis mendatar y = k
  return roll > 0 ? 'd1' : 'd2';     // miring kanan → y = x ; miring kiri → y = −x
}

/** Menstabilkan label & menghaluskan kursor antar-frame. */
export class Stabilizer {
  constructor() { this.reset(); }
  reset() { this.stable = 'none'; this.candidate = null; this.count = 0; this.cursor = null; this.orient = null; this.orientCount = 0; this.orientCand = null; }

  push(r) {
    // Label
    if (r.label === this.stable) { this.candidate = null; this.count = 0; }
    else if (r.label === this.candidate) {
      if (++this.count >= THRESHOLDS.stableFrames) { this.stable = r.label; this.candidate = null; this.count = 0; }
    } else { this.candidate = r.label; this.count = 1; }

    // Kursor: EMA adaptif (cepat saat bergerak cepat, halus saat diam)
    if (!this.cursor) this.cursor = { ...r.cursor };
    else {
      const speed = Math.hypot(r.cursor.x - this.cursor.x, r.cursor.y - this.cursor.y);
      const a = Math.min(0.85, 0.3 + speed * 6);
      this.cursor = { x: this.cursor.x + a * (r.cursor.x - this.cursor.x), y: this.cursor.y + a * (r.cursor.y - this.cursor.y) };
    }

    // Orientasi garis butuh 5 frame sepakat agar tidak berkedip
    const o = rollToOrientation(r.roll);
    if (o === this.orientCand) { if (++this.orientCount >= 5) this.orient = o; }
    else { this.orientCand = o; this.orientCount = 1; }

    return { label: this.stable, cursor: this.cursor, orientation: this.orient };
  }
}
