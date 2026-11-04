import React from 'react';
import { Car, Scan, AlertTriangle, CheckCircle, Percent } from 'lucide-react';
import { SystemStats } from '../types';

interface StatsOverviewProps {
  stats: SystemStats | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Kendaraan Terdata</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_vehicles ?? 0}</p>
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
          <Car className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Total Pemindaian</p>
          <p className="text-2xl font-bold text-white mt-1">{stats?.total_transactions ?? 0}</p>
        </div>
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
          <Scan className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Akses Normal</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{stats?.total_normal ?? 0}</p>
        </div>
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
          <CheckCircle className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">Anomali Terdeteksi</p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{stats?.total_anomalies ?? 0}</p>
        </div>
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
