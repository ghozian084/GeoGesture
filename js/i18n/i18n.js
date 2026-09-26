import { STR, TERMS } from './strings.js';

let lang = 'id';
const listeners = new Set();

try {
  const saved = localStorage.getItem('tt-lang');
  if (saved === 'id' || saved === 'en') lang = saved;
} catch { /* penyimpanan tidak tersedia — pakai default */ }

export const getLang = () => lang;
export const other = (l = lang) => (l === 'id' ? 'en' : 'id');

export function setLang(l) {
  lang = l;
  try { localStorage.setItem('tt-lang', l); } catch { /* abaikan */ }
  document.documentElement.lang = l;
  listeners.forEach((fn) => fn(l));
}
export const onLang = (fn) => listeners.add(fn);

/** Teks antarmuka dalam bahasa aktif. */
export const t = (key) => STR[key]?.[lang] ?? key;

/** Istilah kunci dwibahasa: "Rotasi (Rotation)" / "Rotation (Rotasi)". */
export const term = (key) => {
  const e = TERMS[key];
  if (!e) return key;
  return `${e[lang]} <span class="term-alt">(${e[other()]})</span>`;
};
/** Istilah hanya dalam bahasa aktif (untuk kalimat). */
export const word = (key) => TERMS[key]?.[lang] ?? key;
