# 📖 PANDUAN CARA MENJALANKAN SISTEM MONITORING PARKIR

Dokumen ini memandu langkah demi langkah dari awal (laptop Windows yang baru terpasang VS Code dan file hasil Download ZIP) sampai aplikasinya bisa menyala dan siap digunakan untuk pengujian atau demonstrasi.

---

## 🛠️ LANGKAH 1: Download & Install 2 Software Wajib (Hanya 1x Saja)

Karena aplikasi ini dibangun menggunakan **FastAPI (AI Engine)** dan **React Vite (Dashboard)**, Windows butuh runtime Python dan Node.js:

### 1. Python (Mesin AI & Pengolahan Citra)
* 👉 **Link Download:** [https://www.python.org/downloads/](https://www.python.org/downloads/)
* Klik tombol kuning **"Download Python 3.12"** (atau 3.10/3.11).
* Buka file installer yang baru diunduh.
* ⚠️ **PERHATIAN SANGAT PENTING:**  
  Pada tampilan paling pertama installer Python, **CENTANG KOTAK PALING BAWAH**:  
  **`[x] Add python.exe to PATH`**  
  *(Jangan sampai lupa mencentang ini! Lalu baru klik **Install Now**).*

### 2. Node.js (Mesin Tampilan Web Dashboard)
* 👉 **Link Download:** [https://nodejs.org/](https://nodejs.org/)
* Pilih kotak sebelah kiri bertuliskan **"LTS (Recommended for Most Users)"**.
* Buka filenya, klik **Next > Next > Install** sampai selesai (tidak perlu ubah settingan apapun).

### 3. Tesseract OCR (Opsional - Untuk Fitur Baca Tulisan di Kertas)
* 👉 **Link Download:** [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
* Download file `tesseract-ocr-w64-setup-5.x.x.exe`, lalu install dengan lokasi default (`C:\Program Files\Tesseract-OCR`).

---

## 📂 LANGKAH 2: Buka Folder Proyek di VS Code

1. Pastikan file ZIP yang kamu download dari GitHub sudah di-**Ekstrak** (Klik kanan file ZIP $\rightarrow$ **Extract All...**).
2. Buka aplikasi **Visual Studio Code (VS Code)**.
3. Klik menu atas: **File > Open Folder...**
4. Pilih folder hasil ekstrak: `smart-parking-anomaly`.

---

## 🚀 LANGKAH 3: Jalankan Aplikasi (Super Gampang!)

Kamu punya 2 cara untuk menjalankannya:

### CARA A: Cukup Dobel Klik (Paling Disarankan ⭐)
1. Buka folder `smart-parking-anomaly` di **File Explorer Windows**.
2. Cari file bernama **`start.bat`**.
3. **Klik dua kali (Double-Click)** file **`start.bat`** tersebut!
4. Komputer kamu akan otomatis:
   * Menyiapkan virtual environment & menginstall semua paket AI.
   * Menjalankan server Backend di port 8000 & Frontend di port 3000.
   * Membuka browsermu otomatis ke alamat: **http://localhost:3000**!

### CARA B: Lewat Terminal VS Code
1. Di VS Code kamu, buka terminal dengan menekan tombol keyboard:  
   `Ctrl + ~` (atau menu atas: **Terminal > New Terminal**).
2. Ketik perintah ini lalu tekan Enter:
   ```cmd
   .\start.bat
   ```

> ⏳ **Catatan Waktu Pertama Kali Jalan:**  
> Saat pertama kali kamu klik `start.bat`, sistem akan mendownload dependensi AI (OpenCV, Torch/ONNX, FastAPI, Tailwind). Ini butuh waktu sekitar 1–3 menit tergantung internet.  
> Untuk kali kedua dan seterusnya, aplikasi akan langsung menyala dalam waktu **3 detik**!

---

## 🌐 LANGKAH 4: Buka di Browser

Jika browser tidak terbuka otomatis, buka Google Chrome / Microsoft Edge dan ketik alamat:
* **Dashboard Monitoring:** [http://localhost:3000](http://localhost:3000)
* **Dokumentasi API Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🎬 LANGKAH 5: Cara Demo Skenario di Depan Penguji

Saat sidang skripsi / presentasi, di halaman dashboard [http://localhost:3000](http://localhost:3000), kamu tinggal klik tombol-tombol yang ada di bagian **"Panel Pengujian & Skenario Simulasi Sidang"**:

1. Klik tombol **`1. Kunjungan #1`** $\rightarrow$ Status NORMAL (Registrasi baseline wajah awal).
2. Klik tombol **`2. Kunjungan #2`** $\rightarrow$ Status NORMAL (Registrasi baseline ke-2).
3. Klik tombol **`3. Kunjungan #3`** $\rightarrow$ Status NORMAL (Syarat batas minimal 3x kunjungan terpenuhi!).
4. Klik tombol **`4. Uji Pemilik Sah`** $\rightarrow$ Status NORMAL, palang parkir terbuka hijau (*Auto-Pass*).
5. Klik tombol **`5. Uji Kasus Curanmor!`** $\rightarrow$ 🚨 **ALARM ANOMALI BUNYI!**  
   * Palang otomatis terkunci merah (*Security Lock*).
   * Kamera resolusi tinggi terpicu (*Hi-Res Triggered*).
   * Muncul tombol **"Lihat Foto Bukti Anomali"** untuk melihat bukti forensik wajah pelaku.

---

## 📄 Amunisi Naskah Skripsi / Laporan (Bisa Langsung Copy-Paste)

Buka folder **`docs/`** di dalam proyek ini:
* 📘 **`docs/BAB_3_METODOLOGI_PENELITIAN.md`** $\rightarrow$ Alur penelitian, diagram alir, dan rumus Cosine Similarity ArcFace.
* 📗 **`docs/BAB_4_HASIL_DAN_PEMBAHASAN.md`** $\rightarrow$ Tabel Black-Box Testing, Confusion Matrix 100%, FAR/FRR 0%, dan tabel latensi komputasi.
* 📙 **`docs/PANDUAN_SIDANG_DAN_DEMO.md`** $\rightarrow$ Kunci jawaban atas pertanyaan-pertanyaan kritis dosen penguji.
* 🖥️ **`docs/PANDUAN_SETUP_WINDOWS.md`** $\rightarrow$ Panduan teknis setup Windows lengkap dari nol.

---

## ⚠️ Troubleshooting (Kendala yang Sering Dialami di Windows)

* **Muncul tulisan `'python' is not recognized` saat dobel klik start.bat?**  
  👉 Artinya saat install Python, kamu lupa mencentang `Add python.exe to PATH`. Jalankan lagi installer Python tadi, pilih **Modify**, lalu centang **Add to PATH**, atau uninstall dan install ulang dengan mencentang kotaknya.
* **Kamera tidak muncul di browser?**  
  👉 Pastikan klik tombol **"Allow" / "Izinkan"** saat browser meminta izin kamera. Pastikan juga aplikasi seperti Zoom atau Camera Windows sedang tidak terbuka.
* **Cara mematikan aplikasi?**  
  👉 Cukup tutup 2 jendela hitam (Command Prompt) yang tadi muncul saat `start.bat` dijalankan.
