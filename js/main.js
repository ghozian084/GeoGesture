// Titik masuk aplikasi: merangkai bidang, manipulator, input (sentuh + gestur), mode, dan UI.
import { Plane } from './render/plane.js';
import { Manipulator } from './core/manipulator.js';
import { attachPointer } from './input/pointer.js';
import { HandTracker, drawSkeleton } from './gesture/tracker.js';
import { GestureController } from './gesture/controller.js';
import { apply } from './geometry/transforms.js';
import { labels } from './geometry/shapes.js';
import { fmtPt } from './geometry/describe.js';
import { t, term, word, getLang, setLang, onLang, other } from './i18n/i18n.js';
import { explore } from './modes/explore.js';
import { mission } from './modes/mission.js';
import { detective } from './modes/detective.js';
import { composition } from './modes/composition.js';

const MODES = { explore, mission, detective, composition };
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// ---------- Inti ----------
const plane = new Plane($('#plane'), { range: 8 });
const manip = new Manipulator();
const state = { mode: null, level: 1, object: [], primes: 0, extras: [], ok: 0, tries: 0 };

const ctx = {
  manip,
  t, term, word,
  get lang() { return getLang(); },
  get other() { return other(); },
  get level() { return state.level; },
  get object() { return state.object; },
  setObject(pts, primes = 0) { state.object = pts; state.primes = primes; },
  setExtras(layers) { state.extras = layers; redraw(); },
  score(ok) { state.tries++; if (ok) state.ok++; $('#score').textContent = `✓ ${state.ok}/${state.tries}`; },
  celebrate,
  rerender: () => renderPanel(),
};

// ---------- Scene ----------
function buildScene() {
  const n = state.object.length;
  const layers = [...state.extras];
  layers.push({ pts: state.object, kind: 'object', labels: labels(n, state.primes) });
  const scene = { layers };
  const mode = MODES[state.mode];
  if (mode?.usesManipulator) {
    const tr = manip.t;
    const showImg = manip.touched;
    const img = showImg ? apply(tr, state.object) : null;
    if (img) layers.push({ pts: img, kind: 'image', labels: labels(n, state.primes + 1), pulse: !!manip.grab });
    switch (manip.type) {
      case 'translation':
        if (img) scene.arrow = { from: state.object[0], to: img[0] };
        break;
      case 'rotation':
        scene.anchor = { pt: tr.c, label: fmtPt(tr.c) };
        if (img) scene.arc = { c: tr.c, from: state.object[0], angle: tr.angle };
        break;
      case 'reflection':
        scene.line = tr.line;
        break;
      case 'enlargement':
        scene.anchor = { pt: tr.c, label: fmtPt(tr.c) };
        if (img) scene.rays = { c: tr.c, pts: [...state.object, ...img] };
        break;
    }
  }
  if (manip.cursor) scene.cursor = { pt: manip.cursor, state: manip.cursor.state || 'point', pinch: manip.cursor.pinch || 0 };
  return scene;
}

let rafPending = false;
function redraw() {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => { rafPending = false; plane.setScene(buildScene()); });
}

function renderPanel() {
  MODES[state.mode]?.render($('#panel'));
}

manip.addEventListener('change', () => {
  MODES[state.mode]?.onChange?.();
  syncToolbar();
  renderPanel();
  redraw();
});
manip.addEventListener('cursor', redraw);

