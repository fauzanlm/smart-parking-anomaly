import React from 'react';
import { X, ShieldAlert, Download, Camera } from 'lucide-react';

interface ForensicModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ForensicModal: React.FC<ForensicModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2 text-rose-400">
            <Camera className="w-5 h-5" />
            <span className="font-bold text-sm">Bukti Forensik Digital (Kamera Resolusi Tinggi)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 bg-slate-950 flex flex-col items-center">
          <img
            src={imageUrl}
            alt="Forensic Evidence"
            className="max-h-[420px] w-auto rounded-xl border border-slate-800 object-contain shadow-lg"
          />
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-between items-center text-xs text-slate-400">
          <span>Metadata: Snapshot disimpan di storage/anomalies/</span>
          <a
            href={imageUrl}
            download="anomaly_evidence.jpg"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Buka File Asli
          </a>
        </div>
      </div>
    </div>
  );
};
