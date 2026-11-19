import React, { useState } from 'react';
import { FileText, Eye, AlertCircle, CheckCircle, Download, LogIn, LogOut } from 'lucide-react';
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
    const headers = ['ID', 'Waktu Transaksi', 'Pos Gerbang', 'Nomor Polisi', 'Status Verifikasi', 'Kemiripan ArcFace (%)', 'Aksi Palang', 'Catatan Keputusan'];
    const rows = logs.map(l => [
      l.id,
      `"${new Date(l.timestamp).toLocaleString('id-ID')}"`,
      l.gate_mode || 'GATE_OUT',
      `"${l.plate_number}"`,
      l.status,
      l.similarity_score !== null ? (l.similarity_score * 100).toFixed(1) : 'Sesi Masuk',
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
              Anomali Saja ({logs.filter(l => l.status === 'ANOMALY').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5">ID</th>
              <th className="px-3 py-2.5">Waktu</th>
              <th className="px-3 py-2.5">Pos Gerbang</th>
              <th className="px-3 py-2.5">Nomor Polisi</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Kemiripan ArcFace</th>
              <th className="px-3 py-2.5">Foto Masuk</th>
              <th className="px-3 py-2.5">Foto Keluar / Bukti</th>
              <th className="px-3 py-2.5">Catatan Sistem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  Belum ada rekaman transaksi gerbang parkir.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => {
                const isAnomaly = log.status === 'ANOMALY';
                const isGateIn = log.gate_mode === 'GATE_IN';

                return (
                  <tr key={log.id} className={`hover:bg-slate-50/70 transition ${isAnomaly ? 'bg-red-50/30' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-slate-400">#{log.id}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString('id-ID')} WIB
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        isGateIn
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {isGateIn ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                        {isGateIn ? 'GATE-IN' : 'GATE-OUT'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                      {log.plate_number}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                        isAnomaly
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : (isGateIn ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200')
                      }`}>
                        {isAnomaly ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                        {isAnomaly ? 'ANOMALI' : 'NORMAL'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {log.similarity_score !== null ? (
                        <span className={`font-semibold ${isAnomaly ? 'text-red-700' : 'text-emerald-700'}`}>
                          {(log.similarity_score * 100).toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Sesi Masuk</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {log.entry_photo_path ? (
                        <img
                          src={log.entry_photo_path}
                          alt="Foto Masuk"
                          onClick={() => onViewEvidence(log.entry_photo_path!)}
                          className="w-8 h-8 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                          title="Klik untuk melihat foto masuk"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {log.anomaly_evidence_path || log.face_photo_path ? (
                        <img
                          src={(log.anomaly_evidence_path || log.face_photo_path)!}
                          alt="Foto Keluar"
                          onClick={() => onViewEvidence((log.anomaly_evidence_path || log.face_photo_path)!)}
                          className={`w-8 h-8 object-cover rounded border cursor-pointer hover:opacity-80 ${
                            isAnomaly ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'
                          }`}
                          title="Klik untuk melihat foto"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-xs truncate" title={log.decision_notes}>
                      {log.decision_notes}
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
