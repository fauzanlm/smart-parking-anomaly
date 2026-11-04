export interface VerificationResult {
  log_id: number;
  plate_number: string;
  event_type: string;
  timestamp: string;
  total_visits: number;
  meets_3_visits_criteria: boolean;
  status: 'NORMAL' | 'ANOMALY';
  similarity_score: number | null;
  similarity_percentage: number | null;
  threshold: number;
  decision_notes: string;
  gate_action: 'OPEN' | 'LOCK';
  high_res_camera_triggered: boolean;
  face_photo_url: string | null;
  baseline_photo_url: string | null;
  anomaly_evidence_url: string | null;
  driver_persona: string;
}

export interface ParkingLog {
  id: number;
  plate_number: string;
  event_type: string;
  timestamp: string;
  visit_number: number;
  status: 'NORMAL' | 'ANOMALY';
  similarity_score: number | null;
  decision_notes: string;
  plate_photo_path: string | null;
  face_photo_path: string | null;
  anomaly_evidence_path: string | null;
  high_res_triggered: boolean;
}

export interface SystemStats {
  total_vehicles: number;
  total_transactions: number;
  total_anomalies: number;
  total_normal: number;
  anomaly_rate_percent: number;
}
