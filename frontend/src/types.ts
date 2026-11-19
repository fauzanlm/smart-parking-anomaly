export interface VerificationResult {
  log_id: number;
  session_id?: number | null;
  plate_number: string;
  gate_mode: 'GATE_IN' | 'GATE_OUT';
  event_type: string;
  timestamp: string;
  status: 'NORMAL' | 'ANOMALY';
  similarity_score: number | null;
  similarity_percentage: number | null;
  threshold: number;
  decision_notes: string;
  gate_action: 'OPEN' | 'LOCK';
  high_res_camera_triggered: boolean;
  camera_3_triggered?: boolean;
  face_photo_url: string | null;
  plate_photo_url: string | null;
  entry_photo_url: string | null;
  exit_photo_url: string | null;
  baseline_photo_url: string | null;
  anomaly_evidence_url: string | null;
  camera_1_plate_photo_url?: string | null;
  camera_2_face_photo_url?: string | null;
  camera_3_evidence_url?: string | null;
  driver_persona: string;
}

export interface ParkingSession {
  id: number;
  plate_number: string;
  status: string;
  entry_time: string;
  exit_time?: string | null;
  entry_face_photo?: string | null;
  entry_plate_photo?: string | null;
  driver_persona?: string | null;
}

export interface ParkingLog {
  id: number;
  session_id?: number | null;
  plate_number: string;
  gate_mode: 'GATE_IN' | 'GATE_OUT';
  event_type: string;
  timestamp: string;
  status: 'NORMAL' | 'ANOMALY';
  similarity_score: number | null;
  decision_notes: string;
  plate_photo_path: string | null;
  face_photo_path: string | null;
  entry_photo_path: string | null;
  anomaly_evidence_path: string | null;
  high_res_triggered: boolean;
  driver_persona?: string | null;
}

export interface SystemStats {
  currently_parked: number;
  total_vehicles: number;
  total_completed: number;
  total_transactions: number;
  total_anomalies: number;
  total_normal: number;
  anomaly_rate_percent: number;
}
