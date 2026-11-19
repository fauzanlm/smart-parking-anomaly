import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Camera, Video, VideoOff, Aperture, Upload, LogIn, LogOut, 
  ArrowRightLeft, Zap, ZapOff, RefreshCw, CheckCircle2, ShieldAlert, Timer, Activity
} from 'lucide-react';
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

  // Auto-Capture & Motion Detection System State
  const [isAutoCapture, setIsAutoCapture] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [motionLevel, setMotionLevel] = useState<number>(0);
  const [autoStatusMessage, setAutoStatusMessage] = useState<string>(
    'Sensor Siaga: Menunggu pergerakan kendaraan / orang di depan kamera...'
  );

  // Video element refs
  const video1Ref = useRef<HTMLVideoElement | null>(null);
  const video2Ref = useRef<HTMLVideoElement | null>(null);
  const video3Ref = useRef<HTMLVideoElement | null>(null);

  // MediaStream refs
  const stream1Ref = useRef<MediaStream | null>(null);
  const stream2Ref = useRef<MediaStream | null>(null);
  const stream3Ref = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isOcrScanningRef = useRef<boolean>(false);
  const lastSampleRef = useRef<Uint8Array | null>(null);
  const consecutiveMotionRef = useRef<number>(0);

  // Audio chimes
  const playBeep = (freq = 880, duration = 0.1) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Blocked or audio unavailable
    }
  };

  const playChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc2.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc1.start();
      osc2.start(audioCtx.currentTime + 0.1);
      osc1.stop(audioCtx.currentTime + 0.35);
      osc2.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

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
      setAutoStatusMessage('Kamera aktif. Menunggu pergerakan objek / kertas plat...');
    } catch (err: any) {
      console.error('Error starting cameras:', err);
      setCameraError('Akses kamera tidak diizinkan atau webcam sedang terpakai aplikasi lain.');
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
    setCountdown(null);
    setMotionLevel(0);
    lastSampleRef.current = null;
  };

  useEffect(() => {
    return () => {
      stopAllCameras();
    };
  }, []);

  // Frame capture helper
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

  // Simultaneous Capture Trigger
  const handleSimultaneousCapture = async () => {
    if (!isCamerasActive) return;

    const plateB64 = captureFrameFromVideo(video1Ref.current, 0.90);
    const faceB64 = captureFrameFromVideo(video2Ref.current, 0.88) || plateB64;
    const cam3B64 = captureFrameFromVideo(video3Ref.current, 0.95) || faceB64;

    if (!faceB64) {
      setCameraError('Gagal menangkap frame dari kamera. Pastikan kamera sudah aktif.');
      return;
    }

    playBeep(1200, 0.15); // Shutter sound
    await onCaptureLive(faceB64, plateB64 || undefined, cam3B64 || undefined);

    // Cooldown 8 seconds to prevent immediate re-trigger on the same movement
    if (isAutoCapture) {
      setCooldown(8);
      setAutoStatusMessage('✓ Transaksi selesai. Sensor cooldown (siaga untuk kendaraan berikutnya)...');
      lastSampleRef.current = null;
      consecutiveMotionRef.current = 0;
    }
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

  // =========================================================================
  // MOTION DETECTION ENGINE (Frame Differencing Sensor on Video 1 & 2)
  // =========================================================================
  const calculateMotion = (): number => {
    // Check motion primarily on Kamera 2 (Face) or Kamera 1 (Plate)
    const activeVideo = video2Ref.current || video1Ref.current;
    if (!activeVideo || activeVideo.readyState < 2) return 0;

    const w = 64;
    const h = 48;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 0;

    ctx.drawImage(activeVideo, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const currentSample = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      currentSample[j] = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    }

    if (!lastSampleRef.current || lastSampleRef.current.length !== currentSample.length) {
      lastSampleRef.current = currentSample;
      return 0;
    }

    let diffPixels = 0;
    const intensityThreshold = 32;
    for (let i = 0; i < currentSample.length; i++) {
      if (Math.abs(currentSample[i] - lastSampleRef.current[i]) > intensityThreshold) {
        diffPixels++;
      }
    }

    lastSampleRef.current = currentSample;
    const score = Math.round((diffPixels / (w * h)) * 100);
    return score;
  };

  // Motion Detection Polling Interval (runs 4 times/sec)
  useEffect(() => {
    if (!isCamerasActive || !isAutoCapture || isProcessing || countdown !== null || cooldown > 0) {
      return;
    }

    const interval = setInterval(() => {
      if (countdown !== null || cooldown > 0 || isProcessing) return;

      const currentScore = calculateMotion();
      setMotionLevel(currentScore);

      // Threshold: if > 12% pixel difference occurs (someone enters or moves in front of camera)
      if (currentScore >= 12) {
        consecutiveMotionRef.current += 1;
        // Require 2 consecutive frames of motion to prevent noise glitch
        if (consecutiveMotionRef.current >= 2) {
          consecutiveMotionRef.current = 0;
          playChime();
          setAutoStatusMessage('🚗 Pergerakan Kendaraan / Orang Terdeteksi! Menjalankan verifikasi dalam 5 detik...');
          // Start 5-second countdown as requested!
          setCountdown(5);
        }
      } else {
        consecutiveMotionRef.current = Math.max(0, consecutiveMotionRef.current - 1);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [isCamerasActive, isAutoCapture, isProcessing, countdown, cooldown]);

  // Cooldown timer (counts down 8..0)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          setAutoStatusMessage('Sensor Siaga: Menunggu pergerakan kendaraan / orang di depan kamera...');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // 5-Second Countdown Effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      playBeep(650 + (5 - countdown) * 90, 0.12);

      // While counting down (at 4s and 2s), attempt an OCR scan on Kamera 1 if plateNumber is still empty!
      if (!plateNumber && (countdown === 4 || countdown === 2) && !isOcrScanningRef.current) {
        const plateB64 = captureFrameFromVideo(video1Ref.current, 0.88);
        if (plateB64) {
          isOcrScanningRef.current = true;
          axios.post<{ success: boolean; plate_number?: string }>('/api/parking/ocr-plate', {
            image_base64: plateB64
          }).then((res) => {
            if (res.data.success && res.data.plate_number) {
              onPlateChange(res.data.plate_number);
            }
          }).catch(() => {}).finally(() => {
            isOcrScanningRef.current = false;
          });
        }
      }

      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      handleSimultaneousCapture();
    }
  }, [countdown, plateNumber]);

  return (
    <div className="space-y-3">
      {/* Top Controller Bar: Gate Selector, Motion Sensor Toggle & Master Camera Switch */}
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

        {/* Center: Motion Sensor Trigger Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsAutoCapture(!isAutoCapture);
              setCountdown(null);
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition border ${
              isAutoCapture
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title="Aktifkan/nonaktifkan pemicu otomatis berbasis deteksi pergerakan"
          >
            {isAutoCapture ? (
              <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-500" />
            ) : (
              <ZapOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Sensor Gerakan (5s Timer): {isAutoCapture ? 'AKTIF' : 'MATI (Manual)'}</span>
          </button>

          {/* Live Motion Energy Meter */}
          {isCamerasActive && isAutoCapture && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-mono text-slate-600" title="Tingkat pergerakan visual saat ini">
              <Activity className={`w-3 h-3 ${motionLevel >= 12 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span>Gerak: {motionLevel}%</span>
            </div>
          )}
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

      {/* Auto-Capture Status Banner with 5-Second Countdown */}
      {isCamerasActive && isAutoCapture && (
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition ${
          countdown !== null
            ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-sm'
            : cooldown > 0
            ? 'bg-blue-50 text-blue-800 border-blue-200'
            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          <div className="flex items-center gap-2">
            {countdown !== null ? (
              <Timer className="w-4 h-4 animate-spin text-slate-950" />
            ) : cooldown > 0 ? (
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            ) : (
              <Zap className="w-4 h-4 text-emerald-600" />
            )}
            <span>{autoStatusMessage}</span>
          </div>

          {countdown !== null && (
            <div className="flex items-center gap-2.5">
              <span className="text-sm font-black tracking-widest bg-slate-950 text-amber-300 px-3 py-0.5 rounded shadow-xs">
                JEPRET DALAM: {countdown} DETIK
              </span>
              <button
                onClick={() => {
                  setCountdown(null);
                  setAutoStatusMessage('Sensor Siaga: Menunggu pergerakan kendaraan / orang di depan kamera...');
                }}
                className="px-2.5 py-1 rounded bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition"
              >
                ✕ Batalkan
              </button>
            </div>
          )}

          {cooldown > 0 && (
            <span className="text-[11px] font-mono text-blue-700 font-bold">
              Cooldown: {cooldown}s
            </span>
          )}
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

            {/* Reticle / Target Scanner Box for Paper Plate */}
            {isCamerasActive && (
              <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-amber-400/80 rounded-md pointer-events-none flex flex-col items-center justify-between p-1.5 z-10">
                <span className="bg-amber-500/90 text-slate-950 font-bold text-[9px] px-2 py-0.5 rounded shadow-xs">
                  📄 TEMPATKAN KERTAS PLAT NOMOR DI SINI
                </span>
                {countdown !== null && (
                  <div className="w-full h-0.5 bg-amber-400 shadow-[0_0_8px_#f59e0b] animate-pulse" />
                )}
                <span className="text-[9px] text-amber-300 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                  ANPR OCR CAMERA
                </span>
              </div>
            )}

            {!isCamerasActive && (
              <div className="text-center p-3">
                <div className="bg-white border border-slate-300 rounded px-4 py-2 shadow-2xs inline-block">
                  <span className="block text-[8px] text-slate-400 font-mono font-bold tracking-wider">
                    TARGET PLAT KENDARAAN
                  </span>
                  <span className="font-mono text-base font-black tracking-widest text-slate-800">
                    {plateNumber || '— SIAPKAN KERTAS PLAT —'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">
                  Tunjukkan kertas bertuliskan plat ke Kamera 1
                </p>
              </div>
            )}

            {/* OCR scanning button */}
            {isCamerasActive && (
              <div className="absolute bottom-2 inset-x-0 z-20 flex justify-center">
                <button
                  onClick={handleScanPlateFromCam1}
                  disabled={isScanningPlate}
                  className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-sm transition active:scale-95 disabled:opacity-50"
                  title="Baca tulisan plat nomor di depan kamera 1"
                >
                  <Aperture className={`w-3 h-3 ${isScanningPlate ? 'animate-spin' : ''}`} />
                  {isScanningPlate ? 'Membaca Plat...' : '🔍 Pindai Plat Kertas (Cam 1)'}
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
                placeholder="Arahkan kertas plat / ketik"
                className="px-2 py-0.5 border border-slate-300 rounded font-mono font-bold text-xs text-slate-900 w-full focus:outline-none focus:ring-1 focus:ring-blue-600"
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
              CAM 02 ● {isCamerasActive ? 'LIVE STREAM' : 'STANDBY'}
            </div>

            <video
              ref={video2Ref}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamerasActive ? 'block' : 'hidden'}`}
            />

            {/* Face Oval Reticle Overlay */}
            {isCamerasActive && (
              <div className="absolute inset-x-14 inset-y-6 border-2 border-dashed border-blue-400/80 rounded-full pointer-events-none flex flex-col items-center justify-between p-2 z-10">
                <span className="bg-blue-600/90 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-xs">
                  👤 POSISIKAN WAJAH PENGENDARA
                </span>
                <span className="text-[8px] text-blue-200 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                  ARCFACE 128-D EMBEDDING
                </span>
              </div>
            )}

            {!isCamerasActive && (
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-300 mx-auto flex items-center justify-center text-slate-500 mb-2">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Sensor Biometrik Wajah</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ekstraksi fitur wajah ArcFace & pencocokan Cosine Similarity
                </p>
              </div>
            )}
          </div>

          {/* Footer Controls */}
          <div className="p-2.5 bg-white text-xs flex items-center justify-between font-medium text-slate-600 border-t border-slate-100">
            <span>Model: SCRFD + ArcFace</span>
            <span className="font-mono text-emerald-700 font-bold">Vektor 128-d</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* KAMERA 3: Resolusi Tinggi Bukti Anomali (Standby/Trigger)    */}
        {/* ============================================================ */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
          {/* Top Bar */}
          <div className={`px-3 py-2 border-b flex items-center justify-between text-xs transition ${
            isCam3Triggered ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${
                isCam3Triggered ? 'bg-red-600 animate-ping' : isCamerasActive ? 'bg-amber-500' : 'bg-slate-400'
              }`} />
              <span>KAMERA 3: BUKTI HI-RES</span>
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
              isCam3Triggered ? 'bg-red-600 text-white' : 'bg-white/80 text-slate-700'
            }`}>
              CAM 03 ● {isCam3Triggered ? 'TRIGGERED (BUKTI DIREKAM)' : 'STANDBY (SIAGA)'}
            </div>

            <video
              ref={video3Ref}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamerasActive ? 'block' : 'hidden'}`}
            />

            {!isCamerasActive && (
              <div className="text-center p-4">
                <div className="w-12 h-12 rounded-full bg-slate-200 border-2 border-slate-300 mx-auto flex items-center justify-center text-slate-500 mb-2">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">Kamera Bukti Forensik</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Standby pada kondisi normal, otomatis memotret saat anomali
                </p>
              </div>
            )}

            {/* Standby Watermark Banner */}
            {isCamerasActive && !isCam3Triggered && (
              <div className="absolute bottom-2 inset-x-2 z-10 bg-slate-900/60 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded text-center">
                Standby: Kamera resolusi tinggi siap merekam bukti jika anomali
              </div>
            )}

            {isCamerasActive && isCam3Triggered && (
              <div className="absolute inset-0 border-4 border-red-600 pointer-events-none animate-pulse flex items-center justify-center z-20">
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
              ? 'Tunjukkan kertas plat ke Kamera 1 saat tiba. Sensor gerakan otomatis memicu hitung mundur 5 detik untuk jepret simultan.'
              : 'Saat kendaraan keluar, sensor gerakan mendeteksi kehadiran & mencocokkan wajah. Jika berbeda, Kamera 3 otomatis trigger!'}
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
              ? '📸 Jepret Sekarang (Kamera 1 & 2) — GATE-IN'
              : '🔍 Jepret & Verifikasi (Kamera 1 & 2) — GATE-OUT'}
          </span>
        </button>
      </div>
    </div>
  );
};
