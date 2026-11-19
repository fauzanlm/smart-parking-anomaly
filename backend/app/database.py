import sqlite3
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.config import settings

def get_db_connection():
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if parking_logs needs schema migration
    cursor.execute("PRAGMA table_info(parking_logs)")
    columns = [col[1] for col in cursor.fetchall()]
    if columns and "session_id" not in columns:
        cursor.execute("DROP TABLE IF EXISTS parking_logs")
    
    # 1. Parking Sessions Table (Active and Historical Gate-In vs Gate-Out Sessions)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_number TEXT NOT NULL,
        status TEXT NOT NULL, -- 'IN_PARKING', 'COMPLETED', 'ANOMALY_BLOCKED'
        entry_time TIMESTAMP NOT NULL,
        entry_face_embedding TEXT NOT NULL, -- JSON list of 128 floats
        entry_face_photo TEXT,
        entry_plate_photo TEXT,
        exit_time TIMESTAMP,
        exit_face_photo TEXT,
        exit_similarity REAL,
        exit_status TEXT, -- 'NORMAL', 'ANOMALY'
        anomaly_evidence_path TEXT,
        driver_persona TEXT,
        notes TEXT
    )
    """)
    
    # 2. Parking Logs Table (Chronological stream of all gate events)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        plate_number TEXT NOT NULL,
        gate_mode TEXT NOT NULL, -- 'GATE_IN' or 'GATE_OUT'
        event_type TEXT NOT NULL, -- 'ENTRY' or 'EXIT'
        timestamp TIMESTAMP NOT NULL,
        status TEXT NOT NULL,     -- 'NORMAL', 'ANOMALY'
        similarity_score REAL,
        decision_notes TEXT,
        plate_photo_path TEXT,
        face_photo_path TEXT,
        entry_photo_path TEXT,
        anomaly_evidence_path TEXT,
        high_res_triggered BOOLEAN DEFAULT 0,
        driver_persona TEXT,
        FOREIGN KEY (session_id) REFERENCES parking_sessions(id) ON DELETE SET NULL
    )
    """)

    # 3. Legacy compatibility tables (kept for backward compatibility)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_number TEXT UNIQUE NOT NULL,
        first_seen TIMESTAMP NOT NULL,
        last_seen TIMESTAMP NOT NULL,
        total_visits INTEGER DEFAULT 1,
        vehicle_type TEXT DEFAULT 'Car'
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        driver_name TEXT DEFAULT 'Pengemudi Terdaftar',
        embedding_json TEXT NOT NULL,
        sample_photo_path TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

# -------------------------------------------------------------
# Active Parking Sessions CRUD
# -------------------------------------------------------------

