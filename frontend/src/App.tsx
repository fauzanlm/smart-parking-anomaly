import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { DualCameraView } from './components/DualCameraView';
import { VerificationPanel } from './components/VerificationPanel';
import { SimulationPlayground } from './components/SimulationPlayground';
import { LogsTable } from './components/LogsTable';
import { ForensicModal } from './components/ForensicModal';
import { VerificationResult, ParkingLog, SystemStats } from './types';

export const App: React.FC = () => {
  const [lastResult, setLastResult] = useState<VerificationResult | null>(null);
  const [logs, setLogs] = useState<ParkingLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [evidenceModalUrl, setEvidenceModalUrl] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [currentPlate, setCurrentPlate] = useState<string>('B 1234 WLM');
  const wsRef = useRef<WebSocket | null>(null);

  const playAlertSound = (type: 'NORMAL' | 'ANOMALY') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'ANOMALY') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(400, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        osc.frequency.setValueAtTime(880.00, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('AudioContext disabled or not permitted yet:', e);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        axios.get<ParkingLog[]>('/api/parking/logs'),
        axios.get<SystemStats>('/api/stats')
      ]);
      setLogs(logsRes.data);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load initial parking data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => setWsConnected(true);
    socket.onclose = () => setWsConnected(false);
    socket.onerror = () => setWsConnected(false);

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'PARKING_EVENT') {
          setLastResult(msg.data);
          fetchInitialData();
        } else if (msg.type === 'SYSTEM_RESET') {
          setLastResult(null);
          fetchInitialData();
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    wsRef.current = socket;

    return () => {
      socket.close();
    };
  }, []);

  // Handle Real Webcam Live Snapshot
  const handleCaptureLive = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const res = await axios.post<VerificationResult>('/api/parking/process-live', {
        plate_number: currentPlate,
        image_base64: base64Image,
        event_type: 'EXIT'
      });
      setLastResult(res.data);
      playAlertSound(res.data.status);
      await fetchInitialData();
    } catch (err) {
      console.error('Error during live webcam verification:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Simulation Scenarios
  const handleRunSimulation = async (plate: string, persona: string, eventType: string) => {
    setIsProcessing(true);
    setCurrentPlate(plate);
    try {
      const res = await axios.post<VerificationResult>('/api/parking/process', {
        plate_number: plate,
        driver_person_id: persona,
        event_type: eventType
      });

      setLastResult(res.data);
      playAlertSound(res.data.status);
      await fetchInitialData();
    } catch (err) {
      console.error('Error during simulation scan:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await axios.post('/api/parking/reset');
      setLastResult(null);
      await fetchInitialData();
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      <Navbar onReset={handleReset} isResetting={isResetting} wsConnected={wsConnected} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        <StatsOverview stats={stats} />

        {/* Dual Camera View (with Live Webcam Support) */}
        <DualCameraView
          lastResult={lastResult}
          isProcessing={isProcessing}
          onCaptureLive={handleCaptureLive}
          plateNumber={currentPlate}
        />

        {/* Verification and Security Gate Banner */}
        <VerificationPanel
          result={lastResult}
          onOpenEvidence={(url) => setEvidenceModalUrl(url)}
        />

        {/* Interactive Playgrounds & Scenarios */}
        <SimulationPlayground
          onRunSimulation={handleRunSimulation}
          isProcessing={isProcessing}
        />

        {/* Real-time Log Table */}
        <LogsTable
          logs={logs}
          onViewEvidence={(url) => setEvidenceModalUrl(url)}
        />
      </main>

      <ForensicModal
        imageUrl={evidenceModalUrl}
        onClose={() => setEvidenceModalUrl(null)}
      />

      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>
          Sistem Pengenalan Wajah Pengendara & Plat Nomor Cerdas © {new Date().getFullYear()} — Karya Skripsi William
        </p>
        <p className="mt-1 font-mono text-slate-600">
          Powered by YOLOv8 (OCR ANPR) • YuNet (Face Detection) • SFace (Deep Biometrics 128-d)
        </p>
      </footer>
    </div>
  );
};
