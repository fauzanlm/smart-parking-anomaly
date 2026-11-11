@echo off
setlocal enabledelayedexpansion
title Smart Parking Anomaly Detection System

echo ==========================================================
echo    SMART PARKING ANOMALY DETECTION SYSTEM
echo    Multi-Modal AI: YOLOv8 OCR + ArcFace/SFace Biometrics
echo ==========================================================
echo.

cd /d "%~dp0"

REM -----------------------------------------------------------
REM 0. PERIKSA APAKAH FILE MASIH DI DALAM FILE ZIP
REM -----------------------------------------------------------
if not exist "%~dp0backend" (
    echo.
    echo ==========================================================
    echo  [PERINGATAN] FILE MASIH DI DALAM FILE ZIP!
    echo ==========================================================
    echo  Aplikasi tidak bisa berjalan langsung dari dalam preview ZIP.
    echo.
    echo  Langkah yang benar:
    echo  1. Tutup jendela ini.
    echo  2. Klik kanan file ZIP (smart-parking-anomaly.zip).
    echo  3. Pilih "Extract All..." (Ekstrak Semua).
    echo  4. Masuk ke folder hasil ekstrak.
    echo  5. Klik dua kali file start.bat di dalam folder tersebut.
    echo ==========================================================
    echo.
    pause
    exit /b 1
)

REM -----------------------------------------------------------
REM 1. PERIKSA INSTALASI PYTHON
REM -----------------------------------------------------------
echo [*] Memeriksa runtime Python...
set "PYTHON_CMD="

python -c "import sys; sys.exit(0)" >nul 2>nul
if %errorlevel% equ 0 (
    set "PYTHON_CMD=python"
) else (
    py -3 -c "import sys; sys.exit(0)" >nul 2>nul
    if %errorlevel% equ 0 (
        set "PYTHON_CMD=py -3"
    )
)

if not defined PYTHON_CMD (
    echo.
    echo ==========================================================
    echo  [ERROR] PYTHON TIDAK DITEMUKAN ATAU BELUM DIAKTIFKAN!
    echo ==========================================================
    echo  Sistem AI backend membutuhkan Python (versi 3.10 / 3.11 / 3.12).
    echo.
    echo  Jika belum install Python:
    echo  1. Buka browser: https://www.python.org/downloads/
    echo  2. Download installer Python.
    echo  3. [SANGAT PENTING] Saat installer terbuka, CENTANG KOTAK
    echo     PALING BAWAH: "[x] Add python.exe to PATH"
    echo  4. Klik "Install Now" sampai selesai.
    echo.
    echo  Jika sudah install tapi pesan ini tetap muncul:
    echo  - Buka Start Menu - Settings - Apps - Advanced app settings
    echo    - App execution aliases - Matikan (Turn OFF) "App Installer" untuk python.exe
    echo  - Lalu restart CMD atau klik ulang start.bat ini.
    echo ==========================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Python terdeteksi (%PYTHON_CMD%).

REM -----------------------------------------------------------
REM 2. PERIKSA INSTALASI NODE.JS & NPM
REM -----------------------------------------------------------
echo [*] Memeriksa runtime Node.js & npm...
call npm --version >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ==========================================================
    echo  [ERROR] NODE.JS / NPM TIDAK DITEMUKAN!
    echo ==========================================================
    echo  Tampilan web dashboard membutuhkan Node.js.
    echo.
    echo  Langkah instalasi (Hanya 1x Saja):
    echo  1. Buka browser: https://nodejs.org/
    echo  2. Download versi "LTS" (Recommended for Most Users).
    echo  3. Buka file installer yang diunduh.
    echo  4. Klik Next - Next - Install sampai selesai.
    echo  5. Setelah selesai, klik dua kali file start.bat ini lagi!
    echo ==========================================================
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js dan npm terdeteksi.

REM -----------------------------------------------------------
REM 3. SETUP VIRTUAL ENVIRONMENT PYTHON & DEPENDENCIES
REM -----------------------------------------------------------
if not exist "backend\venv\Scripts\activate.bat" (
    echo.
    echo [*] Membuat virtual environment Python (backend\venv)...
    cd /d "%~dp0backend"
    %PYTHON_CMD% -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal membuat virtual environment Python!
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    call venv\Scripts\activate.bat
    echo [*] Menginstall paket AI (FastAPI, OpenCV, SFace, dll)...
    echo [*] Harap tunggu 1-3 menit (tergantung koneksi internet)...
    python -m pip install --upgrade pip
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Gagal mengunduh dependensi Python dari pip.
        echo Periksa koneksi internet Anda lalu coba lagi.
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

REM -----------------------------------------------------------
REM 4. SETUP FRONTEND NODE_MODULES
REM -----------------------------------------------------------
if not exist "frontend\node_modules" (
    echo.
    echo [*] Menginstall dependensi Frontend Dashboard (React Vite)...
    cd /d "%~dp0frontend"
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Gagal menginstall modul frontend (npm install).
        echo Periksa koneksi internet Anda lalu coba lagi.
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

REM -----------------------------------------------------------
REM 5. JALANKAN BACKEND & FRONTEND DI JENDELA TERPISAH
REM -----------------------------------------------------------
echo.
echo ==========================================================
echo  SEMUA DEPENDENSI LENGKAP! MENJALANKAN SERVER...
echo ==========================================================
echo.
echo [*] Menyalakan Backend FastAPI (Port 8000)...
start "SIM-PARKIR Backend (FastAPI)" cmd /k "call "%~dp0backend\run_backend.bat""

REM Jeda 2 detik agar backend inisialisasi terlebih dahulu
timeout /t 2 /nobreak >nul

echo [*] Menyalakan Frontend Dashboard (Port 3000)...
start "SIM-PARKIR Frontend (Vite)" cmd /k "call "%~dp0frontend\run_frontend.bat""

REM Jeda 3 detik agar frontend server siap
timeout /t 3 /nobreak >nul

echo.
echo ==========================================================
echo  [SUKSES] APLIKASI TELAH BERJALAN!
echo.
echo  👉 Web Dashboard  : http://localhost:3000
echo  👉 API Docs       : http://localhost:8000/docs
echo ==========================================================
echo.
echo Membuka dashboard di web browser default kamu...
start http://localhost:3000

echo.
echo Catatan: Jendela ini boleh ditutup atau dibiarkan.
echo (JANGAN tutup 2 jendela hitam Backend dan Frontend selama pengujian).
echo.
pause