def create_gate_in_session(
    plate_number: str,
    embedding: List[float],
    face_photo_path: str,
    plate_photo_path: Optional[str] = None,
    driver_persona: str = "driver_owner",
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Records an incoming vehicle at GATE-IN.
    Saves plate, face biometric embedding, photo, and entry timestamp.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    # Check if there is already an active session for this plate; mark old one as overridden if re-entering
    cursor.execute("""
        UPDATE parking_sessions 
        SET status = 'OVERRIDDEN' 
        WHERE plate_number = ? AND status = 'IN_PARKING'
    """, (plate_number,))

    cursor.execute("""
        INSERT INTO parking_sessions (
            plate_number, status, entry_time, entry_face_embedding,
            entry_face_photo, entry_plate_photo, driver_persona, notes
        ) VALUES (?, 'IN_PARKING', ?, ?, ?, ?, ?, ?)
    """, (
        plate_number, now, json.dumps(embedding),
        face_photo_path, plate_photo_path, driver_persona, notes
    ))
    session_id = cursor.lastrowid
    
    # Also record in vehicles table
    cursor.execute("SELECT id, total_visits FROM vehicles WHERE plate_number = ?", (plate_number,))
    existing_veh = cursor.fetchone()
    if existing_veh:
        cursor.execute("UPDATE vehicles SET last_seen = ?, total_visits = total_visits + 1 WHERE id = ?", (now, existing_veh["id"]))
    else:
        cursor.execute("INSERT INTO vehicles (plate_number, first_seen, last_seen, total_visits) VALUES (?, ?, ?, 1)", (plate_number, now, now))

    conn.commit()
    conn.close()

    return {
        "session_id": session_id,
        "plate_number": plate_number,
        "entry_time": now,
        "status": "IN_PARKING",
        "entry_face_photo": face_photo_path,
        "entry_plate_photo": plate_photo_path
    }

def get_active_session_by_plate(plate_number: str) -> Optional[Dict[str, Any]]:
    """
    Finds the active (IN_PARKING) session for a vehicle trying to exit at GATE-OUT.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM parking_sessions 
        WHERE plate_number = ? AND status = 'IN_PARKING'
        ORDER BY id DESC LIMIT 1
    """, (plate_number,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    data = dict(row)
    data["entry_face_embedding"] = json.loads(data["entry_face_embedding"])
    return data

def complete_gate_out_session(
    session_id: int,
    exit_face_photo: str,
    exit_similarity: float,
    exit_status: str,
    anomaly_evidence_path: Optional[str] = None,
    notes: Optional[str] = None
):
    """
    Updates the session when the vehicle leaves or is blocked at GATE-OUT.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    new_status = 'COMPLETED' if exit_status == 'NORMAL' else 'ANOMALY_BLOCKED'

    cursor.execute("""
        UPDATE parking_sessions
        SET status = ?, exit_time = ?, exit_face_photo = ?,
            exit_similarity = ?, exit_status = ?, anomaly_evidence_path = ?, notes = ?
        WHERE id = ?
    """, (
        new_status, now, exit_face_photo,
        exit_similarity, exit_status, anomaly_evidence_path, notes, session_id
    ))
    conn.commit()
    conn.close()

def get_all_active_sessions() -> List[Dict[str, Any]]:
    """
    Returns list of vehicles currently parked inside (IN_PARKING).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, plate_number, status, entry_time, entry_face_photo, entry_plate_photo, driver_persona
        FROM parking_sessions 
        WHERE status = 'IN_PARKING'
        ORDER BY id DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# -------------------------------------------------------------
# Parking Event Logs
# -------------------------------------------------------------

def insert_parking_log(
    plate_number: str,
    gate_mode: str,
    status: str,
    decision_notes: str,
    similarity_score: Optional[float] = None,
    session_id: Optional[int] = None,
    plate_photo_path: Optional[str] = None,
    face_photo_path: Optional[str] = None,
    entry_photo_path: Optional[str] = None,
    anomaly_evidence_path: Optional[str] = None,
    high_res_triggered: bool = False,
    driver_persona: Optional[str] = None
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    event_type = 'ENTRY' if gate_mode == 'GATE_IN' else 'EXIT'

    cursor.execute("""
        INSERT INTO parking_logs (
            session_id, plate_number, gate_mode, event_type, timestamp, status,
            similarity_score, decision_notes, plate_photo_path, face_photo_path,
            entry_photo_path, anomaly_evidence_path, high_res_triggered, driver_persona
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id, plate_number, gate_mode, event_type, now, status,
        similarity_score, decision_notes, plate_photo_path, face_photo_path,
        entry_photo_path, anomaly_evidence_path, 1 if high_res_triggered else 0, driver_persona
    ))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id

def get_all_logs(limit: int = 50, anomaly_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if anomaly_only:
        cursor.execute("SELECT * FROM parking_logs WHERE status = 'ANOMALY' ORDER BY id DESC LIMIT ?", (limit,))
    else:
        cursor.execute("SELECT * FROM parking_logs ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all_vehicles() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles ORDER BY total_visits DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_system_stats() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Active parked vehicles
    cursor.execute("SELECT COUNT(*) as cnt FROM parking_sessions WHERE status = 'IN_PARKING'")
    currently_parked = cursor.fetchone()["cnt"]

    # Total completed visits (normal exits)
    cursor.execute("SELECT COUNT(*) as cnt FROM parking_sessions WHERE status = 'COMPLETED'")
    total_completed = cursor.fetchone()["cnt"]

    # Total anomalies
    cursor.execute("SELECT COUNT(*) as cnt FROM parking_logs WHERE status = 'ANOMALY'")
    total_anomalies = cursor.fetchone()["cnt"]

    # Total gate events
    cursor.execute("SELECT COUNT(*) as cnt FROM parking_logs")
    total_transactions = cursor.fetchone()["cnt"]

    # Normal events
    cursor.execute("SELECT COUNT(*) as cnt FROM parking_logs WHERE status = 'NORMAL'")
    total_normal = cursor.fetchone()["cnt"]

    anomaly_rate = round((total_anomalies / total_transactions * 100), 1) if total_transactions > 0 else 0.0

    conn.close()
    return {
        "currently_parked": currently_parked,
        "total_vehicles": currently_parked,
        "total_completed": total_completed,
        "total_transactions": total_transactions,
        "total_anomalies": total_anomalies,
        "total_normal": total_normal,
        "anomaly_rate_percent": anomaly_rate
    }

def reset_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM parking_sessions")
    cursor.execute("DELETE FROM parking_logs")
    cursor.execute("DELETE FROM driver_profiles")
    cursor.execute("DELETE FROM vehicles")
    conn.commit()
    conn.close()
