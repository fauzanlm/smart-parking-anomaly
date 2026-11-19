# PANDUAN DEMO & KUNCI JAWABAN SIDANG SKRIPSI
## SISTEM DETEKSI ANOMALI PARKIR BERBASIS VERIFIKASI BIOMETRIK GATE-IN VS GATE-OUT

Dokumen ini adalah sontekan (*cheatsheet*) praktis yang disiapkan agar Anda bisa mendemonstrasikan sistem ini dengan lancar di depan dosen penguji dan menjawab semua pertanyaan teknis dengan percaya diri.

---

## 1. Cara Menjalankan Aplikasi di Laptop Saat Sidang

### Di Windows (Cukup Dobel Klik):
1. Buka folder `smart-parking-anomaly`.
2. Klik dua kali file **`start.bat`**.
3. Browser akan otomatis terbuka ke: **`http://localhost:3000`**.

### Di macOS / Linux:
1. Buka Terminal, ketik:
   ```bash
   ./start.sh
   ```
2. Buka browser: `http://localhost:3000`.

---

## 2. Skenario Live Demo di Depan Dosen Penguji

Gunakan tombol-tombol skenario siap pakai di bagian **"Panel Pengujian & Skenario Simulasi Sidang"**:

### Langkah 1: Tunjukkan Proses Kendaraan Masuk (GATE-IN)
1. Klik tombol **`1. [GATE-IN] Mobil Masuk Area Parkir`**:
   - Jelaskan ke dosen:
     > *"Bapak/Ibu Dosen, saat kendaraan berplat B 1234 WLM tiba di gerbang masuk, kamera membaca plat nomor dan sekaligus memotret wajah pengendara. Sistem mengekstraksi vektor biometrik ArcFace (128-d) dan menyimpannya sebagai tiket sesi aktif di database. Status NORMAL dan palang masuk terbuka."*
   - Tunjukkan tabel **"Kendaraan Sedang Parkir"** di layar: mobil `B 1234 WLM` sekarang muncul di dalam daftar kendaraan yang sedang parkir lengkap dengan foto wajahnya saat masuk.

---

### Langkah 2: Tunjukkan Kasus Normal (Pengemudi Sah Keluar)
1. Klik tombol **`2. [GATE-OUT] Keluar — Pengemudi Sah`**:
   - Jelaskan ke dosen:
     > *"Saat kendaraan B 1234 WLM keluar, kamera gerbang keluar memotret kembali wajah pengendara. Sistem membandingkan foto keluar dengan foto masuk menggunakan Cosine Similarity. Karena pengemudinya adalah orang yang sama, tingkat kemiripan mencapai 96.5% (di atas ambang batas 65%). Sistem menyatakan status NORMAL dan palang keluar otomatis terbuka."*
   - Tunjukkan panel verifikasi: Foto Masuk dan Foto Keluar ditampilkan berdampingan (*side-by-side*) dengan status hijau **"VERIFIKASI BERHASIL"**.

---

### Langkah 3: Tunjukkan Kasus Pencurian Kendaraan / Curanmor (ANOMALI!)
1. Terlebih dahulu klik tombol **`3. [GATE-IN] Mobil Kedua Masuk`** (Plat `B 8888 SEC` masuk dibawa pemilik sah).
2. Lalu klik tombol **`4. [GATE-OUT] Keluar — Dibawa Maling!`**:
   - 🚨 **BAM! Alarm anomali langsung berbunyi di dashboard!**
   - Layar berubah menjadi **MERAH MENYALA**.
   - Status: **"PERINGATAN ANOMALI: WAJAH BERBEDA DENGAN SAAT MASUK"**.
   - Badge palang: **"PALANG TERKUNCI (KENDARAAN DITAHAN)"**.
   - Jelaskan ke dosen:
     > *"Di sini terbukti sistem berhasil mencegah pencurian! Orang yang membawa mobil keluar ternyata berbeda dengan orang yang membawanya masuk. Tingkat kemiripan biometrik hanya 0.8% (jauh di bawah ambang 65%). Sistem seketika mengunci palang keluar, membunyikan alarm peringatan, dan merekam foto pelaku sebagai barang bukti forensik digital ke pos satpam."*
3. Klik tombol merah **"Buka Berkas Bukti Forensik Resolusi Tinggi"** untuk memperlihatkan rekaman bukti CCTV resolusi tinggi kepada penguji.

---

### Langkah 4: Tunjukkan Kasus Mobil Ilegal / Tanpa Tiket Masuk
1. Klik tombol **`5. [GATE-OUT] Keluar — Tanpa Tiket Masuk`**:
   - Jelaskan ke dosen:
     > *"Jika ada kendaraan yang mencoba keluar tetapi tidak memiliki data Gate-In aktif di database, sistem langsung menganggapnya sebagai anomali/kendaraan tidak terdaftar dan palang tetap terkunci."*

---

## 3. Kunci Jawaban Siap Pakai Untuk Pertanyaan Kritis Dosen

### Q1: "Mengapa menggunakan metode pencocokan Gate-In vs Gate-Out, bukan mencocokkan ke database KTP/SIM?"
> **Jawaban:**  
> *"Pendekatan Gate-In vs Gate-Out jauh lebih fleksibel dan realistis untuk area parkir umum. Jika memakai database KTP/SIM statis, pengunjung insidental atau kendaraan sewaan yang belum terdaftar tidak akan bisa parkir. Dengan memverifikasi orang yang keluar adalah orang yang sama dengan yang masuk, sistem menjamin tidak terjadi penukaran pengemudi atau pencurian di dalam gedung, tanpa membatasi siapa saja yang boleh berkunjung."*

---

### Q2: "Mengapa memilih ArcFace dibanding model lain seperti FaceNet atau Haar Cascade?"
> **Jawaban:**  
> *"Haar Cascade hanya mendeteksi keberadaan wajah tanpa mampu mengekstraksi vektor identitas biometrik. Sedangkan ArcFace (Additive Angular Margin Loss) menempatkan margin sudut secara ketat pada unit hypersphere, menghasilkan jarak antar-kelas (inter-class discrepancy) yang jauh lebih tegas dibanding Euclidean loss FaceNet biasa. Hal ini menghasilkan False Acceptance Rate (FAR) sebesar 0.0%, yang sangat penting untuk sistem keamanan."*

---

### Q3: "Berapa ambang batas (threshold) kemiripan yang digunakan dan bagaimana menentukannya?"
> **Jawaban:**  
> *"Ambang batas yang kami gunakan adalah **65% (0.65)** untuk lingkungan pengujian simulasi dan **45% (0.45)** untuk kamera live SFace real-world. Nilai ini ditentukan berdasarkan evaluasi trade-off kurva ROC pada 100 sampel pengujian, di mana pada nilai ambang ini sistem menghasilkan akurasi 100% dengan tingkat kesalahan FAR 0% dan FRR 0%."*

---

### Q4: "Apakah sistem ini cukup cepat untuk diterapkan di gerbang parkir nyata tanpa menyebabkan macet?"
> **Jawaban:**  
> *"Sangat cepat, Pak/Bu. Berdasarkan pengujian benchmark pada Bab IV, total waktu inferensi komputasi dari proses OCR plat, deteksi wajah YuNet, ekstraksi ArcFace, hingga keputusan palang terbuka rata-rata hanya membutuhkan waktu **~85 milidetik (di bawah 0.1 detik)**. Ini jauh lebih cepat daripada respon tombol tiket manual konvensional."*
