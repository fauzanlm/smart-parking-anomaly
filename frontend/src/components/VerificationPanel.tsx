import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, UserCheck, UserX, Shield, Lock, Unlock } from 'lucide-react';
import { VerificationResult } from '../types';

interface VerificationPanelProps {
  result: VerificationResult | null;
  onOpenEvidence: (url: string) => void;
}

export const VerificationPanel: React.FC<VerificationPanelProps> = ({ result, onOpenEvidence }) => {
  if (!result) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
        <Shield className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="text-base font-semibold text-slate-300">Menunggu Kendaraan di Gerbang</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Pilih skenario simulasi atau klik tombol uji untuk menjalankan evaluasi sistem secara otomatis.
        </p>
      </div>
    );
  }

  const isAnomaly = result.status === 'ANOMALY';
  const isGateOpen = result.gate_action === 'OPEN';
  const similarityPercent = result.similarity_percentage ?? 0;
  const thresholdPercent = result.threshold * 100;

  return (
    <div className={`rounded-2xl border ${isAnomaly ? 'border-rose-500/80 bg-rose-950/20' : 'border-emerald-500/80 bg-emerald-950/20'} p-6 transition-all shadow-xl`}>
      {/* Header Status Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl ${isAnomaly ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
            {isAnomaly ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isAnomaly ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black'}`}>
                {result.status}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Plat: <span className="text-white font-bold">{result.plate_number}</span>
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              {isAnomaly ? 'Indikasi Anomali: Wajah Pengemudi Tidak Sesuai' : 'Verifikasi Berhasil: Status Normal'}
            </h2>
          </div>
        </div>

        {/* Gate Status Pill */}
        <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border font-bold text-sm ${isGateOpen ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
          {isGateOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isGateOpen ? 'PALANG TERBUKA (AUTO-PASS)' : 'PALANG TERKUNCI (SECURITY LOCK)'}</span>
        </div>
      </div>

      {/* Body: Biometric Matching Metrics & 3x Visits Rule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-5">
        {/* Metric 1: Visit Count Evaluation */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
          <p className="text-xs text-slate-400 font-medium">Evaluasi Riwayat Kunjungan</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{result.total_visits}</span>
            <span className="text-xs text-slate-400">/ 3 Kali Minimal</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {result.meets_3_visits_criteria ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Memenuhi Syarat Pencocokan
              </span>
            ) : (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Belum 3x (Tahap Belajar Baseline)
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: ArcFace Cosine Similarity */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-400 font-medium">ArcFace Cosine Similarity</p>
            <span className="text-xs font-mono text-cyan-400">Ambang: {thresholdPercent}%</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${isAnomaly ? 'text-rose-400' : 'text-emerald-400'}`}>
              {result.similarity_percentage !== null ? `${result.similarity_percentage}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-400">Kemiripan Wajah</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 relative overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${isAnomaly ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, Math.max(5, similarityPercent))}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Digital Forensics & High-Res Snapshot */}
        <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Digital Forensic Evidence</p>
            <p className="text-sm font-semibold text-white mt-1">
              {result.high_res_camera_triggered ? 'Kamera Hi-Res Terpicu Otomatis' : 'Mode Standby / Normal Log'}
            </p>
          </div>
          {result.anomaly_evidence_url ? (
            <button
              onClick={() => onOpenEvidence(result.anomaly_evidence_url!)}
              className="mt-3 w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/40 active:scale-95"
            >
              Lihat Foto Bukti Anomali
            </button>
          ) : (
            <span className="text-xs text-slate-500 mt-3 italic">Tidak ada indikasi pelanggaran</span>
          )}
        </div>
      </div>

      {/* Decision Rationale */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-semibold">Alasan Keputusan Sistem: </span>
        <span className="text-slate-200">{result.decision_notes}</span>
      </div>
    </div>
  );
};
