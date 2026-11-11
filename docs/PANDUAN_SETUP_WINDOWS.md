# PANDUAN LENGKAP SETUP & MENJALANKAN PROYEK DI WINDOWS

Panduan ini dibuat khusus untuk pengguna **Windows** (Windows 10 / Windows 11) yang baru pertama kali menyiapkan lingkungan pemrograman dari nol.

---

## 📥 TAHAP 1: Download & Install Software Dasar (Hanya 1x Saja)

Sebelum menjalankan aplikasi, laptop Windows kamu membutuhkan 3 aplikasi gratis berikut:

### 1. Python (Wajib)
* **Link Download:** [https://www.python.org/downloads/](https://www.python.org/downloads/) (Pilih Python 3.10 atau 3.11 atau versi terbaru).
* ⚠️ **PENTING BANGET SAAT INSTALL:**
  Pada layar pertama installer Python, **WAJIB CENTANG** kotak paling bawah:  
  `[x] Add python.exe to PATH` *(atau Add Python to environment variables)*.  
  Lalu baru klik **Install Now**. *(Jika lupa dicentang, Windows tidak akan mengenali perintah python).*

### 2. Node.js (Wajib)
* **Link Download:** [https://nodejs.org/](https://nodejs.org/)
* Pilih versi **LTS** (Recommended for Most Users).
* Jalankan installer `.msi`, klik **Next > Next > Install** sampai selesai (gunakan pengaturan default).

### 3. Git for Windows (Opsional tapi Sangat Disarankan)
* **Link Download:** [https://git-scm.com/download/win](https://git-scm.com/download/win)
* Jalankan installer, klik **Next** terus sampai selesai.  
  *(Jika tidak mau install Git, kamu bisa download proyek via tombol hijau **Code > Download ZIP** di halaman GitHub).*

### 4. Tesseract OCR (Khusus Fitur Scan Plat Kertas)
* **Link Download Installer Windows (UB Mannheim):**  
  [https://github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)  
  *(Pilih file installer bernama `tesseract-ocr-w64-setup-5.x.x.exe`)*
* Install dengan lokasi default di: `C:\Program Files\Tesseract-OCR` (sistem kode kita sudah otomatis mendeteksi folder ini).

---

## 🚀 TAHAP 2: Download Proyek ke Laptop Kamu

### Cara A (Menggunakan Git):
1. Buka **Command Prompt (CMD)** atau **Git Bash**.
2. Masuk ke folder tempat kamu ingin menyimpan proyek, misalnya `Documents`:
   ```cmd
   cd %USERPROFILE%\Documents
   git clone https://github.com/fauzanlm/smart-parking-anomaly.git
   cd smart-parking-anomaly
   ```

### Cara B (Tanpa Git / Download File ZIP):
1. Buka link GitHub: [https://github.com/fauzanlm/smart-parking-anomaly](https://github.com/fauzanlm/smart-parking-anomaly)
2. Klik tombol hijau **`<> Code`** $\rightarrow$ pilih **`Download ZIP`**.
3. Ekstrak file zip tersebut di folder laptop kamu (misalnya di `Documents\smart-parking-anomaly`).

---

## ⚡ TAHAP 3: Menjalankan Aplikasi (Super Praktis!)

Kita sudah menyediakan file script otomatis khusus Windows bernama **`start.bat`**.

### Langkahnya:
1. Buka folder `smart-parking-anomaly` di **File Explorer** Windows kamu.
2. Cari file bernama **`start.bat`**.
3. **Klik dua kali (Double-Click)** file `start.bat`.
4. Sistem akan otomatis:
   * Memeriksa instalasi Python dan Node.js.
   * Menyiapkan virtual environment (`backend\venv`) & menginstall semua paket AI (OpenCV, FastAPI, SFace, dll).
   * Menginstall modul frontend (React, Vite, Tailwind CSS).
   * Membuka dua jendela CMD (satu untuk Backend API di Port 8000, satu untuk Frontend di Port 3000).
   * Membuka browser kamu otomatis ke alamat: **[http://localhost:3000](http://localhost:3000)**!

> 💡 **Catatan:**  
> Pada saat pertama kali dijalankan, proses download library butuh waktu sekitar 1–3 menit tergantung kecepatan internet kamu. Untuk kali kedua dan seterusnya, aplikasi akan langsung menyala dalam 3 detik!

---

## 🖥️ Akses Aplikasi di Browser:
* **Dashboard Monitoring Utama:** [http://localhost:3000](http://localhost:3000)
* **Dokumentasi API Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## ❓ FAQ & Solusi Kendala di Windows

1. **Muncul pesan `'python' is not recognized as an internal or external command`?**  
   * **Penyebab:** Kamu lupa mencentang `Add python.exe to PATH` saat install Python.  
   * **Solusi:** Jalankan kembali installer Python yang tadi di-download, pilih **Modify**, lalu pastikan opsi **Add to PATH** dicentang, atau uninstall lalu install ulang dengan mencentang kotak tersebut.

2. **Kamera tidak muncul di browser?**  
   * Pastikan kamu klik tombol **"Allow" / "Izinkan"** saat browser Google Chrome / Edge meminta izin akses kamera.
   * Pastikan tidak ada aplikasi lain (seperti Zoom, Teams, atau Kamera bawaan Windows) yang sedang memakai webcam.

3. **Cara mematikan aplikasi?**  
   * Cukup tutup kedua jendela CMD hitam (Backend & Frontend) yang terbuka di taskbar kamu.
