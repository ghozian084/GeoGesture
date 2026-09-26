// Manipulator: menerjemahkan "niat" (pasang jangkar, pegang, geser, lepas) menjadi
// parameter transformasi. Dipakai BERSAMA oleh input sentuh dan input gestur,
// sehingga logika matematisnya hanya ada di satu tempat.

import { identityOf, lineThrough, normAngle } from '../geometry/transforms.js';

const snapInt = (n) => Math.round(n);
const snapPt = (p) => ({ x: snapInt(p.x), y: snapInt(p.y) });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const len = (v) => Math.hypot(v.x, v.y);
const deg = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

export const K_STEP = 0.5;
export const K_MAX = 3;

export class Manipulator extends EventTarget {
  constructor() {
    super();
    this.type = 'translation';
    this.anchor = { x: 0, y: 0 };
    this.orientation = 'v';
    this.enabled = true;
    this.grab = null; // { start, base }
    this.cursor = null;
    this.t = identityOf(this.type, this.anchor);
  }

  emit() { this.dispatchEvent(new Event('change')); }

  /** Jenis transformasi yang dibutuhkan jangkar (pusat / garis). */
  get needsAnchor() { return this.type !== 'translation'; }

  setType(type) {
    this.type = type;
    this.reset();
  }

  reset() {
    this.grab = null;
    this.t = identityOf(this.type, this.anchor);
    if (this.type === 'reflection') this.t.line = lineThrough(this.orientation, this.anchor);
    this.touched = false;
    this.emit();
  }

  /** Kursor hanya memicu gambar ulang bidang, bukan panel (event terpisah). */
  setCursor(p) {
    this.cursor = p;
    this.dispatchEvent(new Event('cursor'));
  }

  /** Pasang pusat rotasi/dilatasi atau titik yang dilalui garis cermin. */
  setAnchor(p) {
    if (!this.enabled) return;
    this.anchor = snapPt(p);
    if (this.type === 'rotation' || this.type === 'enlargement') this.t = { ...this.t, c: { ...this.anchor } };
    if (this.type === 'reflection') { this.t = { ...this.t, line: lineThrough(this.orientation, this.anchor) }; this.touched = true; }
    this.emit();
  }

  setOrientation(o) {
    if (!this.enabled || this.orientation === o) return;
    this.orientation = o;
    if (this.type === 'reflection') {
      this.t = { ...this.t, line: lineThrough(o, this.anchor) };
      this.touched = true;
    }
    this.emit();
  }

  flipSign() {
    if (!this.enabled || this.type !== 'enlargement') return;
    this.t = { ...this.t, k: -this.t.k };
    this.touched = true;
    this.emit();
  }

  grabStart(p) {
    if (!this.enabled) return;
    this.grab = { start: p, base: structuredClone(this.t) };
    this.emit();
  }

  grabMove(p) {
    if (!this.enabled || !this.grab) return;
    const { start, base } = this.grab;
    let next = this.t;
    switch (this.type) {
      case 'translation': {
        const d = sub(p, start);
        next = { ...base, v: { x: base.v.x + snapInt(d.x), y: base.v.y + snapInt(d.y) } };
        break;
      }
      case 'rotation': {
        const r0 = sub(start, base.c), r1 = sub(p, base.c);
        if (len(r0) < 0.4 || len(r1) < 0.4) return; // terlalu dekat pusat — arah tidak stabil
        const delta = normAngle(deg(r1) - deg(r0));
        next = { ...base, angle: normAngle(base.angle + Math.round(delta / 90) * 90) };
        break;
      }
      case 'reflection': {
        const q = snapPt(p);
        this.anchor = q;
        next = { ...base, line: lineThrough(this.orientation, q) };
        break;
      }
      case 'enlargement': {
        const r0 = sub(start, base.c), r1 = sub(p, base.c);
        const l0 = len(r0);
        if (l0 < 0.4) return;
        // Proyeksi skalar: melewati pusat → k negatif.
        const ratio = (r1.x * r0.x + r1.y * r0.y) / (l0 * l0);
        let k = Math.round((base.k * ratio) / K_STEP) * K_STEP;
        if (Math.abs(k) < K_STEP) k = (ratio < 0 ? -1 : 1) * Math.sign(base.k || 1) * K_STEP;
        k = Math.max(-K_MAX, Math.min(K_MAX, k));
        next = { ...base, k };
        break;
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(this.t)) {
      this.t = next;
      this.touched = true;
      this.emit();
    }
  }

  grabEnd() {
    if (!this.grab) return;
    this.grab = null;
    this.emit();
  }
}
