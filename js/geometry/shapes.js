// Bangun dasar. Sengaja TIDAK simetris agar refleksi dan rotasi bisa dibedakan.
// Koordinat relatif; generator menggesernya ke posisi acak.

export const SHAPES = {
  triangle: { id: 'triangle', pts: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 2 }] },
  flag: { id: 'flag', pts: [{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 1, y: 2 }] },
  lshape: { id: 'lshape', pts: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 3 }, { x: 0, y: 3 }] },
  trapezium: { id: 'trapezium', pts: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 2, y: 2 }, { x: 1, y: 2 }] },
  // Trapesium di atas simetris — dipakai hanya untuk Jelajah, tidak untuk soal.
};

export const PUZZLE_SHAPES = ['triangle', 'flag', 'lshape'];

export const shift = (pts, dx, dy) => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));

/** Label titik: A, B, C, ... dengan aksen untuk bayangan (A', A''). */
export const labels = (n, primes = 0) =>
  Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i) + "'".repeat(primes));
