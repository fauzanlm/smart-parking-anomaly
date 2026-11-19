import base64
import cv2
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from app.models.schemas import (
    ProcessParkingRequest,
    ProcessLiveParkingRequest,
    OCRPlateRequest,
    OCRPlateResponse,
    VerificationResult,
    ParkingSessionItem
)
from app.services.decision_engine import decision_engine
from app.services.plate_ocr import plate_ocr
from app.api.websocket import ws_manager
from app.database import (
    get_all_logs,
    get_all_vehicles,
    reset_database,
    get_all_active_sessions,
    get_system_stats
)

router = APIRouter(prefix="/api", tags=["Parking Security"])

@router.post("/parking/ocr-plate", response_model=OCRPlateResponse)
async def scan_plate_number_ocr(req: OCRPlateRequest):
    """
    Scans license plate text from webcam snapshot or uploaded photo of a paper/plate.
    """
    try:
        raw_b64 = req.image_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",")[1]
        img_bytes = base64.b64decode(raw_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Citra gambar tidak valid.")

        result = plate_ocr.scan_plate_from_image(frame)
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/parking/process", response_model=VerificationResult)
async def process_parking_event(req: ProcessParkingRequest):
    """
    Processes Gate-In or Gate-Out simulation event.
    """
    result = decision_engine.process_transaction(
        plate_input=req.plate_number,
        gate_mode=req.gate_mode,
        event_type=req.event_type,
        driver_persona=req.driver_person_id or "driver_owner"
    )

    await ws_manager.broadcast_event({
        "type": "PARKING_EVENT",
        "data": result
    })

    return result

@router.post("/parking/process-live", response_model=VerificationResult)
async def process_live_webcam_event(req: ProcessLiveParkingRequest):
    """
    Processes real webcam frame captured live from the user's camera.
    Supports GATE_IN (stores entry face ticket) and GATE_OUT (compares with entry face).
    """
    try:
        result = decision_engine.process_live_webcam(
            plate_input=req.plate_number,
            image_base64=req.image_base64,
            gate_mode=req.gate_mode,
            event_type=req.event_type
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    await ws_manager.broadcast_event({
        "type": "PARKING_EVENT",
        "data": result
    })

    return result

@router.get("/parking/active-sessions", response_model=List[ParkingSessionItem])
async def list_active_parking_sessions():
    """
    Returns list of vehicles currently parked inside the area (IN_PARKING).
    """
    return get_all_active_sessions()

@router.get("/parking/logs")
async def get_parking_logs(limit: int = Query(50, ge=1, le=200), anomaly_only: bool = False):
    return get_all_logs(limit=limit, anomaly_only=anomaly_only)

@router.get("/parking/anomalies")
async def get_anomalies_only(limit: int = Query(50, ge=1, le=200)):
    return get_all_logs(limit=limit, anomaly_only=True)

@router.get("/vehicles")
async def list_vehicles():
    return get_all_vehicles()

@router.get("/stats")
async def get_stats():
    return get_system_stats()

@router.post("/parking/reset")
async def reset_system():
    reset_database()
    await ws_manager.broadcast_event({
        "type": "SYSTEM_RESET"
    })
    return {"message": "Database berhasil direset."}
