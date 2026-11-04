#!/usr/bin/env bash

# Smart Parking Anomaly Detection - Thesis Runner Script
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "   SMART PARKING ANOMALY DETECTION (SKRIPSI WILLIAM)     "
echo "   Multi-Modal AI: YOLOv8 ANPR + SCRFD ArcFace Biometric "
echo "=========================================================="

# Check Python Venv
if [ ! -d "backend/venv" ]; then
    echo "[!] Virtualenv tidak ditemukan. Membuat venv..."
    cd backend && python3 -m venv venv && ./venv/bin/pip install -r requirements.txt && cd ..
fi

echo "[*] Menjalankan Backend FastAPI (Port 8000)..."
cd backend
./venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "[*] Menjalankan Frontend Dashboard (Port 3000)..."
cd frontend
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

cleanup() {
    echo ""
    echo "[*] Menghentikan semua layanan..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo ""
echo "=========================================================="
echo " [OK] Aplikasi Berhasil Dijalankan!"
echo " 👉 Akses Dashboard: http://localhost:3000"
echo " 👉 API Swagger Doc: http://localhost:8000/docs"
echo " Tekan Ctrl+C untuk keluar."
echo "=========================================================="

wait
