import React, { useRef, useState, useEffect } from 'react';
import { Camera, Video, VideoOff, Aperture, Upload, LogIn, LogOut, ArrowRightLeft, ShieldAlert, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import { VerificationResult } from '../types';

interface TripleCameraViewProps {
  lastResult: VerificationResult | null;
  isProcessing: boolean;
  onCaptureLive: (faceImageBase64: string, plateImageBase64?: string, camera3ImageBase64?: string) => Promise<void>;
  onScanPlateImage: (base64Image: string) => Promise<void>;
  plateNumber: string;
  onPlateChange: (plate: string) => void;
  scannedPlatePhoto: string | null;
  ocrMessage: string | null;
  isScanningPlate: boolean;
  gateMode: 'GATE_IN' | 'GATE_OUT';
  onGateModeChange: (mode: 'GATE_IN' | 'GATE_OUT') => void;
}

interface MediaDeviceInfoItem {
  deviceId: string;
  label: string;
}

export const TripleCameraView: React.FC<TripleCameraViewProps> = ({
  lastResult,
  isProcessing,
  onCaptureLive,
  onScanPlateImage,
  plateNumber,
  onPlateChange,
  scannedPlatePhoto,
  ocrMessage,
  isScanningPlate,
  gateMode,
  onGateModeChange
}) => {
  const isAnomaly = lastResult?.status === 'ANOMALY';
  const isGateIn = gateMode === 'GATE_IN';
  const isCam3Triggered = lastResult?.camera_3_triggered || (isAnomaly && !isGateIn);

  // Available camera devices list
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfoItem[]>([]);
  const [selectedCam1Id, setSelectedCam1Id] = useState<string>('');
  const [selectedCam2Id, setSelectedCam2Id] = useState<string>('');
  const [selectedCam3Id, setSelectedCam3Id] = useState<string>('');

  // Stream active states
  const [isCamerasActive, setIsCamerasActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Video element refs
  const video1Ref = useRef<HTMLVideoElement | null>(null);
  const video2Ref = useRef<HTMLVideoElement | null>(null);
  const video3Ref = useRef<HTMLVideoElement | null>(null);

  // MediaStream refs
  const stream1Ref = useRef<MediaStream | null>(null);
  const stream2Ref = useRef<MediaStream | null>(null);
  const stream3Ref = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Enumerate connected video inputs
  const enumerateCameras = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, idx) => ({
          deviceId: d.deviceId,
          label: d.label || `Kamera ${idx + 1} (${d.deviceId.slice(0, 8)}...)`
        }));

      setVideoDevices(videoInputs);

      if (videoInputs.length > 0) {
        setSelectedCam1Id((prev) => prev || videoInputs[0].deviceId);
        setSelectedCam2Id((prev) => prev || (videoInputs[1]?.deviceId || videoInputs[0].deviceId));
        setSelectedCam3Id((prev) => prev || (videoInputs[2]?.deviceId || videoInputs[0].deviceId));
      }
    } catch (err) {
      console.warn('Failed to enumerate devices:', err);
    }
  };

  useEffect(() => {
    enumerateCameras();
    navigator.mediaDevices?.addEventListener('devicechange', enumerateCameras);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', enumerateCameras);
    };
  }, []);

  // 2. Start specific camera stream
  const startStreamForCamera = async (
    deviceId: string,
    videoRef: React.RefObject<HTMLVideoElement | null>,
    streamRef: React.MutableRefObject<MediaStream | null>
  ) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } }
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    return stream;
  };

  // 3. Start all 3 cameras
  const startAllCameras = async () => {
    setCameraError(null);
    try {
      // First ask permission to get real device labels if empty
      const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
      initialStream.getTracks().forEach((t) => t.stop());
      await enumerateCameras();

      // Start Cam 1 (Plate)
      await startStreamForCamera(selectedCam1Id, video1Ref, stream1Ref);

      // Start Cam 2 (Face)
      try {
        await startStreamForCamera(selectedCam2Id, video2Ref, stream2Ref);
      } catch (e) {
        console.warn('Cam 2 fallback to default:', e);
        if (video2Ref.current && stream1Ref.current) {
          video2Ref.current.srcObject = stream1Ref.current;
        }
      }

      // Start Cam 3 (Hi-Res Standby)
      try {
        await startStreamForCamera(selectedCam3Id, video3Ref, stream3Ref);
      } catch (e) {
        console.warn('Cam 3 fallback to default:', e);
        if (video3Ref.current && stream1Ref.current) {
          video3Ref.current.srcObject = stream1Ref.current;
        }
      }

      setIsCamerasActive(true);
    } catch (err: any) {
      console.error('Error starting cameras:', err);
      setCameraError('Akses kamera tidak diizinkan atau port USB webcam sedang terpakai aplikasi lain.');
      setIsCamerasActive(false);
    }
  };

  // 4. Stop all streams
  const stopAllCameras = () => {
    [stream1Ref, stream2Ref, stream3Ref].forEach((ref) => {
      if (ref.current) {
        ref.current.getTracks().forEach((t) => t.stop());
        ref.current = null;
      }
    });
    [video1Ref, video2Ref, video3Ref].forEach((ref) => {
      if (ref.current) {
        ref.current.srcObject = null;
      }
    });
    setIsCamerasActive(false);
  };

  useEffect(() => {
    return () => {
      stopAllCameras();
    };
  }, []);

  // Capture frame helper
  const captureFrameFromVideo = (videoElement: HTMLVideoElement | null, quality = 0.88): string | null => {
    if (!videoElement || videoElement.readyState < 2) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  };

  // Unified Simultaneous Capture: Cam 1 (Plate) + Cam 2 (Face) + Cam 3 (Standby/Hi-Res)
  const handleSimultaneousCapture = () => {
    if (!isCamerasActive) return;

    const plateB64 = captureFrameFromVideo(video1Ref.current, 0.90);
    const faceB64 = captureFrameFromVideo(video2Ref.current, 0.88) || plateB64;
    const cam3B64 = captureFrameFromVideo(video3Ref.current, 0.95) || faceB64;

    if (!faceB64) {
      setCameraError('Gagal menangkap frame dari kamera. Pastikan kamera sudah aktif.');
      return;
    }

    onCaptureLive(faceB64, plateB64 || undefined, cam3B64 || undefined);
  };

  // Single OCR scan from Cam 1
  const handleScanPlateFromCam1 = () => {
    const plateB64 = captureFrameFromVideo(video1Ref.current, 0.92);
    if (plateB64) {
      onScanPlateImage(plateB64);
    }
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
    <div className="space-y-3">
      {/* Top Controller Bar: Mode Toggle & Master Camera Switch */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Gate Mode Selector */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
            <ArrowRightLeft className="w-4 h-4 text-slate-500" />
            Pos Gerbang:
          </span>

          <div className="flex items-center gap-1.5 flex-1 md:flex-initial">
            <button
              onClick={() => onGateModeChange('GATE_IN')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                isGateIn
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>GATE-IN (Masuk)</span>
            </button>

            <button
              onClick={() => onGateModeChange('GATE_OUT')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition ${
                !isGateIn
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>GATE-OUT (Keluar)</span>
            </button>
          </div>
        </div>

        {/* Master Camera Activation Button & Hardware Count */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Terdeteksi: <strong>{videoDevices.length} Kamera</strong></span>
            <button
              onClick={enumerateCameras}
              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
              title="Refresh daftar kamera"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          <button
            onClick={isCamerasActive ? stopAllCameras : startAllCameras}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 shadow-xs ${
              isCamerasActive
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isCamerasActive ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            <span>{isCamerasActive ? 'Matikan Semua Kamera' : 'Nyalakan 3 Kamera (Live Feed)'}</span>
          </button>
        </div>
      </div>

      {cameraError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-medium text-red-700">
          ⚠️ {cameraError}
        </div>
      )}

      {/* 3 CAMERAS GRID (Triple CCTV Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ============================================================ */}
        {/* KAMERA 1: Plat Nomor Kendaraan (ANPR OCR View)              */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
          {/* Top Bar */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Camera className="w-4 h-4 text-blue-600" />
              <span>KAMERA 1: PLAT (ANPR)</span>
            </div>

            {/* Device selection dropdown */}
            {videoDevices.length > 0 && (
              <select
                value={selectedCam1Id}
                onChange={async (e) => {
                  setSelectedCam1Id(e.target.value);
                  if (isCamerasActive) {
                    await startStreamForCamera(e.target.value, video1Ref, stream1Ref);
                  }
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-700 max-w-[120px] truncate focus:outline-none"
                title="Pilih input fisik webcam untuk Kamera 1"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Device ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Viewport Frame */}
          <div className="h-56 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2.5 font-mono text-[10px] text-slate-700 font-bold bg-white/80 px-2 py-0.5 rounded shadow-2xs z-20">
              CAM 01 ● {isCamerasActive ? 'LIVE STREAM' : 'STANDBY'}
            </div>

            <video
              ref={video1Ref}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamerasActive ? 'block' : 'hidden'}`}
            />

            {!isCamerasActive && (
              <div className="text-center p-3">
                <div className="bg-white border border-slate-800 rounded px-4 py-1.5 shadow-2xs inline-block">
                  <span className="block text-[8px] text-slate-400 font-mono font-bold tracking-wider">
                    KORLANTAS POLRI
                  </span>
                  <span className="font-mono text-lg font-black tracking-widest text-slate-900">
                    {plateNumber || 'B 1234 WLM'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Kamera pengenal plat nomor otomatis (ANPR)
                </p>
              </div>
            )}

            {/* OCR scanning overlay button */}
            {isCamerasActive && (
              <div className="absolute bottom-2 inset-x-0 z-20 flex justify-center">
                <button
                  onClick={handleScanPlateFromCam1}
                  disabled={isScanningPlate}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-sm transition active:scale-95 disabled:opacity-50"
                  title="Baca tulisan plat nomor di depan kamera 1"
                >
                  <Aperture className={`w-3 h-3 ${isScanningPlate ? 'animate-spin' : ''}`} />
                  {isScanningPlate ? 'Membaca...' : 'Scan Plat dari Cam 1'}
                </button>
              </div>
            )}

            {ocrMessage && (
              <div className="absolute top-2 right-2 z-30 bg-white border border-slate-300 text-[11px] font-semibold text-slate-800 px-2.5 py-0.5 rounded shadow-sm">
                {ocrMessage}
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-2.5 bg-white text-xs flex items-center justify-between gap-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[11px] text-slate-500 font-medium">Plat:</span>
              <input
                type="text"
                value={plateNumber}
                onChange={(e) => onPlateChange(e.target.value.toUpperCase())}
                placeholder="B 1234 WLM"
                className="px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs text-slate-900 w-28 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 transition"
              title="Unggah foto plat/kertas dari file"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KAMERA 2: Biometrik Pengendara (Face Driver View)            */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
          {/* Top Bar */}
          <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <span className={`w-2 h-2 rounded-full ${isCamerasActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span>KAMERA 2: WAJAH (SCRFD)</span>
            </div>

            {videoDevices.length > 0 && (
              <select
                value={selectedCam2Id}
                onChange={async (e) => {
                  setSelectedCam2Id(e.target.value);
                  if (isCamerasActive) {
                    await startStreamForCamera(e.target.value, video2Ref, stream2Ref);
                  }
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-700 max-w-[120px] truncate focus:outline-none"
                title="Pilih input fisik webcam untuk Kamera 2"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Device ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Viewport Frame */}
          <div className="h-56 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2.5 font-mono text-[10px] text-slate-700 font-bold bg-white/80 px-2 py-0.5 rounded shadow-2xs z-20">
              CAM 02 ● {isCamerasActive ? 'LIVE BIOMETRIC' : 'STANDBY'}
            </div>

            <video
              ref={video2Ref}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamerasActive ? 'block' : 'hidden'}`}
            />

            {!isCamerasActive && (
              <div className="text-center p-3 text-slate-500">
                <Video className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Kamera Wajah Standby</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Mengekstrak ciri biometrik ArcFace</p>
              </div>
            )}

            {isCamerasActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-28 h-36 border-2 border-emerald-500 border-dashed rounded-lg bg-emerald-500/5" />
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-2.5 bg-white text-xs flex items-center justify-between text-slate-600 font-medium border-t border-slate-100">
            <span className="text-[11px]">Vektor: YuNet + SFace (128-d)</span>
            <span className="text-[11px] font-bold text-emerald-700">Live Stream Aktif</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KAMERA 3: Bukti Resolusi Tinggi (Standby / Anomaly Trigger)  */}
        {/* ============================================================ */}
        <div className={`bg-white border rounded-lg overflow-hidden shadow-xs flex flex-col justify-between transition ${
          isCam3Triggered ? 'border-red-400 ring-2 ring-red-200' : 'border-slate-200'
        }`}>
          {/* Top Bar */}
          <div className={`px-3 py-2 border-b flex items-center justify-between text-xs ${
            isCam3Triggered ? 'bg-red-50 border-red-200 text-red-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              {isCam3Triggered ? (
                <ShieldAlert className="w-4 h-4 text-red-600 animate-bounce" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-600" />
              )}
              <span>KAMERA 3: HI-RES BUKTI</span>
            </div>

            {videoDevices.length > 0 && (
              <select
                value={selectedCam3Id}
                onChange={async (e) => {
                  setSelectedCam3Id(e.target.value);
                  if (isCamerasActive) {
                    await startStreamForCamera(e.target.value, video3Ref, stream3Ref);
                  }
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[10px] text-slate-700 max-w-[120px] truncate focus:outline-none"
                title="Pilih input fisik webcam untuk Kamera 3"
              >
                {videoDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Device ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Viewport Frame */}
          <div className="h-56 bg-slate-100 border-b border-slate-200 flex flex-col items-center justify-center relative overflow-hidden">
            <div className={`absolute top-2 left-2.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs z-20 ${
              isCam3Triggered ? 'bg-red-600 text-white animate-pulse' : 'bg-white/80 text-slate-700'
            }`}>
              CAM 03 ● {isCam3Triggered ? '🚨 TRIGGERED (ANOMALI)' : 'STANDBY (SIAGA)'}
            </div>

            <video
              ref={video3Ref}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamerasActive ? 'block' : 'hidden'}`}
            />

            {!isCamerasActive && (
              <div className="text-center p-3 text-slate-500">
                <ShieldAlert className="w-8 h-8 text-amber-500 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Kamera Siaga (Standby)</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Otomatis menjepret saat status ANOMALI
                </p>
              </div>
            )}

            {/* Standby Watermark Banner */}
            {isCamerasActive && !isCam3Triggered && (
              <div className="absolute bottom-2 inset-x-2 z-10 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded text-center">
                Standby: Menunggu status pencocokan gerbang
              </div>
            )}

            {isCamerasActive && isCam3Triggered && (
              <div className="absolute inset-0 border-4 border-red-600 pointer-events-none animate-pulse flex items-center justify-center">
                <div className="bg-red-600 text-white font-bold text-xs px-3 py-1 rounded shadow-md">
                  TRIGGERED! BUKTI FORENSIK DIREKAM
                </div>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className={`p-2.5 text-xs flex items-center justify-between font-medium border-t ${
            isCam3Triggered ? 'bg-red-50 text-red-700 border-red-200 font-bold' : 'bg-white text-slate-500 border-slate-100'
          }`}>
            <span>
              {isCam3Triggered ? 'Bukti Forensik: Tersimpan' : 'Status: Siaga (Tidak Memicu)'}
            </span>
            <span className="text-[10px] font-mono">Resolusi Penuh (Hi-Res)</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MASTER ACTION BUTTON: SIMULTANEOUS CAPTURE (FLOWCHART ACTION) */}
      {/* ============================================================ */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <p className="font-bold text-slate-800">
            {isGateIn ? 'Fase Gerbang Masuk (GATE-IN):' : 'Fase Gerbang Keluar (GATE-OUT):'}
          </p>
          <p className="text-[11px] text-slate-500">
            {isGateIn
              ? 'Kamera 1 merekam plat nomor & Kamera 2 merekam wajah masuk secara simultan.'
              : 'Kamera 1 & 2 mengambil gambar. Jika wajah tidak cocok, Kamera 3 otomatis melakukan trigger!'}
          </p>
        </div>

        <button
          onClick={handleSimultaneousCapture}
          disabled={isProcessing || !isCamerasActive}
          className={`w-full sm:w-auto px-6 py-2.5 rounded-md font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-40 text-white ${
            isGateIn
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-emerald-700 hover:bg-emerald-800'
          }`}
        >
          <Aperture className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>
            {isProcessing
              ? 'Memproses Inferensi...'
              : isGateIn
              ? '📸 Tangkap Citra Masuk (Kamera 1 & 2) — GATE-IN'
              : '🔍 Pindai & Verifikasi Keluar (Kamera 1 & 2) — GATE-OUT'}
          </span>
        </button>
      </div>
    </div>
  );
};
