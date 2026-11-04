import React from 'react';
import { ShieldCheck, ShieldAlert, RotateCcw, Video, Cpu } from 'lucide-react';

interface NavbarProps {
  onReset: () => void;
  isResetting: boolean;
  wsConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onReset, isResetting, wsConnected }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">Smart Parking Anomaly Detection</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                Skripsi AI Multi-Modal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              YOLOv8 Plate OCR + SCRFD ArcFace Biometric Profiling
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 font-medium">
              {wsConnected ? 'Live Gate Stream: Active' : 'Connecting Stream...'}
            </span>
          </div>

          <button
            onClick={onReset}
            disabled={isResetting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition active:scale-95 disabled:opacity-50"
            title="Reset database to start a fresh demo session"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            {isResetting ? 'Resetting...' : 'Reset Demo Data'}
          </button>
        </div>
      </div>
    </header>
  );
};
