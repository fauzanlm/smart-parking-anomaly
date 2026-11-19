import React from 'react';
import { Car, Clock, LogOut, ShieldCheck } from 'lucide-react';
import { ParkingSession } from '../types';

interface ActiveParkingListProps {
  sessions: ParkingSession[];
  onSelectVehicleForExit: (plate: string) => void;
  onViewPhoto: (url: string) => void;
}

export const ActiveParkingList: React.FC<ActiveParkingListProps> = ({
  sessions,
  onSelectVehicleForExit,
  onViewPhoto
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Kendaraan Sedang Parkir (Sesi Aktif Gate-In)
          </h3>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2.5 py-0.5 rounded-full border border-blue-200">
          {sessions.length} Kendaraan di Dalam
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs">
          <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="font-medium text-slate-600">Tidak ada kendaraan di dalam area parkir saat ini.</p>
          <p className="text-slate-400 mt-0.5">
            Lakukan proses <strong className="text-blue-600">GATE-IN</strong> untuk merekam kendaraan masuk.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-4">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm bg-white px-2 py-0.5 rounded border border-slate-300">
                    {s.plate_number}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Parkir
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-2.5">
                  {s.entry_face_photo ? (
                    <img
                      src={s.entry_face_photo}
                      alt="Foto Masuk"
                      onClick={() => s.entry_face_photo && onViewPhoto(s.entry_face_photo)}
                      className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                      title="Klik untuk memperbesar foto wajah saat masuk"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center text-slate-400 text-[10px]">
                      No Img
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <div className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(s.entry_time).toLocaleTimeString('id-ID')} WIB</span>
                    </div>
                    <p className="text-slate-500 truncate max-w-[120px]">
                      {s.driver_persona === 'driver_owner' ? 'Pemilik Sah' : (s.driver_persona || 'Tercatat')}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectVehicleForExit(s.plate_number)}
                className="mt-3 w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-2xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Uji Keluar (Gate-Out)</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
