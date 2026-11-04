# BAB III: METODOLOGI PENELITIAN
## SISTEM KEAMANAN PARKIR MULTI-MODAL DAN DETEKSI ANOMALI PENGENDARA BERBASIS YOLOV8, SCRFD, DAN ARCFACE

### 3.1 Gambaran Umum Sistem
Sistem yang dikembangkan bertujuan untuk mengatasi potensi pencurian dan penyalahgunaan kendaraan di area parkir dengan memverifikasi korelasi antara identitas kendaraan (Nomor Polisi) dan identitas biometrik pengendara (Wajah). Pendekatan yang digunakan adalah **Multi-Modal Computer Vision** dengan mekanisme **Dynamic Baseline Profiling (Pola Kunjungan Dinamis)**.

Sistem memanfaatkan dua unit kamera:
1. **Kamera 1 (Gate In/Out - ANPR View):** Diposisikan sejajar bumper depan kendaraan untuk menangkap citra plat nomor kendaraan secara presisi.
2. **Kamera 2 (Biometric Driver View):** Diposisikan mengarah ke area kokpit/kabin pengemudi untuk menangkap citra wajah pengendara.

---

### 3.2 Diagram Alir Penelitian (*Flowchart*)
Alur sistem berjalan sebagai berikut:
1. **Tahap Akuisisi Citra:** Kamera 1 dan Kamera 2 mengambil frame secara simultan saat kendaraan terdeteksi sensor loop/kehadiran.
2. **Deteksi Objek (YOLOv8):** Model YOLOv8 melokalisasi bounding box plat nomor kendaraan pada Kamera 1 dan wajah pengendara pada Kamera 2.
3. **Pengenalan Plat Nomor (OCR):** Area plat dipotong (*crop*) dan dikonversi menjadi teks menggunakan Optical Character Recognition (PaddleOCR) dengan normalisasi regex format standar plat Indonesia.
4. **Ekstraksi Ciri Wajah (SCRFD & ArcFace):**
   - **SCRFD** mendeteksi landmark wajah (5 titik acuan mata, hidung, dan ujung bibir) serta melakukan perataan (*alignment*).
   - **ArcFace** mengekstraksi representasi vektor berdimensi 512 ($d = 512$) pada *unit hypersphere* ($\|v\| = 1$).
5. **Pemeriksaan Riwayat Kunjungan ($N$):**
   - Sistem memeriksa total kunjungan kendaraan dengan nomor polisi tersebut di database.
   - **Kondisi 1 ($N < 3$):** Kendaraan belum memenuhi ambang batas profil tetap. Wajah disimpan sebagai data pembelajaran klaster dasar (*baseline cluster*), status dinyatakan **NORMAL**, dan palang parkir dibuka.
   - **Kondisi 2 ($N \ge 3$):** Kendaraan telah memenuhi syarat identifikasi rutin. Sistem melakukan pencocokan biometrik antara vektor wajah saat ini ($v_{\text{current}}$) dengan kumpulan vektor wajah pemilik sah ($v_{\text{baseline}}$) menggunakan **Cosine Similarity**:
     $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
6. **Keputusan Sistem & Deteksi Anomali:**
   - **Jika Kemiripan $\ge \tau$ (Ambang Batas $\tau = 0.65$):** Wajah dinyatakan sesuai, status **NORMAL**, palang parkir dibuka otomatis.
   - **Jika Kemiripan $< \tau$:** Sistem mendeteksi **INDIKASI ANOMALI** (Wajah Tidak Sesuai).
     - Palang parkir otomatis terkunci (*Security Lock*).
     - Sistem memicu kamera resolusi tinggi (*High-Resolution Camera Trigger*) untuk merekam snapshot bukti forensik digital.
     - Notifikasi darurat dikirim secara real-time ke pos pemantauan keamanan/satpam parkir.

---

### 3.3 Formula dan Parameter Pengujian
* **Ambang Batas Kunjungan ($K_{\min}$):** 3 kali kunjungan.
* **Ambang Batas ArcFace ($\tau$):** 0.65 (berdasarkan pengujian ROC curve untuk meminimalkan *False Acceptance Rate* / FAR).
* **Ukuran Vektor Embedding:** $1 \times 512$ float32.
* **Format Database:** Relational Database dengan dukungan vektor (SQLite/PostgreSQL).

---

### 3.4 Rancangan Evaluasi
Kinerja sistem diukur menggunakan matriks evaluasi:
1. **Precision, Recall, dan F1-Score** deteksi anomali.
2. **False Acceptance Rate (FAR):** Probabilitas maling/orang asing lolos sebagai pemilik sah.
3. **False Rejection Rate (FRR):** Probabilitas pemilik sah salah dideteksi sebagai pencuri.
4. **Latency Pipeline (FPS & ms):** Waktu inferensi total dari deteksi hingga palang terbuka.
