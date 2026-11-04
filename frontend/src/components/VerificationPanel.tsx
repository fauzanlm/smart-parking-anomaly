import React from 'react';
import { CheckCircle2, AlertTriangle, Shield, Lock, Unlock, FileImage } from 'lucide-react';
import { VerificationResult } from '../types';

interface VerificationPanelProps {
  result: VerificationResult | null;
  onOpenEvidence: (url: string) => void;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ result, onOpenEvidence }) => {
  if (!result) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center shadow-sm">
        <Shield className="w-10 h-10 text-slate-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-700">Menunggu Kendaraan di Titik Palang</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Silakan ambil foto melalui kamera laptop atau pilih salah satu skenario simulasi di bawah untuk menjalankan pengujian.
        </p>
      </div>
    );
  }

  const isAnomaly = result.status === 'ANOMALY';
  const isGateOpen = result.gate_action === 'OPEN';
  const similarityPercent = result.similarity_percentage ?? 0;
  const thresholdPercent = Math.round(result.threshold * 100);

  return (
    <div className={`rounded-lg border shadow-sm overflow-hidden bg-white ${isAnomaly ? 'border-red-300' : 'border-emerald-300'}`}>
      {/* Top Alert Bar */}
      <div className={`px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${isAnomaly ? 'bg-red-600 text-white' : 'bg-emerald-700 text-white'}`}>
        <div className="flex items-center gap-3">
          {isAnomaly ? (
            <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/20 text-white">
                {result.status}
              </span>
              <span className="text-xs font-mono opacity-90">
                Plat Nomor: <strong className="text-white text-sm">{result.plate_number}</strong>
              </span>
            </div>
            <h2 className="text-base font-bold mt-0.5">
              {isAnomaly
                ? 'PERINGATAN: INDIKASI ANOMALI — WAJAH PENGEMUDI TIDAK SESUAI'
                : 'VERIFIKASI BERHASIL — STATUS PENGEMUDI NORMAL'}
            </h2>
          </div>
        </div>

        {/* Gate State Badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold ${
          isGateOpen
            ? 'bg-white text-emerald-800'
            : 'bg-white text-red-800'
        }`}>
          {isGateOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isGateOpen ? 'PALANG TERBUKA (DIIZINKAN LEWAT)' : 'PALANG TERKUNCI (KENDARAAN DITAHAN)'}</span>
        </div>
      </div>

      {/* Evaluation Metrics Row */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 bg-slate-50/50">
        {/* Metric 1: Visits count */}
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Riwayat Kunjungan
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{result.total_visits}</span>
            <span className="text-xs text-slate-500">/ 3 Kali Minimal</span>
          </div>
          <div className="mt-2 text-xs font-medium">
            {result.meets_3_visits_criteria ? (
              <span className="text-emerald-700 flex items-center gap-1">
                ✓ Memenuhi batas minimal pencocokan
              </span>
            ) : (
              <span className="text-amber-700 flex items-center gap-1">
                ⚠ Belum 3x (Tahap Pembelajaran Profil Wajah)
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: ArcFace Similarity */}
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Tingkat Kemiripan (ArcFace)
            </span>
            <span className="text-xs font-mono text-slate-500">Ambang: {thresholdPercent}%</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${isAnomaly ? 'text-red-700' : 'text-emerald-700'}`}>
              {result.similarity_percentage !== null ? `${result.similarity_percentage}%` : 'Tahap Baseline'}
            </span>
            <span className="text-xs text-slate-500">Skor Cosine</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${isAnomaly ? 'bg-red-600' : 'bg-emerald-600'}`}
              style={{ width: `${Math.min(100, Math.max(5, similarityPercent))}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Forensic Snapshot Status */}
        <div className="bg-white border border-slate-200 rounded p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase">
              Dokumentasi Forensik
            </span>
            <p className="text-xs font-semibold text-slate-800 mt-1">
              {result.high_res_camera_triggered
                ? 'Kamera Resolusi Tinggi Otomatis Aktif'
                : 'Foto Kunjungan Tersimpan Normal'}
            </p>
          </div>
          {result.anomaly_evidence_url ? (
            <button
              onClick={() => onOpenEvidence(result.anomaly_evidence_url!)}
              className="mt-2.5 w-full py-1.5 px-3 rounded bg-red-700 hover:bg-red-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <FileImage className="w-3.5 h-3.5" />
              Lihat Foto Bukti Anomali
            </button>
          ) : result.face_photo_url ? (
            <button
              onClick={() => onOpenEvidence(result.face_photo_url!)}
              className="mt-2.5 w-full py-1.5 px-3 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
            >
              <FileImage className="w-3.5 h-3.5" />
              Lihat Foto Pengendara
            </button>
          ) : (
            <span className="text-xs text-slate-400 italic mt-2">Tidak ada berkas foto</span>
          )}
        </div>
      </div>

      {/* Decision Rationale Text */}
      <div className="p-4 bg-white text-xs text-slate-700 flex items-start gap-2">
        <span className="font-semibold text-slate-900 whitespace-nowrap">Keterangan Sistem:</span>
        <span className="text-slate-600">{result.decision_notes}</span>
      </div>
    </div>
  );
};
