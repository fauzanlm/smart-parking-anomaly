import React, { useState, useEffect } from 'react';
import { RotateCcw, Clock, Building2, CheckCircle2 } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  isResetting: boolean;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onReset, isResetting, wsConnected }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) + ' - ' + now.toLocaleTimeString('id-ID') + ' WIB'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 shadow-xs sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Judul Sistem */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-lg shadow-xs">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900">
                SIM-PARKIR: SISTEM DETEKSI ANOMALI KENDARAAN
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                Pos Gerbang Keluar
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Korelasi Plat Nomor (OCR) & Biometrik Wajah (ArcFace / SFace) — Pos Gerbang Parkir
            </p>
          </div>
        </div>

        {/* Status, Jam, dan Tombol Reset */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-mono bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border ${
            wsConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="font-medium">
              {wsConnected ? 'Sensor Gerbang: Online' : 'Koneksi Terputus'}
            </span>
          </div>

          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold transition active:scale-95 disabled:opacity-50"
            title="Bersihkan database untuk pengujian baru"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Mereset...' : 'Reset Data'}
          </button>
        </div>
      </div>
    </header>
  );
};
