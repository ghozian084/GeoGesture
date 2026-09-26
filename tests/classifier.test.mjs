// Uji pengenal gestur dengan tangan sintetis (tanpa kamera).
import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, rollToOrientation, Stabilizer, OneEuro } from '../js/gesture/classifier.js';

/**
 * Tangan tegak sintetis. fingers = [telunjuk, tengah, manis, kelingking] lurus/tekuk.
 * pinch = ujung ibu jari ditempel ke ujung telunjuk.
 */
function hand({ fingers = [1, 1, 1, 1], pinch = false, tilt = 0 } = {}) {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const wrist = { x: 0.5, y: 0.8 };
  lm[0] = { ...wrist, z: 0 };
  const baseX = [0.46, 0.5, 0.54, 0.58];
  [5, 9, 13, 17].forEach((mcp, i) => {
    const x = baseX[i];
    lm[mcp] = { x, y: 0.6, z: 0 };
    lm[mcp + 1] = { x, y: 0.5, z: 0 };               // PIP
    if (fingers[i]) { lm[mcp + 2] = { x, y: 0.42, z: 0 }; lm[mcp + 3] = { x, y: 0.35, z: 0 }; }
    else { lm[mcp + 2] = { x, y: 0.56, z: 0 }; lm[mcp + 3] = { x, y: 0.62, z: 0 }; }
  });
  lm[1] = { x: 0.42, y: 0.75, z: 0 }; lm[2] = { x: 0.38, y: 0.68, z: 0 }; lm[3] = { x: 0.36, y: 0.62, z: 0 };
  lm[4] = pinch ? { x: lm[8].x + 0.01, y: lm[8].y + 0.01, z: 0 } : { x: 0.34, y: 0.58, z: 0 };
  if (tilt) {
    const a = (tilt * Math.PI) / 180;
    // Putar terhadap pergelangan. Kamera tidak dicerminkan: miring ke kanan pengguna = x kamera berkurang.
    return lm.map((p) => {
      const dx = p.x - wrist.x, dy = p.y - wrist.y;
      return { x: wrist.x + dx * Math.cos(a) + dy * Math.sin(a), y: wrist.y - dx * Math.sin(a) + dy * Math.cos(a), z: 0 };
    });
  }
  return lm;
}

test('label gestur dasar', () => {
  assert.equal(classify(hand({ fingers: [1, 1, 1, 1] }), 1).label, 'open');
  assert.equal(classify(hand({ fingers: [0, 0, 0, 0] }), 1).label, 'fist');
  assert.equal(classify(hand({ fingers: [1, 0, 0, 0] }), 1).label, 'point');
  assert.equal(classify(hand({ fingers: [1, 1, 0, 0] }), 1).label, 'victory');
  assert.equal(classify(hand({ fingers: [1, 0, 0, 0], pinch: true }), 1).label, 'pinch');
});

test('kursor dicerminkan: tangan di kanan kamera → kiri layar', () => {
  const lm = hand({ fingers: [1, 0, 0, 0] }).map((p) => ({ ...p, x: p.x + 0.3 }));
  assert.ok(classify(lm, 1).cursor.x < 0.3);
});

test('kemiringan telapak → orientasi garis cermin', () => {
  assert.equal(rollToOrientation(classify(hand(), 1).roll), 'v');
  assert.equal(rollToOrientation(classify(hand({ tilt: 45 }), 1).roll), 'd1');
  assert.equal(rollToOrientation(classify(hand({ tilt: -45 }), 1).roll), 'd2');
  assert.equal(rollToOrientation(classify(hand({ tilt: 85 }), 1).roll), 'h');
});

test('stabilizer butuh beberapa frame sebelum ganti label', () => {
  const s = new Stabilizer();
  const r = classify(hand({ fingers: [0, 0, 0, 0] }), 1);
  assert.equal(s.push(r).label, 'none');
  s.push(r);
  assert.equal(s.push(r).label, 'fist');
});

test('jepit tetap dikenali walau jari lain lurus (tanda OK)', () => {
  assert.equal(classify(hand({ fingers: [1, 1, 1, 1], pinch: true }), 1).label, 'pinch');
});

test('kepalan dengan ibu jari menempel ujung telunjuk tetap kepal, bukan jepit', () => {
  const lm = hand({ fingers: [0, 0, 0, 0] });
  lm[4] = { x: lm[8].x - 0.01, y: lm[8].y, z: 0 };
  assert.equal(classify(lm, 1).label, 'fist');
});

test('kursor tidak bergeser saat berganti tunjuk → jepit → dua jari', () => {
  const a = classify(hand({ fingers: [1, 0, 0, 0] }), 1).cursor;
  const b = classify(hand({ fingers: [1, 0, 0, 0], pinch: true }), 1).cursor;
  const c = classify(hand({ fingers: [1, 1, 0, 0] }), 1).cursor;
  for (const q of [b, c]) assert.ok(Math.hypot(q.x - a.x, q.y - a.y) < 1e-9);
});

test('tingkat jepit naik saat ibu jari mendekati telunjuk', () => {
  const open = classify(hand({ fingers: [1, 0, 0, 0] }), 1).pinchLevel;
  const closed = classify(hand({ fingers: [1, 0, 0, 0], pinch: true }), 1).pinchLevel;
  assert.ok(open < closed && closed === 1);
});

test('jepit dikenali lebih cepat dari gestur lain', () => {
  const s = new Stabilizer();
  const r = classify(hand({ fingers: [1, 0, 0, 0], pinch: true }), 1);
  s.push(r);
  assert.equal(s.push(r).label, 'pinch');
});

test('filter One Euro: getaran kecil diredam, gerak besar diikuti', () => {
  const f = new OneEuro();
  let t = 0, out = 0;
  for (let i = 0; i < 30; i++) out = f.filter(0.5 + (i % 2 ? 0.004 : -0.004), (t += 33));
  assert.ok(Math.abs(out - 0.5) < 0.003);
  for (let i = 0; i < 6; i++) out = f.filter(0.9, (t += 33));
  assert.ok(out > 0.85);
});
