# PANDUAN DEMO & JAWABAN SIDANG SKRIPSI

Dokumen ini adalah sontekan (*cheatsheet*) praktis yang disiapkan agar Anda bisa mendemonstrasikan sistem ini dengan lancar dan menjawab semua pertanyaan dosen penguji dengan percaya diri.

---

## 1. Cara Menjalankan Aplikasi di Laptop Saat Sidang

1. Buka Terminal macOS:
   ```bash
   cd ~/Projects/Personal/smart-parking-anomaly
   ./start.sh
   ```
2. Browser akan otomatis siap di:
   - **Dashboard UI Utama:** `http://localhost:3000`
   - **Dokumentasi API Swagger:** `http://localhost:8000/docs`

---

## 2. Skenario Live Demo di Depan Dosen Penguji

Gunakan tombol-tombol skenario siap pakai di bagian **"Skenario Simulasi & Uji Sidang Skripsi"**:

### Langkah 1: Tunjukkan Pembentukan Baseline (Kunjungan 1 - 3)
1. Klik tombol **`1. Kunjungan #1`**:
   - Jelaskan ke dosen: *"Pak/Bu, saat mobil pemilik sah pertama kali masuk/keluar, sistem membaca plat B 1234 WLM dan menyimpan vektor wajahnya sebagai profil awal. Status NORMAL karena belum 3 kali."*
2. Klik tombol **`2. Kunjungan #2`**:
   - Jelaskan ke dosen: *"Kunjungan kedua, sistem menambahkan variasi wajah pemilik ke database baseline."*
3. Klik tombol **`3. Kunjungan #3`**:
   - Jelaskan ke dosen: *"Kunjungan ketiga, syarat minimal 3 kali kunjungan kini TERPENUHI. Mulai kunjungan berikutnya, sistem akan melakukan proteksi biometrik aktif."*

### Langkah 2: Uji Kasus Pengemudi Sah (Kunjungan ke-4)
1. Klik tombol **`4. Uji Pemilik Sah`**:
   - Perhatikan layar: Status **NORMAL**, ArcFace Similarity tinggi (~85% - 98%), dan banner hijau **"PALANG TERBUKA (AUTO-PASS)"**.
   - Jelaskan ke dosen: *"Karena wajah pengemudi cocok dengan riwayat baseline pemilik sah, sistem otomatis membuka palang parkir."*

### Langkah 3: Uji Kasus Pencurian / Anomali (Kunjungan ke-5)
1. Klik tombol **`5. Uji Kasus Curanmor!`**:
   - **BAM!** Bunyi alarm peringatan berbunyi di dashboard.
   - Status berubah merah menyala: **"INDIKASI ANOMALI: Wajah Pengemudi Tidak Sesuai"**.
   - Banned merah: **"PALANG TERKUNCI (SECURITY LOCK)"**.
   - Kamera resolusi tinggi otomatis terpicu (**HI-RES TRIGGERED!**).
   - Klik tombol **"Lihat Foto Bukti Anomali"** untuk menampilkan bukti digital forensik wajah pelaku.
   - Jelaskan ke dosen: *"Di sini terbukti sistem mendeteksi perbedaan vektor ArcFace secara signifikan (di bawah 65%). Kendaraan langsung ditahan dan foto resolusi tinggi pelaku tersimpan otomatis sebagai barang bukti ke pos satpam."*

---

## 3. Jawaban Siap Pakai Untuk Pertanyaan Maut Dosen

### Q1: "Kenapa harus 3 kali kunjungan, kenapa bukan 1 kali saja?"
> **Jawaban:** *"Jika hanya 1 kali kunjungan, sistem tidak dapat membedakan antara tamu insidental (yang hanya sekali datang) dengan pengendara rutin. Selain itu, 3 kali kunjungan memberikan variasi citra wajah (sudut kemiringan, pencahayaan pagi/sore) sehingga klaster baseline wajah pemilik sah jauh lebih representatif dan akurat."*

### Q2: "Kenapa memilih ArcFace dibanding FaceNet atau Haar Cascade?"
> **Jawaban:** *"ArcFace menggunakan Additive Angular Margin Loss yang secara eksplisit memaksakan margin sudut diskriminatif pada unit hypersphere. Hal ini menghasilkan False Acceptance Rate (FAR) yang jauh lebih rendah dibanding model euclidean loss biasa, sehingga sangat cocok untuk sistem keamanan parkir berisiko tinggi."*

### Q3: "Bagaimana jika kendaraan tersebut milik keluarga dan dibawa oleh orang berbeda yang sah?"
> **Jawaban:** *"Sistem kami mendukung Multi-Face Baseline Profile per plat nomor. Jika dalam 3 kali kunjungan tersebut kendaraan dibawa bergantian oleh bapak dan anak, sistem menyimpan kedua klaster vektor sah tersebut. Pengemudi akan diizinkan keluar selama wajahnya cocok dengan salah satu profil terdaftar."*