// ---------- Mode & toolbar ----------
function setMode(id) {
  state.mode = id;
  state.extras = [];
  $$('[data-mode]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.mode === id)));
  const m = MODES[id];
  $('#toolbar').hidden = !m.usesManipulator;
  $('#shapePick').hidden = !m.showShapePicker;
  $('.level-pick').classList.toggle('dim', id === 'explore');
  m.mount(ctx);
  syncToolbar();
  renderPanel();
  redraw();
}

function syncToolbar() {
  $$('[data-type]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.type === manip.type)));
  $('#orientBtns').hidden = manip.type !== 'reflection';
  $$('[data-o]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.o === manip.orientation)));
  $('#btnSign').hidden = manip.type !== 'enlargement';
}

$$('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
$$('[data-type]').forEach((b) => b.addEventListener('click', () => manip.setType(b.dataset.type)));
$$('[data-o]').forEach((b) => b.addEventListener('click', () => manip.setOrientation(b.dataset.o)));
$('#btnSign').addEventListener('click', () => manip.flipSign());
$('#btnReset').addEventListener('click', () => { manip.enabled = MODES[state.mode].usesManipulator && !MODES[state.mode].solved; manip.reset(); });
$('#shapeSel').addEventListener('change', (e) => explore.setShape(e.target.value));
$('#level').addEventListener('change', (e) => { state.level = Number(e.target.value); if (state.mode !== 'explore') setMode(state.mode); });

// ---------- Input sentuh ----------
attachPointer($('#plane'), plane, manip, {
  onHover: (p) => { $('#readout').textContent = p ? fmtPt({ x: Math.round(p.x), y: Math.round(p.y) }) : ''; },
});

// ---------- Kamera & gestur ----------
const gestures = new GestureController(plane, manip, {
  onReset: () => { if (MODES[state.mode].usesManipulator) manip.reset(); },
  onGesture: ({ label, fistProgress }) => {
    const icons = { none: '—', point: '☝️', pinch: '🤏', victory: '✌️', open: '🖐️', fist: '✊', other: '·' };
    $('#gestureChip').textContent = icons[label] ?? '·';
    $('#fistBar').style.width = `${Math.round((fistProgress || 0) * 100)}%`;
  },
});
let camStatusKey = null;
const tracker = new HandTracker($('#video'), {
  onResults: (lm, aspect) => {
    drawSkeleton($('#skeleton'), lm);
    gestures.update(lm, aspect);
    showCamStatus(lm ? null : 'cam_nohand', true);
  },
  onStatus: (s, info = {}) => {
    const on = s === 'ready' || s === 'loading';
    $('#camPip').hidden = !on;
    $('#btnCam').setAttribute('aria-pressed', String(s === 'ready'));
    if (s === 'loading') {
      const pct = info.pct != null ? ` ${info.pct}%` : '';
      showCamStatus(info.stage ? `cam_stage_${info.stage}` : 'cam_loading', false, pct);
    } else if (s === 'error') showCamError(info.stage);
    else showCamStatus(null);
  },
});

function showCamStatus(key, soft = false, suffix = '') {
  if (soft && camStatusKey && camStatusKey !== 'cam_nohand') return;
  camStatusKey = key;
  const el = $('#camStatus');
  el.hidden = !key;
  if (key) el.textContent = t(key) + suffix;
}

/** Pesan gagal yang menyebut tahapnya, supaya guru bisa melaporkan penyebabnya. */
function showCamError(stage, key = 'cam_error') {
  $('#camPip').hidden = true;
  showCamStatus(key, false, stage ? ` (${t('cam_error_at')}: ${stage})` : '');
  setTimeout(() => camStatusKey === key && showCamStatus(null), 10000);
}

async function startCamera() {
  try {
    await tracker.start();
  } catch (e) {
    const key = e.code === 'insecure' ? 'cam_insecure' : e.code === 'denied' ? 'cam_denied' : 'cam_error';
    console.warn('camera', e);
    showCamError(key === 'cam_error' ? e.stage : null, key);
  }
}
$('#btnCam').addEventListener('click', () => (tracker.stream ? tracker.stop() : startCamera()));

// ---------- Bahasa ----------
function applyI18n() {
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-term]').forEach((el) => { el.innerHTML = term(el.dataset.term); });
  $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === getLang())));
  $('#legend').replaceChildren(...['g_point', 'g_pinch', 'g_victory', 'g_open', 'g_fist'].map((k) => {
    const li = document.createElement('li'); li.textContent = t(k); return li;
  }));
  document.title = t('appTitle');
  renderPanel();
}
$$('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
onLang(applyI18n);

// ---------- Onboarding ----------
const intro = $('#intro');
$('#btnHelp').addEventListener('click', () => intro.showModal());
$('#introCam').addEventListener('click', () => { intro.close(); if (!tracker.stream) startCamera(); });
$('#introTouch').addEventListener('click', () => intro.close());

// ---------- Efek sukses ----------
function celebrate() {
  const box = $('#confetti');
  box.replaceChildren();
  const colors = ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899'];
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('i');
    s.style.left = `${Math.random() * 100}%`;
    s.style.background = colors[i % colors.length];
    s.style.animationDelay = `${Math.random() * 0.3}s`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 200}px`);
    box.append(s);
  }
  box.classList.remove('go'); void box.offsetWidth; box.classList.add('go');
  navigator.vibrate?.(60);
}

// Tema berubah → gambar ulang dengan warna baru
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);

// ---------- Mulai ----------
setLang(getLang());
setMode('explore');
const params = new URLSearchParams(location.search);
if (params.has('mode') && MODES[params.get('mode')]) setMode(params.get('mode'));
if (!params.has('nointro')) intro.showModal();

// Untuk debugging di konsol / uji otomatis
window.__tt = { state, manip, plane, setMode };
