// Pembuat elemen kecil: h('div', {class: 'x', onclick: fn}, 'teks', child)
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}

/** Parse angka dari isian siswa: "2", "-3", "−1", "1/2", "-1/2", "0,5". */
export function parseNum(s) {
  if (s == null) return NaN;
  const v = String(s).trim().replace(/−/g, '-').replace(',', '.').replace(/\s+/g, '');
  if (!v) return NaN;
  const m = v.match(/^(-?)(\d+)\/(\d+)$/);
  if (m) return (m[1] ? -1 : 1) * (Number(m[2]) / Number(m[3]));
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/** Ganti isi elemen, mengabaikan anak null/false (replaceChildren akan menulis "null"). */
export const fill = (el, ...children) => el.replaceChildren(...children.flat().filter((c) => c != null && c !== false));
