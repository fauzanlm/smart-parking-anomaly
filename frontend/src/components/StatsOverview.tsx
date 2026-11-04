import React from 'react';
import { Car, Scan, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsOverviewProps {
  stats: SystemStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Kendaraan */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Kendaraan Terdata
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_vehicles ?? 0}</p>
        </div>
        <div className="p-2.5 bg-slate-100 rounded-lg text-slate-600">
          <Car className="w-5 h-5" />
        </div>
      </div>

      {/* Total Transaksi / Pemindaian */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Total Pemindaian
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total_transactions ?? 0}</p>
        </div>
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
          <Scan className="w-5 h-5" />
        </div>
      </div>

      {/* Akses Normal */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Lolos Normal
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats?.total_normal ?? 0}</p>
        </div>
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* Anomali Terdeteksi */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Anomali / Tahanan
          </span>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats?.total_anomalies ?? 0}</p>
        </div>
        <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
