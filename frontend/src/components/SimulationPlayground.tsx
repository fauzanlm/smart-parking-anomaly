import React, { useState } from 'react';
import { Play, FlaskConical, Car, LogIn, LogOut, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface SimulationPlaygroundProps {
  onRunSimulation: (plate: string, persona: string, gateMode: 'GATE_IN' | 'GATE_OUT') => Promise<void>;
  isProcessing: boolean;
}

export const SimulationPlayground: React.FC<SimulationPlaygroundProps> = ({
  onRunSimulation,
  isProcessing
}) => {
  const [customPlate, setCustomPlate] = useState('B 1234 WLM');
  const [customPersona, setCustomPersona] = useState('driver_owner');
  const [customGateMode, setCustomGateMode] = useState<'GATE_IN' | 'GATE_OUT'>('GATE_OUT');

  const presets = [
    {
      title: '1. [GATE-IN] Mobil Masuk Area Parkir',
      desc: 'Pemilik Masuk — Kamera merekam plat B 1234 WLM & fitur wajah disimpan ke sesi aktif',
      plate: 'B 1234 WLM',
      gateMode: 'GATE_IN' as const,
      persona: 'driver_owner',
      badge: 'Masuk Gerbang',
      badgeClass: 'bg-blue-100 text-blue-800'
    },
    {
      title: '2. [GATE-OUT] Keluar — Pengemudi Sah',
      desc: 'Pemilik Asli Keluar — Wajah cocok dengan saat Gate-In (~96%) -> NORMAL / Palang Buka',
      plate: 'B 1234 WLM',
      gateMode: 'GATE_OUT' as const,
      persona: 'driver_owner',
      badge: 'Lolos Normal',
      badgeClass: 'bg-emerald-100 text-emerald-800'
    },
    {
      title: '3. [GATE-IN] Mobil Kedua Masuk',
      desc: 'Mobil B 8888 SEC Masuk — Wajah pengemudi sah tercatat di database sesi aktif',
      plate: 'B 8888 SEC',
      gateMode: 'GATE_IN' as const,
      persona: 'driver_owner',
      badge: 'Masuk Gerbang',
      badgeClass: 'bg-blue-100 text-blue-800'
    },
    {
      title: '4. [GATE-OUT] Keluar — Dibawa Maling!',
      desc: 'Orang Asing Membawa Keluar — Wajah beda (<65%) -> ANOMALI / Palang Kunci & Alarm!',
      plate: 'B 8888 SEC',
      gateMode: 'GATE_OUT' as const,
      persona: 'driver_thief',
      badge: 'Peringatan Anomali',
      badgeClass: 'bg-red-100 text-red-800'
    },
    {
      title: '5. [GATE-OUT] Keluar — Tanpa Tiket Masuk',
      desc: 'Plat Tidak Terdata Masuk — Tidak ada data Gate-In -> ANOMALI / Palang Kunci',
      plate: 'B 9999 GHO',
      gateMode: 'GATE_OUT' as const,
      persona: 'driver_owner',
      badge: 'Tanpa Tiket Masuk',
      badgeClass: 'bg-amber-100 text-amber-800'
    }
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPlate.trim()) return;
    onRunSimulation(customPlate, customPersona, customGateMode);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Panel Pengujian & Skenario Simulasi Sidang (Alur Baru Dosen)
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          Klik tombol bertahap untuk mendemonstrasikan Gate-In vs Gate-Out di depan penguji
        </span>
      </div>

      {/* Preset Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 my-4">
        {presets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => onRunSimulation(preset.plate, preset.persona, preset.gateMode)}
            disabled={isProcessing}
            className="text-left p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-xs transition active:scale-[0.99] disabled:opacity-50 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-xs text-slate-900">{preset.title}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${preset.badgeClass}`}>
                  {preset.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {preset.desc}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <span>{preset.plate}</span>
              <span className="text-blue-700 font-sans font-semibold flex items-center gap-1">
                Jalankan <Play className="w-3 h-3 fill-current" />
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Custom Simulation Form */}
      <form onSubmit={handleCustomSubmit} className="pt-3 border-t border-slate-200 flex flex-wrap items-end gap-3 text-xs">
        <div className="w-36">
          <label className="font-semibold text-slate-700 block mb-1">
            Posisi Gerbang
          </label>
          <select
            value={customGateMode}
            onChange={(e) => setCustomGateMode(e.target.value as 'GATE_IN' | 'GATE_OUT')}
            className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="GATE_IN">🚪 GATE-IN (Masuk)</option>
            <option value="GATE_OUT">🏁 GATE-OUT (Keluar)</option>
          </select>
        </div>

        <div className="w-40">
          <label className="font-semibold text-slate-700 block mb-1">
            Nomor Polisi (Plat)
          </label>
          <input
            type="text"
            value={customPlate}
            onChange={(e) => setCustomPlate(e.target.value.toUpperCase())}
            placeholder="Contoh: B 1234 WLM"
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        <div className="w-52">
          <label className="font-semibold text-slate-700 block mb-1">
            Identitas Pengemudi
          </label>
          <select
            value={customPersona}
            onChange={(e) => setCustomPersona(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
          >
            <option value="driver_owner">Pemilik Sah (Authorized Driver)</option>
            <option value="driver_family">Keluarga (Pengemudi Sah #2)</option>
            <option value="driver_thief">Pengemudi Asing / Maling (Curanmor)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded text-xs transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Eksekusi Simulasi Kustom</span>
        </button>
      </form>
    </div>
  );
};
