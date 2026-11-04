from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class ProcessParkingRequest(BaseModel):
    plate_number: str = Field(..., example="B 1234 XYZ")
    event_type: str = Field(default="EXIT", example="EXIT")
    driver_person_id: Optional[str] = Field(default="driver_william", description="Identifier to simulate driver identity in tests")
    notes: Optional[str] = None

class ProcessLiveParkingRequest(BaseModel):
    plate_number: str = Field(..., example="B 1234 XYZ")
    image_base64: str = Field(..., description="Base64 encoded webcam image frame")
    event_type: str = Field(default="EXIT", example="EXIT")

class VerificationResult(BaseModel):
    plate_number: str
    event_type: str
    timestamp: str
    total_visits: int
    meets_3_visits_criteria: bool
    status: str
    similarity_score: Optional[float] = None
    similarity_percentage: Optional[float] = None
    threshold: float
    decision_notes: str
    gate_action: str
    high_res_camera_triggered: bool
    face_photo_url: Optional[str] = None
    plate_photo_url: Optional[str] = None
    baseline_photo_url: Optional[str] = None
    anomaly_evidence_url: Optional[str] = None
    driver_persona: Optional[str] = None

class VehicleItem(BaseModel):
    id: int
    plate_number: str
    first_seen: str
    last_seen: str
    total_visits: int
    vehicle_type: str

class ParkingLogItem(BaseModel):
    id: int
    plate_number: str
    event_type: str
    timestamp: str
    visit_number: int
    status: str
    similarity_score: Optional[float]
    decision_notes: str
    plate_photo_path: Optional[str]
    face_photo_path: Optional[str]
    anomaly_evidence_path: Optional[str]
    high_res_triggered: bool
