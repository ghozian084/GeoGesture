// Generator soal acak untuk mode Misi, Detektif, dan Komposisi.
// Semua parameter bulat (kecuali faktor skala) agar sesuai soal IGCSE/Kurikulum Merdeka.

import { SHAPES, PUZZLE_SHAPES, shift } from './shapes.js';
import { apply, applyAll, equalAsSet, isIdentity } from './transforms.js';

/** PRNG kecil yang bisa di-seed (soal bisa dibagikan lewat kode). */
export function rng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1));
  const pick = (arr) => arr[Math.floor(next() * arr.length)];
  return { next, int, pick };
}

// Konfigurasi level: tambah/ubah di sini tanpa menyentuh logika.
export const LEVELS = {
  1: {
    types: ['translation', 'rotation', 'reflection', 'enlargement'],
    rotationCentres: 'origin', angles: [90, -90, 180],
    lines: ['v0', 'h0'], factors: [2], enlargeCentres: 'origin', vectorMax: 4,
  },
  2: {
    types: ['translation', 'rotation', 'reflection', 'enlargement'],
    rotationCentres: 'any', angles: [90, -90, 180],
    lines: ['v', 'h'], factors: [2, 3, 0.5], enlargeCentres: 'any', vectorMax: 6,
  },
  3: {
    types: ['translation', 'rotation', 'reflection', 'enlargement'],
    rotationCentres: 'any', angles: [90, -90, 180],
    lines: ['v', 'h', 'd1', 'd2'], factors: [2, 0.5, -1, -2, -0.5], enlargeCentres: 'any', vectorMax: 6,
  },
};

const BOUND = 7; // bayangan harus muat di bidang [-7, 7]
const inView = (pts, b = BOUND) => pts.every((p) => Math.abs(p.x) <= b && Math.abs(p.y) <= b);
const snapHalfOk = (pts) => pts.every((p) => Number.isInteger(p.x * 2) && Number.isInteger(p.y * 2));

function randomTransform(r, type, L) {
  const pt = (m) => ({ x: r.int(-m, m), y: r.int(-m, m) });
  switch (type) {
    case 'translation': {
      let v;
      do v = pt(L.vectorMax); while (v.x === 0 && v.y === 0);
      return { type, v };
    }
    case 'rotation':
      return { type, c: L.rotationCentres === 'origin' ? { x: 0, y: 0 } : pt(3), angle: r.pick(L.angles) };
    case 'reflection': {
      const kind = r.pick(L.lines);
      if (kind === 'v0') return { type, line: { o: 'v', k: 0 } };
      if (kind === 'h0') return { type, line: { o: 'h', k: 0 } };
      if (kind === 'd1' || kind === 'd2') return { type, line: { o: kind, k: r.pick([0, 0, 1, -1, 2, -2]) } };
      return { type, line: { o: kind, k: r.int(-3, 3) } };
    }
    case 'enlargement':
      return { type, c: L.enlargeCentres === 'origin' ? { x: 0, y: 0 } : pt(3), k: r.pick(L.factors) };
  }
}

function placeShape(r, shapeId) {
  const base = SHAPES[shapeId].pts;
  return shift(base, r.int(-5, 3), r.int(-5, 3));
}

/**
 * Buat satu soal: { shape, transforms: [t1, (t2)], image, shapeId }.
 * steps = 1 (Misi/Detektif) atau 2 (Komposisi).
 */
export function makeProblem({ level = 1, steps = 1, seed, forceType } = {}) {
  const r = rng(seed ?? Math.floor(Math.random() * 1e9));
  const L = LEVELS[level] ?? LEVELS[1];
  for (let tries = 0; tries < 500; tries++) {
    const shapeId = r.pick(PUZZLE_SHAPES);
    const shape = placeShape(r, shapeId);
    if (!inView(shape, 6)) continue;
    const transforms = [];
    for (let s = 0; s < steps; s++) {
      const type = forceType && s === 0 ? forceType : r.pick(L.types);
      // Komposisi: hindari dua jenis sama berturut-turut agar lebih menantang.
      if (s > 0 && type === transforms[s - 1].type) { s--; continue; }
      transforms.push(randomTransform(r, type, L));
    }
    if (transforms.some(isIdentity)) continue;
    const image = applyAll(transforms, shape);
    const mid = steps > 1 ? apply(transforms[0], shape) : image;
    if (!inView(image) || !inView(mid) || !snapHalfOk(image)) continue;
    // Bayangan tidak boleh menumpuk persis dengan objek (soal tidak informatif).
    if (equalAsSet(image, shape)) continue;
    return { shapeId, shape, transforms, image, level, steps };
  }
  throw new Error('Gagal membuat soal — periksa konfigurasi LEVELS.');
}
