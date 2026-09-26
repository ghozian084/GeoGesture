# ✋ Tangan Transformasi

Media pembelajaran **geometri transformasi** (translasi, rotasi, refleksi, dilatasi) yang dikendalikan dengan **gerakan tangan** lewat kamera, atau sentuhan/mouse sebagai cadangan. Tampilan dwibahasa ID/EN dan istilah kunci IGCSE selalu ikut tampil. Dirancang untuk HP dan Chromebook siswa.

- 100% statis (HTML/CSS/JS modul), tanpa build dan tanpa server. Siap dipasang di **Vercel**.
- Deteksi tangan memakai MediaPipe Hand Landmarker **di perangkat**. Video tidak pernah dikirim ke mana pun.

## Menjalankan

```bash
# 1) (opsional, disarankan) simpan library MediaPipe + model tangan secara lokal
npm install
npm run setup

# 2) jalankan server lokal (kamera butuh http://localhost atau HTTPS)
npm run dev            # atau: python3 -m http.server 5173
# buka http://localhost:5173

# 3) uji logika (geometri + pengenal gestur)
npm test
```

Tanpa langkah 1 aplikasi tetap jalan: library dimuat dari CDN jsDelivr dan model dari `storage.googleapis.com`. Dengan langkah 1, semuanya dilayani dari Vercel sendiri (lebih cepat dan stabil di jaringan sekolah). Commit folder `vendor/` dan `models/` hasil setup ke repo.

## Deploy ke Vercel
1. Push folder ini ke repo GitHub.
2. Di Vercel: **Add New → Project** → pilih repo.
   - Framework: **Other**
   - Build command: kosongkan
   - Output directory: `.`
3. Setiap push akan membuat link preview. Buka link itu di HP untuk menguji gestur.

## Gestur (satu tangan)
| Gestur | Fungsi |
|---|---|
| ☝️ Tunjuk | Menggerakkan kursor |
| 🤏 Jepit (ibu jari + telunjuk) | Memegang dan mengubah bayangan; lepas untuk berhenti |
| ✌️ Dua jari | Memasang pusat (rotasi/dilatasi) atau titik garis cermin di posisi kursor |
| 🖐️ Telapak terbuka + miring | Memilih arah garis cermin: tegak │, rebah ─, miring kanan ╱, miring kiri ╲ |
| ✊ Kepal 1 detik | Mengulang |

Setiap jenis transformasi punya makna gerak sendiri. Logikanya sama untuk sentuhan maupun gestur:
- **Translasi:** seret; vektor = jarak seretan (dibulatkan ke bilangan bulat).
- **Rotasi:** seret *memutari* pusat; sudut terkunci tiap 90°.
- **Refleksi:** seret untuk memindahkan garis cermin.
- **Dilatasi:** seret menjauh atau mendekat pusat (k = rasio jarak, langkah ½). Menyeberangi pusat menghasilkan k negatif.

## Mode
| Mode | Isi |
|---|---|
| Jelajah | Bebas mencoba. Menampilkan deskripsi lengkap dwibahasa dan tabel koordinat A → A'. |
| Misi | Cocokkan bayangan target (hijau putus-putus) dengan satu transformasi. Urutan label harus sesuai (A → A'). |
| Detektif | Diberi objek dan bayangan, siswa menulis deskripsi lengkap lewat formulir. Dinilai dengan rubrik per unsur (jenis, pusat, sudut, arah, garis, faktor). Jawaban setara ikut diterima, misalnya rotasi 180° ≡ dilatasi k = −1. |
| Komposisi | Dua transformasi berurutan. Langkah 1 dikunci, lalu bayangannya menjadi objek langkah 2. |

Level 1–3 diatur di `js/geometry/generator.js` → `LEVELS`.

## Struktur
```
index.html
css/        base.css (token warna, terang/gelap) · layout.css (potret HP / lanskap Chromebook)
js/
  main.js               perangkai aplikasi
  core/manipulator.js   niat (jangkar, pegang, geser) → parameter transformasi  ← dipakai sentuh & gestur
  core/dom.js           helper DOM + parser angka ("1/2", "−3", "0,5")
  geometry/             transforms (rumus + rubrik) · describe (kalimat IGCSE) · shapes · generator
  render/plane.js       bidang koordinat di canvas
  input/pointer.js      sentuh/mouse
  gesture/              tracker (kamera + MediaPipe) · classifier (gestur, murni) · controller
  modes/                explore · mission · detective · composition
  i18n/                 strings (semua teks ID/EN) · i18n
vendor/mediapipe/       dibuat oleh `npm run setup` (@mediapipe/tasks-vision 1.0.1, Apache-2.0)
models/                 hand_landmarker.task (dibuat oleh `npm run setup`)
scripts/setup.mjs       penyalin library + pengunduh model
tests/                  node --test (tanpa browser)
```

## Tuning di kelas
Semua ambang gestur ada di `js/gesture/classifier.js` → `THRESHOLDS`:
- `pinchOn` / `pinchOff`: sensitivitas jepit (naikkan kalau jepit sulit terdeteksi).
- `box`: luas area gerak tangan. Perkecil rentangnya supaya cukup gerak sedikit untuk menjangkau seluruh bidang.
- `stableFrames`: naikkan kalau label gestur sering berkedip.

Laju deteksi (`DETECT_INTERVAL_MS`) ada di `js/gesture/tracker.js`.

## Lisensi pihak ketiga
MediaPipe Tasks Vision © Google, Apache License 2.0.
