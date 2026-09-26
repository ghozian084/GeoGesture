// Semua teks antarmuka. Tambah bahasa baru dengan menambah kunci di tiap entri.
// Istilah kunci (TERMS) selalu ditampilkan dwibahasa: "Rotasi (Rotation)".

export const TERMS = {
  translation: { id: 'Translasi', en: 'Translation' },
  rotation: { id: 'Rotasi', en: 'Rotation' },
  reflection: { id: 'Refleksi', en: 'Reflection' },
  enlargement: { id: 'Dilatasi', en: 'Enlargement' },
  centre: { id: 'Pusat', en: 'Centre' },
  vector: { id: 'Vektor', en: 'Vector' },
  factor: { id: 'Faktor skala', en: 'Scale factor' },
  line: { id: 'Garis cermin', en: 'Mirror line' },
  angle: { id: 'Sudut', en: 'Angle' },
  direction: { id: 'Arah', en: 'Direction' },
  type: { id: 'Jenis', en: 'Type' },
  object: { id: 'Objek', en: 'Object' },
  image: { id: 'Bayangan', en: 'Image' },
};

export const STR = {
  appTitle: { id: 'Tangan Transformasi', en: 'Transformation Hands' },
  tagline: { id: 'Geometri transformasi dengan gerakan tangan', en: 'Geometric transformations with hand gestures' },

  // Mode
  mode_explore: { id: 'Jelajah', en: 'Explore' },
  mode_mission: { id: 'Misi', en: 'Mission' },
  mode_detective: { id: 'Detektif', en: 'Detective' },
  mode_composition: { id: 'Komposisi', en: 'Composition' },
  level: { id: 'Level', en: 'Level' },

  // Onboarding
  intro_title: { id: 'Selamat datang!', en: 'Welcome!' },
  intro_body: {
    id: 'Gerakkan bangun di bidang koordinat dengan tangan di depan kamera, atau dengan sentuhan/mouse.',
    en: 'Move shapes on the coordinate plane with your hand in front of the camera, or with touch/mouse.',
  },
  privacy: {
    id: '🔒 Privasi: video kamera diproses hanya di perangkat ini. Tidak ada gambar yang direkam atau dikirim ke mana pun.',
    en: '🔒 Privacy: camera video is processed only on this device. No images are recorded or sent anywhere.',
  },
  btn_camera: { id: '✋ Pakai kamera', en: '✋ Use camera' },
  btn_touch: { id: '👆 Sentuh / mouse saja', en: '👆 Touch / mouse only' },
  btn_close: { id: 'Tutup', en: 'Close' },
  btn_help: { id: 'Panduan gerakan', en: 'Gesture guide' },

  // Gerakan
  g_point: { id: '✋ Gerakkan tangan — kursor mengikuti telapak', en: '✋ Move your hand — the cursor follows your palm' },
  g_pinch: { id: '🤏 Jepit — pegang & ubah bayangan (cincin oranye penuh = terpegang)', en: '🤏 Pinch — grab & change the image (full orange ring = grabbed)' },
  g_victory: { id: '✌️ Dua jari — pasang pusat / garis di kursor', en: '✌️ Two fingers — place centre / line at cursor' },
  g_open: { id: '🖐️ Telapak terbuka — miringkan untuk memilih arah garis cermin', en: '🖐️ Open palm — tilt to choose the mirror line direction' },
  g_fist: { id: '✊ Kepal 1 detik — ulang', en: '✊ Fist for 1 second — reset' },
  touch_help: {
    id: 'Sentuhan: ketuk bidang untuk memasang pusat/garis, seret untuk mengubah bayangan.',
    en: 'Touch: tap the plane to place the centre/line, drag to change the image.',
  },
  per_type_help: {
    id: {
      translation: 'Seret ke mana saja: bayangan ikut bergeser sejauh seretan.',
      rotation: 'Pasang pusat, lalu seret memutari pusat. Sudut terkunci tiap 90°.',
      reflection: 'Pilih arah garis, lalu seret untuk memindahkan garis cermin.',
      enlargement: 'Pasang pusat, lalu seret menjauh/mendekat pusat. Lewati pusat untuk k negatif.',
    },
    en: {
      translation: 'Drag anywhere: the image moves by the drag distance.',
      rotation: 'Place the centre, then drag around it. The angle snaps every 90°.',
      reflection: 'Choose the line direction, then drag to move the mirror line.',
      enlargement: 'Place the centre, then drag away from/towards it. Cross the centre for negative k.',
    },
  },

  // Status kamera
  cam_loading: { id: 'Memuat pendeteksi tangan…', en: 'Loading hand detector…' },
  cam_ready: { id: 'Kamera aktif', en: 'Camera on' },
  cam_nohand: { id: 'Tangan tidak terlihat', en: 'No hand detected' },
  cam_denied: { id: 'Kamera tidak diizinkan — mode sentuh aktif.', en: 'Camera blocked — touch mode on.' },
  cam_error: { id: 'Pendeteksi gagal dimuat — mode sentuh aktif.', en: 'Detector failed to load — touch mode on.' },
  cam_insecure: { id: 'Kamera butuh HTTPS atau localhost.', en: 'Camera needs HTTPS or localhost.' },
  cam_off: { id: 'Kamera mati', en: 'Camera off' },

  // Toolbar
  reset: { id: '↺ Ulang', en: '↺ Reset' },
  shape: { id: 'Bangun', en: 'Shape' },
  line_dir: { id: 'Arah garis', en: 'Line direction' },
  flip_sign: { id: 'k ↔ −k', en: 'k ↔ −k' },

  // Panel Jelajah
  explore_title: { id: 'Deskripsi lengkap', en: 'Full description' },
  no_change: { id: 'Belum ada perubahan — ubah bayangan dengan tangan atau seretan.', en: 'No change yet — move the image with your hand or by dragging.' },
  coords: { id: 'Koordinat', en: 'Coordinates' },

  // Misi
  mission_task: { id: 'Buat bayangan (garis putus hijau) dengan SATU transformasi.', en: 'Make the image (green dashed) with ONE transformation.' },
  composition_task: { id: 'Buat bayangan hijau dengan DUA transformasi berurutan.', en: 'Make the green image with TWO transformations in a row.' },
  step: { id: 'Langkah', en: 'Step' },
  lock_step: { id: '🔒 Kunci langkah 1', en: '🔒 Lock step 1' },
  undo_step: { id: '↩ Batalkan langkah 1', en: '↩ Undo step 1' },
  success: { id: '🎉 Tepat!', en: '🎉 Correct!' },
  next: { id: 'Soal berikutnya →', en: 'Next problem →' },
  show_answer: { id: 'Lihat kunci', en: 'Show answer' },
  answer_key: { id: 'Kunci', en: 'Answer' },
  your_answer: { id: 'Jawabanmu', en: 'Your answer' },
  close_hint: { id: 'Hampir! Himpunan titiknya sama, tapi label titiknya tidak cocok (A harus ke A\').', en: 'Almost! Same set of points, but the labels don\'t match (A must go to A\').' },
  score: { id: 'Skor', en: 'Score' },

  // Detektif
  detective_task: { id: 'Tentukan transformasi TUNGGAL yang memetakan objek (biru) ke bayangan (oranye). Deskripsikan selengkapnya.', en: 'Find the SINGLE transformation mapping the object (blue) to the image (orange). Describe it fully.' },
  choose: { id: '— pilih —', en: '— choose —' },
  clockwise: { id: 'searah jarum jam', en: 'clockwise' },
  anticlockwise: { id: 'berlawanan arah jarum jam', en: 'anticlockwise' },
  try_it: { id: '👁 Uji di bidang', en: '👁 Test on plane' },
  check: { id: '✔ Periksa', en: '✔ Check' },
  rubric: { id: 'Rubrik', en: 'Rubric' },
  equivalent_note: {
    id: 'Hasilnya sama, tetapi jenis transformasinya berbeda dari kunci. Keduanya setara!',
    en: 'Same result, but a different type from the key. Both are equivalent!',
  },
  fill_all: { id: 'Lengkapi semua isian dulu.', en: 'Fill in all fields first.' },
  wrong_try: { id: 'Belum tepat. Perhatikan unsur yang bertanda ✗.', en: 'Not yet. Look at the parts marked ✗.' },
};

export const LANGS = ['id', 'en'];
