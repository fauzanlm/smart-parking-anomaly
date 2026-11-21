import React from 'react';
import { CheckCircle2, AlertTriangle, Shield, Lock, Unlock, FileImage, ArrowRight, UserCheck, UserX, LogIn } from 'lucide-react';
import { VerificationResult } from '../types';

interface VerificationPanelProps {
  result: VerificationResult | null;
  onOpenEvidence: (url: string) => void;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ result, onOpenEvidence }) => {
  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center shadow-xs">
        <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-700">Menunggu Kendaraan di Titik Palang</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Silakan ambil foto melalui kamera atau pilih salah satu skenario simulasi di bawah untuk menjalankan pengujian Gate-In atau Gate-Out.
        </p>
      </div>
    );
  }

  const isGateIn = result.gate_mode === 'GATE_IN';
  const isAnomaly = result.status === 'ANOMALY';
  const isGateOpen = result.gate_action === 'OPEN';
  const similarityPercent = result.similarity_percentage;
  const thresholdPercent = Math.round(result.threshold * 100);

  return (
    <div className={`rounded-lg border shadow-xs overflow-hidden bg-white ${
      isAnomaly ? 'border-red-300' : (isGateIn ? 'border-blue-300' : 'border-emerald-300')
    }`}>
      {/* Top Alert Banner */}
      <div className={`px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isAnomaly
          ? 'bg-red-600 text-white'
          : (isGateIn ? 'bg-blue-600 text-white' : 'bg-emerald-700 text-white')
      }`}>
        <div className="flex items-center gap-3">
          {isAnomaly ? (
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          ) : isGateIn ? (
            <LogIn className="w-6 h-6 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-white">
                {result.gate_mode} ● {result.status}
              </span>
              <span className="text-xs font-mono opacity-90">
                Plat Nomor: <strong className="text-white text-sm">{result.plate_number}</strong>
              </span>
            </div>

            <h2 className="text-base font-bold mt-0.5">
              {isGateIn
                ? 'TIKET MASUK TERCATAT — PALANG MASUK TERBUKA (GATE-IN)'
                : isAnomaly
                ? 'PERINGATAN ANOMALI: WAJAH BERBEDA DENGAN SAAT MASUK (PALANG TERKUNCI)'
                : 'VERIFIKASI BERHASIL: WAJAH SAMA DENGAN SAAT MASUK (PALANG TERBUKA)'}
            </h2>
          </div>
        </div>

        {/* Gate State Badge */}
        <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold ${
          isGateOpen
            ? 'bg-white text-slate-900 shadow-2xs'
            : 'bg-white text-red-800 shadow-2xs'
        }`}>
          {isGateOpen ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-red-600" />}
          <span>{isGateOpen ? 'PALANG TERBUKA (DIIZINKAN)' : 'PALANG TERKUNCI (DITAHAN)'}</span>
        </div>
      </div>

      {/* Main Verification Content */}
      <div className="p-5 space-y-4">
        {/* Decision Notes Box */}
        <div className={`p-3.5 rounded-lg border text-xs font-medium leading-relaxed ${
          isAnomaly
            ? 'bg-red-50 border-red-200 text-red-900'
            : (isGateIn ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900')
        }`}>
          {result.decision_notes}
        </div>

        {/* Status Kamera 3 Berdasarkan Flowchart Skripsi */}
        {!isGateIn && (
          <div>
            {isAnomaly ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-lg bg-red-100/80 border border-red-300 text-xs font-bold text-red-900">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 animate-bounce" />
                  <span>Status: ANOMALI — Kamera 3 MELAKUKAN TRIGGER terhadap pengendara untuk merekam bukti resolusi tinggi!</span>
                </div>
                {result.anomaly_evidence_url && (
                  <button
                    onClick={() => onOpenEvidence(result.anomaly_evidence_url!)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-2xs transition active:scale-95 flex items-center gap-1"
                  >
                    <FileImage className="w-3.5 h-3.5" />
                    <span>Lihat Hasil Jepretan Kamera 3</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Status: NORMAL — Kamera 3 TIDAK melakukan trigger terhadap pengendara (Tetap Siaga / Standby).</span>
              </div>
            )}
          </div>
        )}

        {/* Gate-Out 1-to-1 Side-by-Side Face Comparison */}
        {!isGateIn && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                {isAnomaly ? <UserX className="w-4 h-4 text-red-600" /> : <UserCheck className="w-4 h-4 text-emerald-600" />}
                Pencocokan Biometrik 1-to-1 (Wajah Masuk vs Wajah Keluar)
              </span>

              {similarityPercent !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-mono">Ambang Batas: {thresholdPercent}%</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                    isAnomaly ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    Kemiripan: {similarityPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Comparison Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Card: Entry Photo (Saat Masuk) */}
              <div className="bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide block mb-2">
                  1. Foto Saat Masuk (Gate-In)
                </span>
                {result.entry_photo_url ? (
                  <img
                    src={result.entry_photo_url}
                    alt="Foto Masuk"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes('/storage/faces/')) {
                        target.src = target.src.replace('/storage/faces/', '/storage/anomalies/');
                      }
                    }}
                    onClick={() => onOpenEvidence(result.entry_photo_url!)}
                    className="w-full h-44 object-contain rounded border border-slate-200 bg-slate-900/5 cursor-pointer hover:opacity-90"
                    title="Klik untuk memperbesar foto saat masuk"
                  />
                ) : (
                  <div className="h-44 rounded bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                    Tidak Ada Riwayat Foto Masuk
                  </div>
                )}
                <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                  {result.entry_photo_url ? 'Profil Sah yang Disimpan di Database' : 'Kendaraan Tidak Terdata Masuk'}
                </span>
              </div>

              {/* Right Card: Exit Photo (Saat Keluar) */}
              <div className={`bg-white border rounded-lg p-3 text-center shadow-2xs ${
                isAnomaly ? 'border-red-300 ring-2 ring-red-100' : 'border-emerald-300'
              }`}>
                <span className={`text-[11px] font-bold uppercase tracking-wide block mb-2 ${
                  isAnomaly ? 'text-red-700' : 'text-emerald-700'
                }`}>
                  2. Foto Saat Keluar (Gate-Out)
                </span>
                {result.exit_photo_url || result.face_photo_url ? (
                  <img
                    src={(result.exit_photo_url || result.face_photo_url)!}
                    alt="Foto Keluar"
                    onError={(e) => {
                      const target = e.currentTarget;
                      if (target.src.includes('/storage/faces/')) {
                        target.src = target.src.replace('/storage/faces/', '/storage/anomalies/');
                      } else if (target.src.includes('/storage/anomalies/')) {
                        target.src = target.src.replace('/storage/anomalies/', '/storage/faces/');
                      }
                    }}
                    onClick={() => onOpenEvidence((result.exit_photo_url || result.face_photo_url)!)}
                    className="w-full h-44 object-contain rounded border border-slate-200 bg-slate-900/5 cursor-pointer hover:opacity-90"
                    title="Klik untuk memperbesar foto saat keluar"
                  />
                ) : (
                  <div className="h-44 rounded bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                    Tidak Ada Foto
                  </div>
                )}
                <span className={`text-[11px] mt-2 block font-medium ${
                  isAnomaly ? 'text-red-600 font-bold' : 'text-emerald-700'
                }`}>
                  {isAnomaly ? 'Wajah Berbeda (Indikasi Curanmor)' : 'Wajah Cocok dengan Pengemudi Masuk'}
                </span>
              </div>
            </div>

            {/* Match Progress Bar */}
            {similarityPercent !== null && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
                  <span>Tingkat Kecocokan Cosine Similarity:</span>
                  <span className="font-bold">{similarityPercent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isAnomaly ? 'bg-red-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, similarityPercent))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gate-In Single Snapshot View */}
        {isGateIn && result.face_photo_url && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-3">
              Foto Tiket Masuk & Vektor Biometrik yang Disimpan
            </span>
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-lg p-3 text-center shadow-2xs">
              <img
                src={result.face_photo_url}
                alt="Foto Masuk"
                onClick={() => onOpenEvidence(result.face_photo_url!)}
                className="w-full h-48 object-contain rounded border border-slate-200 bg-slate-900/5 cursor-pointer hover:opacity-90"
                title="Klik untuk memperbesar foto"
              />
              <span className="text-[11px] text-slate-500 mt-2 block font-medium">
                Vektor Wajah 128-d (ArcFace) & Plat Nomor {result.plate_number} aktif di database.
              </span>
            </div>
          </div>
        )}

        {/* Action Row */}
        {result.anomaly_evidence_url && (
          <div className="pt-2 flex justify-end">
            <button
              onClick={() => onOpenEvidence(result.anomaly_evidence_url!)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
            >
              <FileImage className="w-4 h-4" />
              <span>Buka Berkas Bukti Forensik Resolusi Tinggi</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
