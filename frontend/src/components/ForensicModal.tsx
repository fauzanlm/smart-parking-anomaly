import React from 'react';
import { X, Download, Camera } from 'lucide-react';

interface ForensicModalProps {
  imageUrl: string | null;
  onClose: () => void;
}

export const ForensicModal: React.FC<ForensicModalProps> = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-300 rounded-lg max-w-2xl w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
            <Camera className="w-4 h-4 text-slate-600" />
            <span className="font-bold text-xs uppercase tracking-wide">
              Dokumentasi Citra Pengemudi (Kamera CCTV Gerbang)
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 bg-slate-900 flex flex-col items-center">
          <img
            src={imageUrl}
            alt="Forensic Evidence"
            className="max-h-[420px] w-auto rounded border border-slate-700 object-contain shadow-md"
          />
        </div>

        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center text-xs text-slate-600">
          <span>Tersimpan di direktori server: <code>storage/anomalies/</code></span>
          <a
            href={imageUrl}
            download="bukti_anomali_parkir.jpg"
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded bg-blue-700 hover:bg-blue-800 text-white font-medium flex items-center gap-1.5 transition text-xs shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Berkas Asli
          </a>
        </div>
      </div>
    </div>
  );
};
