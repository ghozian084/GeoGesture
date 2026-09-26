// Kamera + MediaPipe Hand Landmarker. Semua diproses di perangkat (tidak ada upload).
// Library & WASM: /vendor lokal dulu (jalankan `npm run setup`), cadangan CDN jsDelivr.
// Model: /models lokal dulu, cadangan server Google.

const MP_VERSION = '1.0.1';
const LOCAL_VENDOR = new URL('../../vendor/mediapipe/', import.meta.url).href;
const CDN_VENDOR = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/`;
const LOCAL_MODEL = new URL('../../models/hand_landmarker.task', import.meta.url).href;
const REMOTE_MODEL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const DETECT_INTERVAL_MS = 33; // ±30 fps — gestur terasa responsif; perangkat lambat otomatis melewatkan frame

async function exists(url) {
  try { return (await fetch(url, { method: 'HEAD' })).ok; } catch { return false; }
}
const resolveModel = async () => ((await exists(LOCAL_MODEL)) ? LOCAL_MODEL : REMOTE_MODEL);
const resolveVendor = async () => ((await exists(`${LOCAL_VENDOR}vision_bundle.mjs`)) ? LOCAL_VENDOR : CDN_VENDOR);

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
    this.onStatus('loading');
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

    try {
      const vendor = await resolveVendor();
      const { FilesetResolver, HandLandmarker } = await import(`${vendor}vision_bundle.mjs`);
      const fileset = await FilesetResolver.forVisionTasks(`${vendor}wasm`);
      const modelAssetPath = await resolveModel();
      const make = (delegate) => HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate },
        runningMode: 'VIDEO',
        numHands: 1,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      try { this.landmarker = await make('GPU'); }
      catch { this.landmarker = await make('CPU'); } // Chromebook/HP tanpa WebGL2 yang memadai
    } catch (e) {
      this.stop();
      throw Object.assign(e, { code: 'error' });
    }
    this.onStatus('ready');
    this.resume();
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
        } catch (e) { console.warn('detect', e); }
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
