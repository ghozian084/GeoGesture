// Jalankan: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, applyPoint, normAngle, equalOrdered, sameEffect, compareParts, lineThrough } from '../js/geometry/transforms.js';
import { describeText, fmt } from '../js/geometry/describe.js';
import { makeProblem, LEVELS } from '../js/geometry/generator.js';

const O = { x: 0, y: 0 };

test('rotasi 90° berlawanan arah jarum jam terhadap O', () => {
  assert.deepEqual(applyPoint({ type: 'rotation', c: O, angle: 90 }, { x: 1, y: 0 }), { x: 0, y: 1 });
  assert.deepEqual(applyPoint({ type: 'rotation', c: O, angle: -90 }, { x: 1, y: 0 }), { x: 0, y: -1 });
  assert.deepEqual(applyPoint({ type: 'rotation', c: { x: 1, y: 1 }, angle: 180 }, { x: 3, y: 2 }), { x: -1, y: 0 });
});

test('refleksi keempat orientasi', () => {
  const p = { x: 3, y: 1 };
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'v', k: 1 } }, p), { x: -1, y: 1 });
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'h', k: -1 } }, p), { x: 3, y: -3 });
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'd1', k: 0 } }, p), { x: 1, y: 3 });
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'd2', k: 0 } }, p), { x: -1, y: -3 });
  // y = x + 2: titik (0,0) → (-2, 2)
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'd1', k: 2 } }, O), { x: -2, y: 2 });
  // titik pada garis tetap
  assert.deepEqual(applyPoint({ type: 'reflection', line: { o: 'd2', k: 4 } }, { x: 1, y: 3 }), { x: 1, y: 3 });
});

test('dilatasi termasuk k negatif dan pecahan', () => {
  assert.deepEqual(applyPoint({ type: 'enlargement', c: { x: 1, y: 1 }, k: 2 }, { x: 2, y: 3 }), { x: 3, y: 5 });
  assert.deepEqual(applyPoint({ type: 'enlargement', c: O, k: -0.5 }, { x: 4, y: 2 }), { x: -2, y: -1 });
});

test('normAngle', () => {
  assert.equal(normAngle(270), -90);
  assert.equal(normAngle(-180), 180);
  assert.equal(normAngle(-270), 90);
});

test('lineThrough', () => {
  assert.deepEqual(lineThrough('d1', { x: 1, y: 3 }), { o: 'd1', k: 2 });
  assert.deepEqual(lineThrough('d2', { x: 1, y: 3 }), { o: 'd2', k: 4 });
});

test('kesetaraan: rotasi 180° ≡ dilatasi k = −1', () => {
  const shape = [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 2 }];
  assert.ok(sameEffect({ type: 'rotation', c: O, angle: 180 }, { type: 'enlargement', c: O, k: -1 }, shape));
});

test('rubrik compareParts', () => {
  const shape = [{ x: 1, y: 0 }, { x: 3, y: 0 }, { x: 1, y: 2 }];
  const truth = { type: 'rotation', c: { x: 1, y: 1 }, angle: -90 };
  const good = compareParts({ type: 'rotation', c: { x: 1, y: 1 }, angle: 270 }, truth, shape);
  assert.ok(good.equivalent && good.parts.every((p) => p.ok));
  const wrongDir = compareParts({ type: 'rotation', c: { x: 1, y: 1 }, angle: 90 }, truth, shape);
  assert.equal(wrongDir.equivalent, false);
  assert.deepEqual(wrongDir.parts.map((p) => p.ok), [true, true, true, false]);
  const r180 = compareParts({ type: 'rotation', c: O, angle: -180 }, { type: 'rotation', c: O, angle: 180 }, shape);
  assert.ok(r180.parts.every((p) => p.ok));
});

test('deskripsi dwibahasa', () => {
  assert.equal(describeText({ type: 'rotation', c: { x: 1, y: -2 }, angle: -90 }, 'id'), 'Rotasi 90° searah jarum jam dengan pusat (1, −2)');
  assert.equal(describeText({ type: 'rotation', c: O, angle: 90 }, 'en'), 'Rotation, 90° anticlockwise, centre (0, 0)');
  assert.equal(describeText({ type: 'reflection', line: { o: 'd2', k: -3 } }, 'en'), 'Reflection in the line y = −x − 3');
  assert.equal(describeText({ type: 'translation', v: { x: 3, y: -2 } }, 'id'), 'Translasi dengan vektor (3, −2)');
  assert.equal(describeText({ type: 'enlargement', c: O, k: -0.5 }, 'en'), 'Enlargement, scale factor −½, centre (0, 0)');
  assert.equal(fmt(2.5), '2½');
});

test('generator: 300 soal per level valid & dalam bidang', () => {
  for (const level of Object.keys(LEVELS).map(Number)) {
    for (const steps of [1, 2]) {
      for (let s = 1; s <= 150; s++) {
        const p = makeProblem({ level, steps, seed: s * 7919 + level });
        assert.equal(p.transforms.length, steps);
        const img = p.transforms.reduce((acc, t) => apply(t, acc), p.shape);
        assert.ok(equalOrdered(img, p.image));
        assert.ok(p.image.every((q) => Math.abs(q.x) <= 7 && Math.abs(q.y) <= 7));
      }
    }
  }
});

test('generator deterministik dengan seed', () => {
  assert.deepEqual(makeProblem({ level: 2, seed: 42 }), makeProblem({ level: 2, seed: 42 }));
});
