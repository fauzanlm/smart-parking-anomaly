# Smart Parking Multi-Modal Anomaly Detection System
> **Proyek Penelitian Skripsi: William**  
> **Teknologi:** Python (FastAPI, OpenCV, YOLOv8, SCRFD, ArcFace) + React Vite (Tailwind CSS, WebSockets)

---

## 📌 Ringkasan Proyek
Sistem keamanan area parkir cerdas berbasis kecerdasan buatan (*Artificial Intelligence*) multi-modal untuk mendeteksi potensi pencurian atau penyalahgunaan kendaraan dengan mengkorelasikan **Nomor Polisi Kendaraan (ANPR)** dan **Pengenalan Wajah Pengendara (Face Biometrics)** menggunakan metode **Dynamic Baseline Profiling (Ambang 3 Kunjungan)**.

---

## 🚀 Alur Kerja Sistem (Flowchart Skripsi)
1. **Pengumpulan Data:** Kamera 1 (Plat Nomor) & Kamera 2 (Wajah Pengendara).
2. **Deteksi Objek:** YOLOv8 untuk melokalisasi kendaraan dan pengendara.
3. **Ekstraksi Ciri Paralel:**
   - **Plat Nomor:** Optical Character Recognition (OCR) dengan pembersihan regex.
   - **Wajah:** SCRFD (deteksi & alignment 5-titik) + ArcFace (512-d unit vector embedding).
4. **Logika Profiling:**
   - **Kunjungan < 3 kali:** Status Normal (registrasi profil dasar pengemudi).
   - **Kunjungan $\ge$ 3 kali:** Pencocokan biometrik dengan Cosine Similarity.
     - **Wajah Sesuai ($\ge$ 65%):** Status Normal $\rightarrow$ Palang parkir terbuka.
     - **Wajah Berbeda (< 65%):** Indikasi Anomali $\rightarrow$ Palang terkunci $\rightarrow$ Trigger kamera resolusi tinggi $\rightarrow$ Snapshot bukti digital forensik disimpan otomatis.

---

## 💻 Panduan Menjalankan Sistem

### Persyaratan:
- Python 3.9+
- Node.js 18+

### Jalankan Semua Layanan Sekaligus:
```bash
./start.sh
```
Akses di browser:
- **Dashboard Pemantauan:** `http://localhost:3000`
- **Swagger API Docs:** `http://localhost:8000/docs`

---

## 📁 Struktur Berkas
```
smart-parking-anomaly/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # REST & WebSocket endpoints
│   │   ├── services/
│   │   │   ├── decision_engine.py  # Logika evaluasi 3x kunjungan & anomali
│   │   │   ├── face_recognizer.py  # ArcFace Cosine Similarity extractor
│   │   │   └── plate_ocr.py        # YOLOv8 ANPR & OCR
│   │   ├── database.py             # SQLite relational storage
│   │   └── config.py               # Parameter & ambang batas sistem
│   └── requirements.txt
├── frontend/                       # Dashboard Real-Time (React 18 + Vite + Tailwind)
├── docs/
│   ├── BAB_3_METODOLOGI_PENELITIAN.md
│   └── PANDUAN_SIDANG_DAN_DEMO.md
└── start.sh                        # One-click launcher
```
