// Pasang library MediaPipe & model tangan ke folder lokal (sekali saja, jalan di Windows/Mac/Linux).
//   npm install && npm run setup
// Tanpa langkah ini aplikasi tetap jalan: library dimuat dari CDN jsDelivr, model dari Google.
import { cpSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules', '@mediapipe', 'tasks-vision');
const dst = join(root, 'vendor', 'mediapipe');

if (!existsSync(src)) {
  console.error('Jalankan "npm install" dulu.');
  process.exit(1);
}
mkdirSync(join(dst, 'wasm'), { recursive: true });
cpSync(join(src, 'vision_bundle.mjs'), join(dst, 'vision_bundle.mjs'));
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  cpSync(join(src, 'wasm', f), join(dst, 'wasm', f));
}
console.log('OK: vendor/mediapipe');

const modelPath = join(root, 'models', 'hand_landmarker.task');
if (!existsSync(modelPath)) {
  const url = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
  const res = await fetch(url);
  if (!res.ok) { console.error('Gagal unduh model:', res.status); process.exit(1); }
  writeFileSync(modelPath, Buffer.from(await res.arrayBuffer()));
}
console.log('OK: models/hand_landmarker.task');
