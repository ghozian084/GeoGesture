# CLAUDE.md — konteks untuk Claude Code

## Proyek
"Tangan Transformasi": media pembelajaran geometri transformasi (kelas 9, IGCSE 0607 + Kurikulum Merdeka) berbasis gestur tangan. Pemilik: guru matematika (Ghozian). Target lomba media pembelajaran.
Perangkat siswa: **HP dan Chromebook** (kamera depan, satu tangan bebas). Deploy: GitHub → Vercel (statis).

## Aturan teknis
- **Tanpa build step, tanpa framework.** ES modules langsung di browser. Jangan tambah React/TS/bundler.
- Tanpa backend/PHP. Semua di sisi klien. Jangan kirim data kamera ke mana pun (nilai jual privasi).
- Logika matematika harus **murni** (tanpa DOM) di `js/geometry/` dan diuji di `tests/` (`npm test`).
- Input sentuh dan gestur harus lewat **`Manipulator`** (`js/core/manipulator.js`). Jangan duplikasi rumus di input.
- Semua teks UI di `js/i18n/strings.js` (ID + EN). Istilah kunci pakai `term()` supaya tampil dwibahasa.
- Konvensi sudut: positif = berlawanan arah jarum jam (anticlockwise). Garis cermin: `{o:'v'|'h'|'d1'|'d2', k}` = x=k | y=k | y=x+k | y=−x+k.
- Kamera depan dicerminkan: x = 1 − x di `classifier.js`. Jangan dibalik lagi di tempat lain.
- Warna lewat token CSS di `css/base.css` (mendukung mode gelap). Renderer membaca `--c-*`.

## Cara uji
- `npm test` → uji geometri, generator (ratusan soal), dan pengenal gestur dengan tangan sintetis.
- `npm run dev` → http://localhost:5173 (kamera jalan di localhost). `?nointro` melewati dialog pembuka, `?mode=mission` membuka mode tertentu.
- Uji gestur asli harus di perangkat nyata (HP/Chromebook) lewat preview Vercel.
- Debug di konsol: `window.__tt` → `{ state, manip, plane, setMode }`.

## Status (v0.1 — fondasi)
Library MediaPipe: `npm install && npm run setup` → vendor/ lokal; tanpa itu otomatis pakai CDN jsDelivr.
Selesai: 4 transformasi, 4 mode, 3 level, generator soal ber-seed, rubrik per unsur + kesetaraan, dwibahasa, potret/lanskap, cadangan sentuh, fallback model lokal → CDN Google.

## Backlog (urut prioritas)
1. Tuning `THRESHOLDS` dari uji coba nyata di kelas (jepit, area gerak).
2. Umpan balik haptik/suara saat sudut atau k "terkunci" ke nilai baru.
3. Mode Detektif: izinkan siswa *memperagakan* hipotesisnya dengan gestur (bukan hanya formulir).
4. Soal berbagi via seed (`?seed=123&level=2&mode=mission`) untuk ujian seragam satu kelas.
5. Rekap hasil sesi (ekspor CSV/QR ke guru) tanpa server.
6. PWA (service worker) supaya bisa offline setelah dibuka sekali.
7. Paket fisik: lembar misi, kartu tantangan, rubrik "deskripsi lengkap" (PDF/DOCX dwibahasa).
