import React, { useRef, useState, useEffect } from 'react';
import { Camera, Crosshair, Sparkles, Video, VideoOff, Aperture } from 'lucide-react';
import { VerificationResult } from '../types';

interface DualCameraViewProps {
  lastResult: VerificationResult | null;
  isProcessing: boolean;
  onCaptureLive: (base64Image: string) => Promise<void>;
  plateNumber: string;
}

export const DualCameraView: React.FC<DualCameraViewProps> = ({
  lastResult,
  isProcessing,
  onCaptureLive,
  plateNumber
}) => {
  const isAnomaly = lastResult?.status === 'ANOMALY';
  const highResTriggered = lastResult?.high_res_camera_triggered;

  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startWebcam = async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsWebcamActive(true);
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setWebcamError('Izin akses webcam ditolak atau kamera tidak ditemukan.');
      setIsWebcamActive(false);
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  const handleCaptureClick = () => {
    if (!videoRef.current || !isWebcamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.85);
    onCaptureLive(base64Image);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Camera 1: License Plate View */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 shadow-inner group">
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono text-cyan-400">
          <Camera className="w-3.5 h-3.5" />
          <span>CAM-01: ANPR (YOLOv8 + OCR)</span>
        </div>

        <div className="h-72 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px]" />

          <div className="z-10 flex flex-col items-center text-center">
            <div className="w-44 h-12 border-2 border-dashed border-cyan-500/60 rounded-lg flex items-center justify-center relative p-1 bg-black/80 shadow-xl">
              <span className="absolute -top-3 left-2 bg-cyan-500 text-black text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">
                PLATE_BBOX [0.98]
              </span>
              <p className="font-mono text-2xl font-bold tracking-widest text-white drop-shadow">
                {lastResult?.plate_number || plateNumber || 'B 1234 WLM'}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-mono">
              Kelas Kendaraan: Mobil Penumpang / SUV
            </p>
          </div>

          {isProcessing && (
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce top-1/3 z-20 shadow-[0_0_15px_#22d3ee]" />
          )}
        </div>

        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
          <span>Resolusi: 1920x1080 @ 30 FPS</span>
          <span className="text-cyan-400 font-mono font-medium">PaddleOCR: ACTIVE</span>
        </div>
      </div>

      {/* Camera 2: Driver Biometric View (Live Webcam capable) */}
      <div className={`relative rounded-2xl overflow-hidden border ${isAnomaly ? 'border-rose-500 shadow-rose-950/50 shadow-lg' : 'border-slate-800'} bg-slate-950/80 shadow-inner transition-all duration-300`}>
        {/* Top Control Overlay */}
        <div className="absolute top-3 inset-x-3 z-30 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-2.5 py-1 rounded-md text-xs font-mono text-emerald-400 pointer-events-auto">
            <Crosshair className="w-3.5 h-3.5" />
            <span>CAM-02: {isWebcamActive ? 'REAL WEBCAM LIVE' : 'BIOMETRIC SENSOR'}</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {highResTriggered && (
              <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-1 rounded-md text-xs font-bold animate-pulse shadow-lg">
                <Sparkles className="w-3.5 h-3.5" />
                <span>HI-RES TRIGGERED!</span>
              </div>
            )}

            <button
              onClick={isWebcamActive ? stopWebcam : startWebcam}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition shadow ${isWebcamActive ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30' : 'bg-emerald-600 text-white hover:bg-emerald-500'}`}
            >
              {isWebcamActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
              <span>{isWebcamActive ? 'Matikan Kamera' : 'Nyalakan Webcam'}</span>
            </button>
          </div>
        </div>

        {/* Camera Viewport */}
        <div className="h-72 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
          />

          {/* Webcam Inactive Placeholder / HUD */}
          {!isWebcamActive && (
            <div className="z-10 flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-2">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-200">Kamera Fisik Belum Aktif</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Klik tombol <strong className="text-emerald-400">"Nyalakan Webcam"</strong> di atas untuk memindai wajah langsung dari kamera laptop William.
              </p>
              {webcamError && (
                <p className="text-xs text-rose-400 mt-2 font-mono">{webcamError}</p>
              )}
            </div>
          )}

          {/* Bounding box guide when active */}
          {isWebcamActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-56 border-2 border-emerald-400/70 border-dashed rounded-3xl relative">
                <span className="absolute -top-3 left-3 bg-emerald-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                  TARGET AREA PENGEMUDI
                </span>
              </div>
            </div>
          )}

          {/* Trigger Flash Effect */}
          {highResTriggered && (
            <div className="absolute inset-0 bg-rose-500/25 pointer-events-none animate-ping" />
          )}

          {/* Floating Capture Live Button */}
          {isWebcamActive && (
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center">
              <button
                onClick={handleCaptureClick}
                disabled={isProcessing}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-xl shadow-emerald-950/60 transition active:scale-95 disabled:opacity-50"
              >
                <Aperture className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Memproses Biometrik...' : '📸 Pindai Wajah Saya (Capture Live)'}
              </button>
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-900/80 border-t border-slate-800 text-xs flex justify-between items-center text-slate-400">
          <span>AI Biometrik: YuNet (Detection) + SFace (Deep Matching)</span>
          <span className={`${isAnomaly ? 'text-rose-400 font-bold' : 'text-emerald-400'} font-mono`}>
            {isWebcamActive ? 'STREAMING REAL-TIME' : 'SIMULATION MODE READY'}
          </span>
        </div>
      </div>
    </div>
  );
};
