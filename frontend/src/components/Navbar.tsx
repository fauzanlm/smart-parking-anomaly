import React, { useState, useEffect } from 'react';
import { Shield, RotateCcw, Clock, Building2 } from 'lucide-react';

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
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-700 text-white rounded-lg shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                SIM-PARKIR: SISTEM DETEKSI ANOMALI KENDARAAN
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded bg-blue-800 text-blue-200 font-medium">
                Pos Gerbang Keluar
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Korelasi Multi-Modal Plat Nomor (YOLOv8) & Biometrik Wajah (SCRFD / ArcFace) — Skripsi William
            </p>
          </div>
        </div>

        {/* Status, Time, and Actions */}
        <div className="flex items-center gap-3 text-xs">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-300 font-mono bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeStr}</span>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 px-2.5 py-1.5 rounded-md border border-slate-700">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-slate-200 font-medium">
              {wsConnected ? 'Sensor Gerbang: Online' : 'Koneksi Terputus'}
            </span>
          </div>

          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium transition active:scale-95 disabled:opacity-50"
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
