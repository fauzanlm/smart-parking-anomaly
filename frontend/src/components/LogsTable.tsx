import React, { useState } from 'react';
import { FileText, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { ParkingLog } from '../types';

interface LogsTableProps {
  logs: ParkingLog[];
  onViewEvidence: (url: string) => void;
}

export const LogsTable: React.FC<LogsTableProps> = ({ logs, onViewEvidence }) => {
  const [filter, setFilter] = useState<'ALL' | 'ANOMALY'>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ANOMALY') return log.status === 'ANOMALY';
    return true;
  });

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <FileText className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Riwayat Transaksi & Log Anomali</h3>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-lg text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-md transition ${filter === 'ALL' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-white'}`}
          >
            Semua ({logs.length})
          </button>
          <button
            onClick={() => setFilter('ANOMALY')}
            className={`px-3 py-1 rounded-md transition ${filter === 'ANOMALY' ? 'bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/30' : 'text-slate-400 hover:text-rose-400'}`}
          >
            Anomali Saja ({logs.filter(l => l.status === 'ANOMALY').length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Waktu</th>
              <th className="py-3 px-4">Nomor Polisi</th>
              <th className="py-3 px-4">Kunjungan Ke</th>
              <th className="py-3 px-4">Status & Hasil</th>
              <th className="py-3 px-4">ArcFace Similarity</th>
              <th className="py-3 px-4">Tindakan / Palang</th>
              <th className="py-3 px-4 text-right">Bukti Foto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                  Belum ada log transaksi. Jalankan simulasi di atas.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isAnomaly = log.status === 'ANOMALY';
                return (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 text-slate-300 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {log.plate_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      #{log.visit_number}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${isAnomaly ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {isAnomaly ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {log.similarity_score !== null ? (
                        <span className={isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {(log.similarity_score * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">Baseline Phase</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {isAnomaly ? (
                        <span className="text-rose-400 font-bold">Palang Terkunci</span>
                      ) : (
                        <span className="text-emerald-400">Palang Terbuka</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {log.anomaly_evidence_path ? (
                        <button
                          onClick={() => onViewEvidence(log.anomaly_evidence_path!)}
                          className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 inline-flex items-center gap-1 font-semibold transition"
                        >
                          <Eye className="w-3 h-3" /> Lihat Foto
                        </button>
                      ) : log.face_photo_path ? (
                        <button
                          onClick={() => onViewEvidence(log.face_photo_path!)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> Foto Wajah
                        </button>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
