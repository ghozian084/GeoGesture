// Kalimat "deskripsi lengkap" transformasi, gaya soal IGCSE ("Describe fully the single transformation").
import { normAngle } from './transforms.js';

const MINUS = '−';
const FRAC = { 0.5: '½', 0.25: '¼', 0.75: '¾' };

/** Format angka: bilangan bulat, pecahan ½/¼/¾, tanda minus tipografis. */
export function fmt(n) {
  const neg = n < 0;
  const a = Math.abs(n);
  const whole = Math.floor(a + 1e-9);
  const frac = Math.round((a - whole) * 100) / 100;
  let s;
  if (frac === 0) s = String(whole);
  else if (FRAC[frac]) s = (whole ? whole : '') + FRAC[frac];
  else s = String(Math.round(a * 100) / 100);
  return (neg ? MINUS : '') + s;
}

export const fmtPt = (p) => `(${fmt(p.x)}, ${fmt(p.y)})`;

export function fmtLine({ o, k }) {
  const tail = k === 0 ? '' : k > 0 ? ` + ${fmt(k)}` : ` ${MINUS} ${fmt(-k)}`;
  switch (o) {
    case 'v': return `x = ${fmt(k)}`;
    case 'h': return `y = ${fmt(k)}`;
    case 'd1': return `y = x${tail}`;
    case 'd2': return `y = ${MINUS}x${tail}`;
  }
  return '?';
}

export const colVec = (v) =>
  `<span class="colvec" aria-label="(${fmt(v.x)}, ${fmt(v.y)})"><span>${fmt(v.x)}</span><span>${fmt(v.y)}</span></span>`;

/** HTML deskripsi transformasi dalam bahasa `lang` ('id' | 'en'). */
export function describe(t, lang = 'id') {
  const id = lang === 'id';
  switch (t.type) {
    case 'translation':
      return id ? `<b>Translasi</b> dengan vektor ${colVec(t.v)}` : `<b>Translation</b> by the vector ${colVec(t.v)}`;
    case 'rotation': {
      const a = normAngle(t.angle);
      const deg = Math.abs(a);
      let dir = '';
      if (deg !== 180 && deg !== 0) {
        dir = a > 0 ? (id ? ' berlawanan arah jarum jam' : ' anticlockwise') : (id ? ' searah jarum jam' : ' clockwise');
      }
      return id
        ? `<b>Rotasi</b> ${deg}°${dir} dengan pusat ${fmtPt(t.c)}`
        : `<b>Rotation</b>, ${deg}°${dir}, centre ${fmtPt(t.c)}`;
    }
    case 'reflection':
      return id ? `<b>Refleksi</b> terhadap garis ${fmtLine(t.line)}` : `<b>Reflection</b> in the line ${fmtLine(t.line)}`;
    case 'enlargement':
      return id
        ? `<b>Dilatasi</b> dengan faktor skala ${fmt(t.k)}, pusat ${fmtPt(t.c)}`
        : `<b>Enlargement</b>, scale factor ${fmt(t.k)}, centre ${fmtPt(t.c)}`;
  }
  return '';
}

/** Versi teks polos (untuk aria-live / ekspor). */
export const describeText = (t, lang) =>
  describe(t, lang).replace(/<span class="colvec" aria-label="([^"]+)">.*?<\/span><\/span>/g, '$1').replace(/<[^>]+>/g, '');
