# BAB III: METODOLOGI PENELITIAN
## SISTEM KEAMANAN PARKIR MULTI-MODAL DAN DETEKSI ANOMALI PENGENDARA BERBASIS VERIFIKASI BIOMETRIK GATE-IN VS GATE-OUT

### 3.1 Gambaran Umum Sistem
Sistem yang dikembangkan bertujuan untuk mengatasi potensi tindak pencurian dan penukaran kendaraan di area parkir komersial/gedung dengan memverifikasi korelasi identitas antara kendaraan (Nomor Polisi) dan biometrik pengendara (Wajah) secara *real-time*.

Arsitektur sistem menggunakan pendekatan **1-to-1 Session-Based Verification (Gate-In vs Gate-Out)**, di mana biometrik wajah pengemudi saat kendaraan masuk dicocokkan secara langsung dengan wajah pengemudi saat kendaraan keluar:
1. **Pos Gerbang Masuk (GATE-IN):** Kamera merekam plat nomor dan wajah pengendara yang membawa kendaraan masuk ke area parkir. Data ini disimpan sebagai sesi parkir aktif (*active ticket session*).
2. **Pos Gerbang Keluar (GATE-OUT):** Kamera merekam kembali plat nomor dan wajah pengendara yang akan membawa kendaraan keluar. Sistem mencocokkan wajah pengendara saat keluar dengan foto dan vektor biometrik saat masuk menggunakan **ArcFace / SFace Cosine Similarity**.

---

### 3.2 Diagram Alir Sistem (*Flowchart Alur Baru*)

Alur kerja sistem terbagi menjadi dua fase terintegrasi:

#### A. Fase GATE-IN (Kendaraan Masuk)
1. **Akuisisi Citra Masuk:** Kamera menangkap dua objek secara simultan:
   - Wajah pengendara (Kamera Pengemudi).
   - Pelat nomor kendaraan (Kamera ANPR).
2. **Proses Identifikasi Masuk:**
   - **Plat Nomor:** Dideteksi menggunakan YOLOv8 dan diekstraksi menggunakan **Tesseract 5.5 OCR + Adaptive Binarization (Otsu)**.
   - **Wajah Pengendara:** Dilokalisasi menggunakan model deep learning **YuNet / SCRFD**, kemudian diekstraksi ke dalam representasi vektor biometrik berdimensi 128 ($d = 128$) menggunakan **ArcFace / SFace**.
3. **Penyimpanan Sesi Parkir (Gate-In Data):**
   - Sistem mencatat ke database: Nomor Polisi, Vektor Fitur Wajah (`entry_face_embedding`), File Foto Wajah Masuk, dan Waktu Masuk (`entry_time`).
   - Status sesi disetel ke `IN_PARKING`.
   - Palang gerbang masuk otomatis dibuka (*Gate Open*) dan kendaraan dipersilakan parkir.

#### B. Fase GATE-OUT (Kendaraan Keluar)
1. **Akuisisi Citra Keluar:** Kamera di gerbang keluar menangkap kembali plat nomor dan wajah pengendara.
2. **Pencarian Sesi Aktif:** Sistem melakukan kueri ke database untuk menemukan sesi `IN_PARKING` berdasarkan nomor plat yang terdeteksi.
3. **Pencocokan Biometrik (Cosine Similarity):**
   - Vektor wajah keluar ($v_{\text{exit}}$) dibandingkan secara langsung dengan vektor wajah masuk ($v_{\text{entry}}$) menggunakan formula Cosine Similarity:
     $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
4. **Keputusan Sistem:**
   - **Kondisi 1: Wajah Sama / Cocok ($\text{Similarity} \ge \tau$):**
     - Status: **NORMAL**.
     - Aksi: Palang gerbang keluar otomatis terbuka (*Gate Open*).
     - Sesi parkir ditandai selesai (`COMPLETED`).
   - **Kondisi 2: Wajah Berbeda ($\text{Similarity} < \tau$):**
     - Status: **INDIKASI ANOMALI** (Pengemudi keluar berbeda dengan pengemudi masuk / indikasi pencurian kendaraan).
     - Aksi: Palang gerbang keluar otomatis terkunci (*Security Lock*).
     - Sistem memicu perekaman kamera resolusi tinggi (*High-Resolution Forensic Evidence*).
     - Notifikasi alarm dan bukti visual digital forensik langsung dikirim ke pos satpam keamanan.
   - **Kondisi 3: Tiket Tidak Ditemukan:**
     - Jika kendaraan mencoba keluar tanpa memiliki data Gate-In aktif, sistem langsung memicu status **ANOMALI** (Kendaraan Ilegal).

---

### 3.3 Parameter dan Ambang Batas Pengujian
* **Ambang Batas Kemiripan Simulasi ($\tau_{\text{sim}}$):** `0.65` ($65\%$).
* **Ambang Batas Kemiripan Kamera Live SFace ($\tau_{\text{real}}$):** `0.45` ($45\%$).
* **Dimensi Embedding Wajah:** $1 \times 128$ float32 (ArcFace/SFace Hypersphere Embedding).
* **Format Database:** Relational Database SQLite dengan penyimpanan vektor JSON dan indexing nomor polisi.

---

### 3.4 Matriks Evaluasi Ilmiah
Evaluasi sistem dilakukan berdasarkan:
1. **Akurasi, Presisi, Recall, dan F1-Score** pada 100 sampel pengujian sesi (50 pengemudi sah vs 50 orang asing/curanmor).
2. **False Acceptance Rate (FAR):** Probabilitas pencuri salah lolos sebagai pemilik sah (target: $0.0\%$).
3. **False Rejection Rate (FRR):** Probabilitas pemilik sah salah ditahan (target: $0.0\%$).
4. **Inference Latency (ms):** Total waktu pemrosesan mulai dari capture kamera hingga gerbang terbuka.
