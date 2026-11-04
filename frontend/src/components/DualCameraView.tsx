import React from 'react';
import { Camera, Focus, Crosshair, Sparkles } from 'lucide-react';
import { VerificationResult } from '../types';

interface DualCameraViewProps {
  lastResult: VerificationResult | null;
  isProcessing: boolean;
}

export const DualCameraView: React.FC<DualCameraViewProps> = ({ lastResult, isProcessing }) => {
  const isAnomaly = lastResult?.status === 'ANOMALY';
  const highResTriggered = lastResult?.high_res_camera_triggered;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Camera 1: License Plate View */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-inner group">
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono text-cyan-400">
          <Camera className="w-3.5 h-3.5" />
          <span>CAM-01: ANPR (YOLOv8 + OCR)</span>
        </div>

        <div className="h-64 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Subtle grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Simulated Vehicle Front */}
          <div className="z-10 flex flex-col items-center text-center">
            <div className="w-40 h-10 border-2 border-dashed border-cyan-500/60 rounded-lg flex items-center justify-center relative p-1 bg-black/70 shadow-lg">
              <span className="absolute -top-3 left-2 bg-cyan-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                PLATE_BBOX [0.98]
              </span>
              <p className="font-mono text-xl font-bold tracking-widest text-white drop-shadow">
                {lastResult?.plate_number || 'B 1234 WLM'}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-mono">
              Vehicle Class: Passenger Car / MPV
            </p>
          </div>

          {/* Scanner Line Animation */}
          {isProcessing && (
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce top-1/3 z-20 shadow-[0_0_15px_#22d3ee]" />
          )}
        </div>

        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
          <span>Resolusi: 1920x1080 @ 30 FPS</span>
          <span className="text-cyan-400 font-mono font-medium">PaddleOCR: READY</span>
        </div>
      </div>

      {/* Camera 2: Driver Biometric View */}
      <div className={`relative rounded-2xl overflow-hidden border ${isAnomaly ? 'border-rose-500 shadow-rose-950/50 shadow-lg' : 'border-slate-800'} bg-slate-950/80 shadow-inner transition-all duration-300`}>
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono text-emerald-400">
          <Crosshair className="w-3.5 h-3.5" />
          <span>CAM-02: BIOMETRIC (SCRFD + ArcFace)</span>
        </div>

        {highResTriggered && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-md text-xs font-bold animate-pulse shadow-lg">
            <Sparkles className="w-3.5 h-3.5" />
            <span>HI-RES TRIGGERED!</span>
          </div>
        )}

        <div className="h-64 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Subtle grid lines */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]" />

          {/* Face Bounding Box & Landmarks */}
          <div className="z-10 flex flex-col items-center">
            <div className={`w-28 h-36 rounded-2xl border-2 ${isAnomaly ? 'border-rose-500 bg-rose-500/10' : 'border-emerald-500/80 bg-emerald-500/5'} flex flex-col items-center justify-center relative shadow-lg transition-all`}>
              <span className={`absolute -top-3 left-2 ${isAnomaly ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-black'} text-[10px] font-bold px-1.5 py-0.2 rounded font-mono`}>
                {isAnomaly ? 'UNMATCHED_FACE' : 'FACE_DETECTED [0.96]'}
              </span>

              {/* Landmark points mockup */}
              <div className="w-16 flex justify-between mb-4">
                <span className={`w-1.5 h-1.5 rounded-full ${isAnomaly ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                <span className={`w-1.5 h-1.5 rounded-full ${isAnomaly ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              </div>
              <span className={`w-1 h-1 rounded-full mb-3 ${isAnomaly ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              <div className="w-8 border-b-2 border-emerald-400/80 rounded" />
            </div>

            <p className="text-xs font-mono text-slate-400 mt-2">
              Persona: <span className="text-white font-semibold">{lastResult?.driver_persona || 'driver_owner'}</span>
            </p>
          </div>

          {/* Trigger Flash Effect */}
          {highResTriggered && (
            <div className="absolute inset-0 bg-rose-500/20 pointer-events-none animate-ping" />
          )}
        </div>

        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
          <span>Embedding Dimensi: 512-d (Unit Vector)</span>
          <span className={`${isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400'} font-mono`}>
            {isAnomaly ? 'Status: ANOMALY ALERT' : 'Status: NORMAL'}
          </span>
        </div>
      </div>
    </div>
  );
};
