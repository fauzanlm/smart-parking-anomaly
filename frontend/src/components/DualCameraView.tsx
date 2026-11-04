import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, VideoOff, Aperture, AlertCircle } from 'lucide-react';
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
      setWebcamError('Akses kamera tidak diizinkan atau kamera tidak terdeteksi.');
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
      {/* CAM 01: License Plate Camera */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
        {/* CCTV Top Header */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Camera className="w-4 h-4 text-slate-600" />
            <span>Kamera 1: Posisi Plat Nomor (YOLOv8 + OCR)</span>
          </div>
          <span className="text-slate-500 font-mono">1080P | 30 FPS</span>
        </div>

        {/* Viewport Frame */}
        <div className="h-64 bg-slate-900 flex flex-col items-center justify-center p-6 relative">
          {/* CCTV Timestamp Overlay */}
          <div className="absolute top-2 left-3 font-mono text-[11px] text-emerald-400 font-semibold tracking-wider">
            CAM 01 ● LIVE
          </div>

          <div className="z-10 flex flex-col items-center text-center">
            {/* Indonesian Plate Display Box */}
            <div className="bg-black border-2 border-white rounded-md px-6 py-2 shadow-lg">
              <span className="block text-[10px] text-slate-400 font-mono font-bold tracking-widest text-center">
                POLRI - REPUBLIK INDONESIA
              </span>
              <p className="font-mono text-2xl font-bold tracking-widest text-white drop-shadow mt-0.5">
                {lastResult?.plate_number || plateNumber || 'B 1234 WLM'}
              </p>
            </div>
            <p className="text-xs text-slate-400 mt-3 font-mono">
              Status Plat: Terbaca Otomatis
            </p>
          </div>

          {isProcessing && (
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-yellow-400 animate-pulse" />
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200 text-xs flex justify-between items-center text-slate-600 font-medium">
          <span>Deteksi Objek: YOLOv8-Vehicle</span>
          <span className="text-blue-700 font-mono">OCR: PaddleOCR Aktif</span>
        </div>
      </div>

      {/* CAM 02: Biometric Face Camera */}
      <div className={`bg-white border ${isAnomaly ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-lg overflow-hidden shadow-sm flex flex-col`}>
        {/* CCTV Top Header */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <span className={`w-2 h-2 rounded-full ${isWebcamActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Kamera 2: Biometrik Pengemudi (SCRFD / ArcFace)</span>
          </div>

          <button
            onClick={isWebcamActive ? stopWebcam : startWebcam}
            className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              isWebcamActive
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isWebcamActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            {isWebcamActive ? 'Matikan Kamera' : 'Buka Kamera Laptop'}
          </button>
        </div>

        {/* Viewport Frame */}
        <div className="h-64 bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
          {/* CCTV Live Tag */}
          <div className="absolute top-2 left-3 font-mono text-[11px] text-emerald-400 font-semibold tracking-wider z-20">
            CAM 02 ● {isWebcamActive ? 'WEBCAM ON' : 'STANDBY'}
          </div>

          {/* Video Stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
          />

          {/* Standby Placeholder */}
          {!isWebcamActive && (
            <div className="z-10 flex flex-col items-center text-center p-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mb-2">
                <Video className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-slate-200">Kamera Fisik Belum Dinyalakan</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Klik tombol <strong className="text-blue-400">"Buka Kamera Laptop"</strong> di atas untuk memindai wajah langsung lewat webcam William.
              </p>
              {webcamError && (
                <p className="text-xs text-red-400 mt-2 font-medium">{webcamError}</p>
              )}
            </div>
          )}

          {/* Target Guide when webcam is active */}
          {isWebcamActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-48 border-2 border-white/60 border-dashed rounded-lg" />
            </div>
          )}

          {/* Floating Capture Button */}
          {isWebcamActive && (
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center">
              <button
                onClick={handleCaptureClick}
                disabled={isProcessing}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Aperture className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Memproses Citra...' : 'Ambil Foto & Verifikasi'}
              </button>
            </div>
          )}
        </div>

        <div className="p-3 bg-white border-t border-slate-200 text-xs flex justify-between items-center text-slate-600 font-medium">
          <span>Ekstraksi Biometrik: 128-d Vector</span>
          <span className={isAnomaly ? 'text-red-600 font-bold' : 'text-emerald-700'}>
            {isAnomaly ? 'Peringatan: Anomali Terdeteksi' : 'Status: Normal'}
          </span>
        </div>
      </div>
    </div>
  );
};
