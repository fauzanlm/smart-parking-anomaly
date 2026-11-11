import React, { useState } from 'react';
import { Play, FlaskConical, Car, UserCheck, ShieldAlert, Users } from 'lucide-react';

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
      desc: 'Kendaraan Terdaftar Masuk/Keluar (Registrasi Baseline 1)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      badge: 'Baseline #1',
      badgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      title: '2. Kunjungan #2',
      desc: 'Kendaraan Terdaftar Masuk/Keluar (Registrasi Baseline 2)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      badge: 'Baseline #2',
      badgeClass: 'bg-slate-100 text-slate-700'
    },
    {
      title: '3. Kunjungan #3',
      desc: 'Kendaraan Terdaftar Masuk/Keluar (Syarat 3x Terpenuhi)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      badge: 'Syarat Lengkap',
      badgeClass: 'bg-blue-100 text-blue-800'
    },
    {
      title: '4. Uji Pemilik Sah',
      desc: 'Kunjungan #4 — Pemilik Sah Keluar (Status Normal / Palang Buka)',
      plate: 'B 1234 WLM',
      persona: 'driver_owner',
      event: 'EXIT',
      badge: 'Lolos Normal',
      badgeClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      title: '5. Uji Kasus Curanmor!',
      desc: 'Kunjungan #5 — Pengemudi Asing / Maling Membawa Kendaraan',
      plate: 'B 1234 WLM',
      persona: 'driver_thief',
      event: 'EXIT',
      badge: 'Peringatan Anomali',
      badgeClass: 'bg-red-100 text-red-800'
    },
    {
      title: '6. Uji Pengemudi Keluarga',
      desc: 'Kendaraan Dibawa Anggota Keluarga (Similarity Cukup Tinggi)',
      plate: 'B 1234 WLM',
      persona: 'driver_family',
      event: 'EXIT',
      badge: 'Profil Sekunder',
      badgeClass: 'bg-purple-100 text-purple-800'
    }
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlate.trim()) return;
    onRunSimulation(customPlate, customPersona, eventType);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Panel Pengujian & Skenario Simulasi Sidang
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          Klik tombol bertahap untuk mendemonstrasikan alur di depan dosen penguji
        </span>
      </div>

      {/* Preset Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onRunSimulation(preset.plate, preset.persona, preset.event)}
            disabled={isProcessing}
            className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100/80 text-left transition active:scale-[0.99] disabled:opacity-50 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">{preset.title}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${preset.badgeClass}`}>
                  {preset.badge}
                </span>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2">{preset.desc}</p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-blue-700 font-semibold">
              <span>Jalankan Skenario</span>
              <Play className="w-3 h-3 fill-current" />
            </div>
          </button>
        ))}
      </div>

      {/* Manual Input Form */}
      <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-slate-200 flex flex-wrap items-end gap-3 text-xs">
        <div className="flex-1 min-w-[170px]">
          <label className="font-semibold text-slate-700 block mb-1">
            Input Plat Nomor Kendaraan
          </label>
          <input
            type="text"
            value={customPlate}
            onChange={(e) => setCustomPlate(e.target.value)}
            placeholder="Contoh: B 1234 WLM"
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        <div className="w-48">
          <label className="font-semibold text-slate-700 block mb-1">
            Simulasi Identitas Pengemudi
          </label>
          <select
            value={customPersona}
            onChange={(e) => setCustomPersona(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="driver_owner">Pemilik Sah (Authorized Driver)</option>
            <option value="driver_family">Keluarga (Pengemudi Sah #2)</option>
            <option value="driver_thief">Pengemudi Asing / Maling</option>
          </select>
        </div>

        <div className="w-32">
          <label className="font-semibold text-slate-700 block mb-1">
            Arah Gerbang
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="EXIT">Pintu Keluar</option>
            <option value="ENTRY">Pintu Masuk</option>
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={isProcessing}
            className="px-4 py-2 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold transition flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
            {isProcessing ? 'Memproses...' : 'Uji Transaksi Manual'}
          </button>
        </div>
      </form>
    </div>
  );
};
