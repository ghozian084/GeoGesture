// Menghubungkan gestur yang sudah stabil ke Manipulator (niat yang sama dengan input sentuh).

import { classify, Stabilizer } from './classifier.js';

const FIST_RESET_MS = 1000;
const ANCHOR_COOLDOWN_MS = 700;
// Tangan sering "hilang" 1–3 frame di HP/Chromebook (blur, cahaya). Pegangan tidak dilepas
// selama jeda sesingkat ini supaya bayangan tidak tiba-tiba terlepas.
const LOST_GRACE_MS = 300;

export class GestureController {
  constructor(plane, manip, { onReset, onGesture } = {}) {
    this.plane = plane;
    this.manip = manip;
    this.onReset = onReset;
    this.onGesture = onGesture;
    this.stab = new Stabilizer();
    this.prev = 'none';
    this.fistSince = 0;
    this.lastAnchor = 0;
    this.lostSince = 0;
  }

  /** Dipanggil tiap frame deteksi. lm = null jika tangan tidak terlihat. */
  update(lm, aspect) {
    const now = performance.now();
    if (!lm) {
      if (!this.lostSince) this.lostSince = now;
      if (this.prev === 'pinch' && now - this.lostSince < LOST_GRACE_MS) return; // tunggu sebentar
      if (this.prev === 'pinch') this.manip.grabEnd();
      this.stab.reset();
      this.prev = 'none';
      this.manip.setCursor(null);
      this.onGesture?.({ label: 'none' });
      return;
    }
    this.lostSince = 0;
    const raw = classify(lm, aspect, this.prev === 'pinch');
    const { label, cursor, orientation, pinchLevel } = this.stab.push(raw, now);
    // Area gerak tangan dipetakan ke seluruh bidang [-R, R] (bukan seluruh kanvas).
    const R = this.plane.range;
    const p = { x: -R + cursor.x * 2 * R, y: R - cursor.y * 2 * R };
    this.cursorState = label;
    this.manip.setCursor({ ...p, state: label, pinch: pinchLevel });

    // Transisi jepit
    if (label === 'pinch' && this.prev !== 'pinch') this.manip.grabStart(p);
    else if (label === 'pinch') this.manip.grabMove(p);
    else if (this.prev === 'pinch') this.manip.grabEnd();

    // Dua jari → pasang jangkar di kursor
    if (label === 'victory' && this.prev !== 'victory' && now - this.lastAnchor > ANCHOR_COOLDOWN_MS && this.manip.needsAnchor) {
      this.manip.setAnchor(p);
      this.lastAnchor = now;
    }

    // Telapak terbuka → pilih arah garis cermin
    if (label === 'open' && orientation && this.manip.type === 'reflection') this.manip.setOrientation(orientation);

    // Kepal ditahan → ulang
    if (label === 'fist') {
      if (this.prev !== 'fist') this.fistSince = now;
      else if (this.fistSince && now - this.fistSince > FIST_RESET_MS) { this.onReset?.(); this.fistSince = 0; }
    }

    this.prev = label;
    this.onGesture?.({ label, fistProgress: label === 'fist' && this.fistSince ? Math.min(1, (now - this.fistSince) / FIST_RESET_MS) : 0 });
  }
}
