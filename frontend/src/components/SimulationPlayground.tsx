import React, { useState } from 'react';
import { Play, Sparkles, User, ShieldAlert, Check, RefreshCw } from 'lucide-react';

interface SimulationPlaygroundProps {
  onRunSimulation: (plate: string, persona: string, eventType: string) => Promise<void>;
  isProcessing: boolean;
}

export const SimulationPlayground: React.FC<SimulationPlaygroundProps> = ({
  onRunSimulation,
  isProcessing
}) => {
  const [customPlate, setCustomPlate] = useState('B 1234 WLM');
  const [customPersona, setCustomPersona] = useState('driver_owner');
  const [eventType, setEventType] = useState('EXIT');

  const presets = [
    {
      title: '1. Kunjungan #1',
      desc: 'William Masuk/Keluar (Registrasi Baseline 1)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      color: 'border-slate-700 hover:border-slate-500 bg-slate-900/60'
    },
    {
      title: '2. Kunjungan #2',
      desc: 'William Masuk/Keluar (Registrasi Baseline 2)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      color: 'border-slate-700 hover:border-slate-500 bg-slate-900/60'
    },
    {
      title: '3. Kunjungan #3',
      desc: 'William Masuk/Keluar (Memenuhi Syarat 3x)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      color: 'border-blue-600/60 hover:border-blue-500 bg-blue-950/20'
    },
    {
      title: '4. Uji Pemilik Sah',
      desc: 'Kunjungan #4 - William Keluar (Status Normal)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      color: 'border-emerald-600/60 hover:border-emerald-500 bg-emerald-950/20 text-emerald-400'
    },
    {
      title: '5. Uji Kasus Curanmor!',
      desc: 'Kunjungan #5 - Orang Asing/Maling Bawa Kendaraan',
      plate: 'B 1234 WLM',
      persona: 'driver_thief',
      event: 'EXIT',
      color: 'border-rose-600/60 hover:border-rose-500 bg-rose-950/30 text-rose-400'
    },
    {
      title: '6. Uji Profil Keluarga',
      desc: 'Keluarga/Adik Mengemudi (Similarity Tinggi)',
      plate: 'B 1234 WLM',
      persona: 'driver_family',
      event: 'EXIT',
      color: 'border-purple-600/60 hover:border-purple-500 bg-purple-950/20 text-purple-300'
    }
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlate.trim()) return;
    onRunSimulation(customPlate, customPersona, eventType);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-base font-bold text-white tracking-wide">Skenario Simulasi & Uji Sidang Skripsi</h3>
        </div>
        <span className="text-xs text-slate-400">Pilih skenario bertahap untuk pembuktian alur</span>
      </div>

      {/* Preset scenario grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-5">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onRunSimulation(preset.plate, preset.persona, preset.event)}
            disabled={isProcessing}
            className={`p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] disabled:opacity-50 ${preset.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono">{preset.title}</span>
              <Play className="w-3.5 h-3.5 opacity-70" />
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">{preset.desc}</p>
          </button>
        ))}
      </div>

      {/* Custom manual simulation input */}
      <form onSubmit={handleCustomSubmit} className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Nomor Polisi
          </label>
          <input
            type="text"
            value={customPlate}
            onChange={(e) => setCustomPlate(e.target.value)}
            placeholder="Contoh: B 1234 WLM"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="w-48">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Identitas Wajah
          </label>
          <select
            value={customPersona}
            onChange={(e) => setCustomPersona(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="driver_owner">👤 William (Pemilik Sah)</option>
            <option value="driver_family">👥 Keluarga (Authorized Member)</option>
            <option value="driver_thief">🚨 Orang Asing / Maling</option>
          </select>
        </div>

        <div className="w-32">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Arah Gerbang
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="EXIT">Pintu Keluar</option>
            <option value="ENTRY">Pintu Masuk</option>
          </select>
        </div>

        <div className="self-end">
          <button
            type="submit"
            disabled={isProcessing}
            className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-md shadow-cyan-900/30"
          >
            <Play className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Memproses...' : 'Jalankan Pindai'}
          </button>
        </div>
      </form>
    </div>
  );
};
