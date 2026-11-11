@echo off
title SIM-PARKIR Frontend (React Dashboard)
cd /d "%~dp0"
echo ==========================================================
echo    SIM-PARKIR: FRONTEND REACT DASHBOARD (PORT 3000)
echo ==========================================================
echo.
call npm run dev -- --port 3000 --host
if %errorlevel% neq 0 (
    echo.
    echo ==========================================================
    echo  [ERROR] Frontend gagal berjalan atau terhenti!
    echo  Periksa pesan error di atas sebelum menutup jendela ini.
    echo ==========================================================
    pause
)
