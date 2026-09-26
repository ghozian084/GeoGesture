// Mesin transformasi geometri — murni (tanpa DOM), bisa diuji di Node.
//
// Bentuk objek transformasi:
//   { type: 'translation', v: {x, y} }
//   { type: 'rotation',    c: {x, y}, angle }   // derajat, positif = berlawanan arah jarum jam
//   { type: 'reflection',  line: { o, k } }     // o: 'v' (x=k) | 'h' (y=k) | 'd1' (y=x+k) | 'd2' (y=-x+k)
//   { type: 'enlargement', c: {x, y}, k }       // k ≠ 0, boleh negatif / pecahan

export const EPS = 1e-6;
export const TYPES = ['translation', 'rotation', 'reflection', 'enlargement'];

const clean = (n) => {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-9 ? r : Math.round(n * 1e9) / 1e9;
};
const P = (x, y) => ({ x: clean(x), y: clean(y) });

/** Normalisasi sudut ke (-180, 180]. */
export function normAngle(a) {
  let r = ((a % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return r === -180 ? 180 : r;
}

function rotatePoint(p, c, angle) {
  const a = normAngle(angle);
  // Tabel pasti untuk kelipatan 90° agar tidak ada galat pembulatan.
  const exact = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], [-90]: [0, -1] };
  const [cos, sin] = exact[a] ?? [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)];
  const dx = p.x - c.x, dy = p.y - c.y;
  return P(c.x + dx * cos - dy * sin, c.y + dx * sin + dy * cos);
}

function reflectPoint(p, { o, k }) {
  switch (o) {
    case 'v': return P(2 * k - p.x, p.y);
    case 'h': return P(p.x, 2 * k - p.y);
    case 'd1': return P(p.y - k, p.x + k);   // y = x + k
    case 'd2': return P(k - p.y, k - p.x);   // y = -x + k
    default: throw new Error('Orientasi garis tidak dikenal: ' + o);
  }
}

export function applyPoint(t, p) {
  switch (t.type) {
    case 'translation': return P(p.x + t.v.x, p.y + t.v.y);
    case 'rotation': return rotatePoint(p, t.c, t.angle);
    case 'reflection': return reflectPoint(p, t.line);
    case 'enlargement': return P(t.c.x + t.k * (p.x - t.c.x), t.c.y + t.k * (p.y - t.c.y));
    default: throw new Error('Jenis transformasi tidak dikenal: ' + t?.type);
  }
}

export const apply = (t, pts) => pts.map((p) => applyPoint(t, p));
export const applyAll = (ts, pts) => ts.reduce((acc, t) => apply(t, acc), pts);

/** Titik demi titik sama (urutan penting: A→A', B→B', ...). */
export function equalOrdered(a, b, eps = EPS) {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((p, i) => Math.abs(p.x - b[i].x) < eps && Math.abs(p.y - b[i].y) < eps);
}

/** Sama sebagai himpunan titik (mengabaikan label). */
export function equalAsSet(a, b, eps = EPS) {
  if (!a || !b || a.length !== b.length) return false;
  const used = new Set();
  return a.every((p) => {
    const j = b.findIndex((q, i) => !used.has(i) && Math.abs(p.x - q.x) < eps && Math.abs(p.y - q.y) < eps);
    if (j < 0) return false;
    used.add(j);
    return true;
  });
}

/** Dua transformasi berefek sama pada bangun tertentu (mis. rotasi 180° ≡ dilatasi k = −1). */
export const sameEffect = (t1, t2, shape) => equalOrdered(apply(t1, shape), apply(t2, shape));

export function isIdentity(t) {
  switch (t.type) {
    case 'translation': return t.v.x === 0 && t.v.y === 0;
    case 'rotation': return normAngle(t.angle) === 0;
    case 'reflection': return false;
    case 'enlargement': return t.k === 1;
    default: return true;
  }
}

/** Transformasi awal (identitas) untuk tiap jenis. */
export function identityOf(type, anchor = { x: 0, y: 0 }) {
  switch (type) {
    case 'translation': return { type, v: { x: 0, y: 0 } };
    case 'rotation': return { type, c: { ...anchor }, angle: 0 };
    case 'reflection': return { type, line: { o: 'v', k: anchor.x } };
    case 'enlargement': return { type, c: { ...anchor }, k: 1 };
  }
  throw new Error('Jenis transformasi tidak dikenal: ' + type);
}

/** Garis melalui titik p dengan orientasi o → {o, k}. */
export function lineThrough(o, p) {
  switch (o) {
    case 'v': return { o, k: p.x };
    case 'h': return { o, k: p.y };
    case 'd1': return { o, k: p.y - p.x };
    case 'd2': return { o, k: p.y + p.x };
  }
  throw new Error('Orientasi garis tidak dikenal: ' + o);
}

/**
 * Bandingkan jawaban siswa dengan kunci per unsur (untuk rubrik "deskripsi lengkap").
 * Mengembalikan { equivalent, typeOk, parts: [{key, ok}] }.
 * `equivalent` = true jika efeknya sama pada bangun, walau jenisnya berbeda.
 */
export function compareParts(student, truth, shape) {
  const equivalent = sameEffect(student, truth, shape);
  const typeOk = student.type === truth.type;
  const near = (a, b) => Math.abs(a - b) < EPS;
  const ptOk = (a, b) => near(a.x, b.x) && near(a.y, b.y);
  const parts = [{ key: 'type', ok: typeOk }];
  if (typeOk) {
    switch (truth.type) {
      case 'translation':
        parts.push({ key: 'vector', ok: ptOk(student.v, truth.v) });
        break;
      case 'rotation': {
        const sa = normAngle(student.angle), ta = normAngle(truth.angle);
        parts.push({ key: 'centre', ok: ptOk(student.c, truth.c) });
        parts.push({ key: 'angle', ok: near(Math.abs(sa), Math.abs(ta)) });
        // Arah: untuk 180° arah apa pun benar.
        parts.push({ key: 'direction', ok: near(Math.abs(ta), 180) ? near(Math.abs(sa), 180) : near(sa, ta) });
        break;
      }
      case 'reflection':
        parts.push({ key: 'line', ok: student.line.o === truth.line.o && near(student.line.k, truth.line.k) });
        break;
      case 'enlargement':
        parts.push({ key: 'centre', ok: ptOk(student.c, truth.c) });
        parts.push({ key: 'factor', ok: near(student.k, truth.k) });
        break;
    }
  }
  return { equivalent, typeOk, parts };
}
