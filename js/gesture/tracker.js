// Kamera + MediaPipe Hand Landmarker. Semua diproses di perangkat (tidak ada upload).
// Library & WASM: /vendor lokal dulu (jalankan `npm run setup`), cadangan CDN jsDelivr.
// Model: /models lokal dulu, cadangan server Google.

const MP_VERSION = '1.0.1';
const LOCAL_VENDOR = new URL('../../vendor/mediapipe/', import.meta.url).href;
const CDN_VENDOR = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/`;
const LOCAL_MODEL = new URL('../../models/hand_landmarker.task', import.meta.url).href;
const REMOTE_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const DETECT_INTERVAL_MS = 33; // ±30 fps — gestur terasa responsif; perangkat lambat otomatis melewatkan frame

// Batas waktu tiap tahap. Tanpa ini, MediaPipe bisa "menggantung" selamanya di sebagian
// laptop/HP (mis. GPU bermasalah) dan siswa hanya melihat "Memuat…" tanpa akhir.
const GPU_INIT_TIMEOUT_MS = 10000;
const CPU_INIT_TIMEOUT_MS = 25000;
const LIB_TIMEOUT_MS = 30000;
const DOWNLOAD_STALL_MS = 20000; // unduhan dianggap macet jika tidak ada data selama ini
const MAX_DETECT_ERRORS = 15;

const forceCpu = () => new URLSearchParams(location.search).has('cpu');

function withTimeout(promise, ms, stage) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error(`timeout: ${stage}`), { stage })), ms); }),
  ]).finally(() => clearTimeout(timer));
}

async function exists(url) {
  try { return (await withTimeout(fetch(url, { method: 'HEAD', cache: 'no-store' }), 5000, 'head')).ok; } catch { return false; }
}

/** Unduh model sebagai byte dengan laporan kemajuan (%), gagal jika macet. */
async function download(url, onProgress) {
  const ctrl = new AbortController();
  let stall = setTimeout(() => ctrl.abort(), DOWNLOAD_STALL_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const total = Number(res.headers.get('content-length')) || 0;
    if (!res.body) return new Uint8Array(await res.arrayBuffer());
    const reader = res.body.getReader();
    const chunks = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value); got += value.length;
      clearTimeout(stall); stall = setTimeout(() => ctrl.abort(), DOWNLOAD_STALL_MS);
      if (total) onProgress(Math.min(99, Math.round((got / total) * 100)));
    }
    const out = new Uint8Array(got);
    let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  } finally { clearTimeout(stall); }
}

export class HandTracker {
  constructor(video, { onResults, onStatus }) {
    this.video = video;
    this.onResults = onResults;
    this.onStatus = onStatus;
    this.running = false;
    this.last = 0;
    this.stream = null;
    this.landmarker = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.stream) this.resume();
    });
  }

  async start() {
    if (!window.isSecureContext) throw Object.assign(new Error('insecure'), { code: 'insecure' });
    this.onStatus('loading', { stage: 'camera' });
    // Minta kamera lebih dulu agar izin muncul cepat.
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } },
        audio: false,
      });
    } catch (e) {
      throw Object.assign(e, { code: 'denied' });
    }
    this.video.srcObject = this.stream;
    await this.video.play();

    let stage = 'lib';
    try {
      // 1) Library: lokal dulu, jika gagal dimuat → CDN.
      this.onStatus('loading', { stage });
      let vendor = (await exists(`${LOCAL_VENDOR}vision_bundle.mjs`)) ? LOCAL_VENDOR : CDN_VENDOR;
      let mod;
      try { mod = await withTimeout(import(`${vendor}vision_bundle.mjs`), LIB_TIMEOUT_MS, stage); }
      catch (e) {
        if (vendor === CDN_VENDOR) throw e;
        console.warn('library lokal gagal, pakai CDN', e);
        vendor = CDN_VENDOR;
        mod = await withTimeout(import(`${vendor}vision_bundle.mjs`), LIB_TIMEOUT_MS, stage);
      }
      const { FilesetResolver, HandLandmarker } = mod;
      const fileset = await FilesetResolver.forVisionTasks(`${vendor}wasm`);
      // WASM (±11 MB) diunduh di sini dengan kemajuan, supaya tahap inisialisasi di bawah
      // tidak kehabisan waktu hanya karena jaringan sekolah lambat.
      stage = 'wasm';
      this.onStatus('loading', { stage, pct: 0 });
      const wasm = await download(fileset.wasmBinaryPath, (pct) => this.onStatus('loading', { stage, pct }));
      fileset.wasmBinaryPath = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));

      // 2) Model: unduh sendiri supaya kemajuan (%) terlihat. Lokal dulu, cadangan Google.
      stage = 'model';
      this.onStatus('loading', { stage, pct: 0 });
      const onProgress = (pct) => this.onStatus('loading', { stage, pct });
      let model;
      try { model = await download(LOCAL_MODEL, onProgress); }
      catch (e) {
        console.warn('model lokal gagal, pakai server Google', e);
        model = await download(REMOTE_MODEL, onProgress);
      }

      // 3) Pendeteksi: GPU dulu (cepat), jika gagal ATAU macet → CPU.
      const make = (delegate) => HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: model, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      this.makeCpu = () => withTimeout(make('CPU'), CPU_INIT_TIMEOUT_MS, 'cpu');
      this.delegate = 'CPU';
      if (!forceCpu()) {
        stage = 'gpu';
        this.onStatus('loading', { stage });
        try { this.landmarker = await withTimeout(make('GPU'), GPU_INIT_TIMEOUT_MS, stage); this.delegate = 'GPU'; }
        catch (e) { console.warn('GPU gagal/macet, pakai CPU', e); }
      }
      if (!this.landmarker) {
        stage = 'cpu';
        this.onStatus('loading', { stage });
        this.landmarker = await this.makeCpu();
      }
    } catch (e) {
      console.error('pendeteksi tangan gagal pada tahap', stage, e);
      this.stop();
      throw Object.assign(e, { code: 'error', stage });
    }
    console.info('pendeteksi tangan siap:', this.delegate);
    this.errors = 0;
    this.onStatus('ready', { delegate: this.delegate });
    this.resume();
  }

  /** GPU sering gagal saat frame pertama di perangkat tertentu → ganti ke CPU sekali. */
  async fallbackToCpu() {
    if (this.switching) return;
    this.switching = true;
    this.pause();
    try {
      this.onStatus('loading', { stage: 'cpu' });
      this.landmarker?.close?.();
      this.landmarker = await this.makeCpu();
      this.delegate = 'CPU';
      this.errors = 0;
      this.onStatus('ready', { delegate: 'CPU' });
      this.resume();
    } catch (e) {
      console.error('CPU juga gagal', e);
      this.stop();
      this.onStatus('error', { stage: 'cpu' });
    } finally { this.switching = false; }
  }

  resume() {
    if (this.running || !this.landmarker) return;
    this.running = true;
    const loop = (now) => {
      if (!this.running) return;
      if (now - this.last >= DETECT_INTERVAL_MS && this.video.readyState >= 2) {
        this.last = now;
        try {
          const res = this.landmarker.detectForVideo(this.video, now);
          const aspect = (this.video.videoWidth || 4) / (this.video.videoHeight || 3);
          this.onResults(res.landmarks?.[0] ?? null, aspect);
          this.errors = 0;
        } catch (e) {
          console.warn('detect', e);
          if (++this.errors >= MAX_DETECT_ERRORS) {
            if (this.delegate === 'GPU') this.fallbackToCpu();
            else { this.stop(); this.onStatus('error', { stage: 'detect' }); }
            return;
          }
        }
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() { this.running = false; cancelAnimationFrame(this.raf); }

  stop() {
    this.pause();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.video.srcObject = null;
    this.landmarker?.close?.();
    this.landmarker = null;
    this.onStatus('off');
  }
}

/** Gambar kerangka tangan di atas video pratinjau. */
const BONES = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
export function drawSkeleton(canvas, lm, color = '#22c55e') {
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth, h = canvas.height = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (!lm) return;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
  // Dicerminkan agar cocok dengan video yang ditampilkan seperti cermin.
  const X = (p) => (1 - p.x) * w, Y = (p) => p.y * h;
  BONES.forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(X(lm[a]), Y(lm[a])); ctx.lineTo(X(lm[b]), Y(lm[b])); ctx.stroke(); });
  lm.forEach((p) => { ctx.beginPath(); ctx.arc(X(p), Y(p), 2, 0, Math.PI * 2); ctx.fill(); });
}
