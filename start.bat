@echo off
title Smart Parking Anomaly Detection (Skripsi William)
echo ==========================================================
echo    SMART PARKING ANOMALY DETECTION (SKRIPSI WILLIAM)     
echo    Multi-Modal AI: YOLOv8 ANPR + SCRFD ArcFace Biometric 
echo ==========================================================

cd /d "%~dp0"

REM 1. Check Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Python tidak terdeteksi di sistem Windows kamu!
    echo Silakan download dan install Python (rekomendasi Python 3.10 atau 3.11):
    echo https://www.python.org/downloads/
    echo.
    echo PENTING SAAT INSTALL:
    echo Pastikan centang kotak [x] "Add python.exe to PATH" di installer paling bawah!
    echo.
    pause
    exit /b 1
)

REM 2. Check Node.js / npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js / npm tidak terdeteksi di sistem Windows kamu!
    echo Silakan download dan install Node.js (versi LTS):
    echo https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM 3. Setup Backend Virtual Environment
if not exist "backend\venv" (
    echo.
    echo [*] Membuat virtual environment Python (backend\venv)...
    cd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    echo [*] Menginstall dependencies Python (FastAPI, OpenCV, PyTorch/ONNX, dll)...
    echo [*] Proses ini butuh koneksi internet dan makan waktu 1-3 menit...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    cd ..
)

REM 4. Setup Frontend node_modules
if not exist "frontend\node_modules" (
    echo.
    echo [*] Menginstall dependencies Frontend (React, Vite, Tailwind CSS)...
    cd frontend
    call npm install
    cd ..
)

echo.
echo [*] Menjalankan Backend FastAPI (Port 8000)...
start "SIM-PARKIR Backend (FastAPI)" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo [*] Menjalankan Frontend React Dashboard (Port 3000)...
start "SIM-PARKIR Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npm run dev -- --port 3000 --host"

echo.
echo ==========================================================
echo  [OK] Aplikasi Berhasil Dijalankan di Jendela Terpisah!
echo  👉 Dashboard Sistem : http://localhost:3000
echo  👉 Dokumentasi API  : http://localhost:8000/docs
echo ==========================================================
echo.
echo Catatan: Jangan tutup dua jendela hitam (CMD) Backend dan Frontend yang baru muncul.
echo Tekan tombol apa saja untuk langsung membuka Dashboard di Browser kamu...
pause >nul
start http://localhost:3000
