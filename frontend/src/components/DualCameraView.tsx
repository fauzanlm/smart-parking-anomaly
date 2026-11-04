import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, VideoOff, Aperture, Upload } from 'lucide-react';
import { VerificationResult } from '../types';

interface DualCameraViewProps {
  lastResult: VerificationResult | null;
  isProcessing: boolean;
  onCaptureLive: (base64Image: string) => Promise<void>;
  onScanPlateImage: (base64Image: string) => Promise<void>;
  plateNumber: string;
  onPlateChange: (plate: string) => void;
  scannedPlatePhoto: string | null;
  ocrMessage: string | null;
  isScanningPlate: boolean;
}

export const DualCameraView: React.FC<DualCameraViewProps> = ({
  lastResult,
  isProcessing,
  onCaptureLive,
  onScanPlateImage,
  plateNumber,
  onPlateChange,
  scannedPlatePhoto,
  ocrMessage,
  isScanningPlate
}) => {
  const isAnomaly = lastResult?.status === 'ANOMALY';
  const highResTriggered = lastResult?.high_res_camera_triggered;

  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleCaptureFaceClick = () => {
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

  const handleScanPlateFromWebcam = () => {
    if (!videoRef.current || !isWebcamActive) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.90);
    onScanPlateImage(base64Image);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        onScanPlateImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* CAM 01: License Plate / OCR Camera */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
        {/* CCTV Top Header */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Kamera 1: Posisi Plat Nomor (OCR Kertas / Kendaraan)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-slate-700 text-xs font-medium flex items-center gap-1 transition shadow-2xs"
              title="Unggah foto kertas plat nomor dari komputer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span>Unggah Foto Kertas</span>
            </button>
          </div>
        </div>

        {/* Viewport Frame - Clean Light Surface */}
        <div className="h-64 bg-slate-100/70 border-b border-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="absolute top-2 left-3 font-mono text-[11px] text-slate-600 font-semibold tracking-wider z-20">
            CAM 01 ● POS PENGAMATAN PLAT
          </div>

          {scannedPlatePhoto ? (
            <img
              src={scannedPlatePhoto}
              alt="Hasil Scan Plat"
              className="w-full h-full object-contain z-10 rounded border border-slate-200 shadow-xs"
            />
          ) : (
            <div className="z-10 flex flex-col items-center text-center">
              {/* Standar Plat Putih Tulisan Hitam Korlantas Polri (Resmi Terbaru) */}
              <div className="bg-white border-2 border-slate-800 rounded-md px-6 py-2.5 shadow-sm min-w-[210px]">
                <span className="block text-[10px] text-slate-400 font-mono font-bold tracking-widest text-center">
                  POLRI — KORLANTAS INDONESIA
                </span>
                <p className="font-mono text-2xl font-black tracking-widest text-slate-900 mt-0.5">
                  {plateNumber || 'B 1234 WLM'}
                </p>
              </div>

              <p className="text-xs text-slate-600 mt-2 font-medium">
                Tunjukkan tulisan plat ke kamera, lalu klik <span className="font-bold text-blue-700">Pindai Kertas Plat</span>
              </p>
            </div>
          )}

          {ocrMessage && (
            <div className="absolute top-2 right-3 z-30 bg-white border border-slate-300 text-xs font-semibold text-slate-800 px-3 py-1 rounded shadow-md">
              {ocrMessage}
            </div>
          )}

          {isWebcamActive && (
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center">
              <button
                onClick={handleScanPlateFromWebcam}
                disabled={isScanningPlate}
                className="px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                <Aperture className={`w-3.5 h-3.5 ${isScanningPlate ? 'animate-spin' : ''}`} />
                {isScanningPlate ? 'Membaca Tulisan...' : 'Pindai Kertas Plat dari Webcam'}
              </button>
            </div>
          )}
        </div>

        {/* Footer controls & plate number editor */}
        <div className="p-3 bg-white text-xs flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Plat Terdeteksi:</span>
            <input
              type="text"
              value={plateNumber}
              onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
              className="px-2.5 py-1 border border-slate-300 rounded font-mono font-bold text-slate-900 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              placeholder="B 1234 WLM"
            />
          </div>
          <span className="text-blue-700 font-medium text-[11px]">Metode: Tesseract OCR + Normalisasi Pola</span>
        </div>
      </div>

      {/* CAM 02: Biometric Face Camera */}
      <div className={`bg-white border ${isAnomaly ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-lg overflow-hidden shadow-xs flex flex-col justify-between`}>
        {/* CCTV Top Header */}
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <span className={`w-2 h-2 rounded-full ${isWebcamActive ? 'bg-red-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>Kamera 2: Biometrik Pengemudi (SCRFD / ArcFace)</span>
          </div>

          <button
            onClick={isWebcamActive ? stopWebcam : startWebcam}
            className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
              isWebcamActive
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-2xs'
            }`}
          >
            {isWebcamActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            {isWebcamActive ? 'Matikan Kamera' : 'Buka Kamera Laptop'}
          </button>
        </div>

        {/* Viewport Frame - Clean Light Surface */}
        <div className="h-64 bg-slate-100/70 border-b border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-2 left-3 font-mono text-[11px] text-slate-600 font-semibold tracking-wider z-20">
            CAM 02 ● {isWebcamActive ? 'WEBCAM AKTIF' : 'STANDBY'}
          </div>

          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isWebcamActive ? 'block' : 'hidden'}`}
          />

          {!isWebcamActive && (
            <div className="z-10 flex flex-col items-center text-center p-4">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 mb-2 shadow-2xs">
                <Video className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-bold text-slate-800">Kamera Belum Aktif</p>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Klik tombol <strong className="text-blue-700">"Buka Kamera Laptop"</strong> di atas untuk mengaktifkan pemindaian langsung.
              </p>
              {webcamError && (
                <p className="text-xs text-red-600 mt-2 font-medium">{webcamError}</p>
              )}
            </div>
          )}

          {isWebcamActive && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-40 h-48 border-2 border-blue-600 border-dashed rounded-lg bg-blue-500/5" />
            </div>
          )}

          {isWebcamActive && (
            <div className="absolute bottom-3 inset-x-0 z-20 flex justify-center">
              <button
                onClick={handleCaptureFaceClick}
                disabled={isProcessing}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 shadow-md transition active:scale-95 disabled:opacity-50"
              >
                <Aperture className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                {isProcessing ? 'Memproses Citra...' : 'Ambil Foto & Verifikasi Pengemudi'}
              </button>
            </div>
          )}
        </div>

        <div className="p-3 bg-white text-xs flex justify-between items-center text-slate-600 font-medium">
          <span>Ekstraksi Biometrik: 128-d Vector</span>
          <span className={isAnomaly ? 'text-red-600 font-bold' : 'text-emerald-700'}>
            {isAnomaly ? 'Status: Anomali Terdeteksi' : 'Status: Normal'}
          </span>
        </div>
      </div>
    </div>
  );
};
