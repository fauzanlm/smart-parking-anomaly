import React, { useState } from 'react';
import { FileText, Eye, AlertCircle, CheckCircle, Download } from 'lucide-react';
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

  const exportToCSV = () => {
    if (logs.length === 0) return;
    const headers = ['ID', 'Waktu Transaksi', 'Nomor Polisi', 'Kunjungan Ke', 'Status Verifikasi', 'Kemiripan ArcFace (%)', 'Aksi Palang', 'Catatan Keputusan'];
    const rows = logs.map(l => [
      l.id,
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      `"${l.plate_number}"`,
      l.visit_number,
      l.status,
      l.similarity_score !== null ? (l.similarity_score * 100).toFixed(1) : 'Baseline',
      l.status === 'ANOMALY' ? 'Terkunci (Ditahan)' : 'Terbuka',
      `"${(l.decision_notes || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_transaksi_parkir_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Log Riwayat Transaksi Gerbang Parkir
          </h3>
        </div>

        {/* Filter Tabs & Export Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            disabled={logs.length === 0}
            className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-40"
            title="Unduh seluruh riwayat dalam format file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>Unduh CSV</span>
          </button>

          <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3 py-1 rounded transition ${
                filter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              onClick={() => setFilter('ANOMALY')}
              className={`px-3 py-1 rounded transition ${
                filter === 'ANOMALY'
                  ? 'bg-red-600 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-red-700'
              }`}
            >
              Anomali ({logs.filter(l => l.status === 'ANOMALY').length})
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3">Waktu Transaksi</th>
              <th className="py-2.5 px-3">Nomor Polisi</th>
              <th className="py-2.5 px-3">Kunjungan</th>
              <th className="py-2.5 px-3">Status Verifikasi</th>
              <th className="py-2.5 px-3">Skor Kemiripan (ArcFace)</th>
              <th className="py-2.5 px-3">Aksi Palang</th>
              <th className="py-2.5 px-3 text-right">Foto Bukti</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                  Belum ada catatan transaksi parkir. Jalankan simulasi atau webcam di atas.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isAnomaly = log.status === 'ANOMALY';
                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                      {log.plate_number}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      Ke-{log.visit_number}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                        isAnomaly
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isAnomaly ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {log.similarity_score !== null ? (
                        <span className={`font-semibold ${isAnomaly ? 'text-red-700' : 'text-emerald-700'}`}>
                          {(log.similarity_score * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Registrasi Profil</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {isAnomaly ? (
                        <span className="text-red-700 font-bold">Terkunci (Ditahan)</span>
                      ) : (
                        <span className="text-emerald-700">Terbuka</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {log.anomaly_evidence_path ? (
                        <button
                          onClick={() => onViewEvidence(log.anomaly_evidence_path!)}
                          className="px-2.5 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 border border-red-300 font-medium inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> Foto Bukti
                        </button>
                      ) : log.face_photo_path ? (
                        <button
                          onClick={() => onViewEvidence(log.face_photo_path!)}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-medium inline-flex items-center gap-1 transition"
                        >
                          <Eye className="w-3 h-3" /> Foto Wajah
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
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
