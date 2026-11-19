from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProcessParkingRequest(BaseModel):
    plate_number: str = Field(..., json_schema_extra={"example": "B 1234 WLM"})
    gate_mode: str = Field(default="GATE_OUT", json_schema_extra={"example": "GATE_OUT"}) # "GATE_IN" or "GATE_OUT"
    event_type: str = Field(default="EXIT", json_schema_extra={"example": "EXIT"})
    driver_person_id: Optional[str] = Field(default="driver_owner", description="Identifier to simulate driver identity in tests")
    notes: Optional[str] = None

class ProcessLiveParkingRequest(BaseModel):
    plate_number: str = Field(..., json_schema_extra={"example": "B 1234 WLM"})
    image_base64: str = Field(..., description="Base64 encoded webcam image frame")
    gate_mode: str = Field(default="GATE_OUT", json_schema_extra={"example": "GATE_OUT"})
    event_type: str = Field(default="EXIT", json_schema_extra={"example": "EXIT"})

class OCRPlateRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 image frame of paper or vehicle plate")

class OCRPlateResponse(BaseModel):
    success: bool
    plate_number: Optional[str] = None
    best_pass: Optional[str] = None
    raw_text: Optional[str] = None
    photo_url: Optional[str] = None
    message: str

class VerificationResult(BaseModel):
    plate_number: str
    gate_mode: str # 'GATE_IN' or 'GATE_OUT'
    event_type: str
    timestamp: str
    session_id: Optional[int] = None
    total_visits: int = 1
    meets_3_visits_criteria: bool = True
    status: str # 'NORMAL' or 'ANOMALY'
    similarity_score: Optional[float] = None
    similarity_percentage: Optional[float] = None
    threshold: float
    decision_notes: str
    gate_action: str # 'OPEN' or 'LOCK'
    high_res_camera_triggered: bool = False
    face_photo_url: Optional[str] = None
    plate_photo_url: Optional[str] = None
    entry_photo_url: Optional[str] = None
    exit_photo_url: Optional[str] = None
    baseline_photo_url: Optional[str] = None
    anomaly_evidence_url: Optional[str] = None
    driver_persona: Optional[str] = None

class ParkingSessionItem(BaseModel):
    id: int
    plate_number: str
    status: str
    entry_time: str
    exit_time: Optional[str] = None
    entry_face_photo: Optional[str] = None
    entry_plate_photo: Optional[str] = None
    exit_face_photo: Optional[str] = None
    exit_similarity: Optional[float] = None
    exit_status: Optional[str] = None
    driver_persona: Optional[str] = None

class ParkingLogItem(BaseModel):
    id: int
    plate_number: str
    gate_mode: str
    event_type: str
    timestamp: str
    status: str
    similarity_score: Optional[float] = None
    decision_notes: str
    plate_photo_path: Optional[str] = None
    face_photo_path: Optional[str] = None
    entry_photo_path: Optional[str] = None
    anomaly_evidence_path: Optional[str] = None
    high_res_triggered: bool = False
    driver_persona: Optional[str] = None

class SystemStats(BaseModel):
    currently_parked: int
    total_vehicles: int
    total_completed: int
    total_transactions: int
    total_anomalies: int
    total_normal: int
    anomaly_rate_percent: float
