@echo off
title SIM-PARKIR Backend (FastAPI Engine)
cd /d "%~dp0"
echo ==========================================================
echo    SIM-PARKIR: BACKEND FASTAPI ENGINE (PORT 8000)
echo ==========================================================
echo.
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
if %errorlevel% neq 0 (
    echo.
    echo ==========================================================
    echo  [ERROR] Backend FastAPI gagal berjalan atau terhenti!
    echo  Periksa pesan error di atas sebelum menutup jendela ini.
    echo ==========================================================
    pause
)
