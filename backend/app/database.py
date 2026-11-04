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
    
    # 1. Vehicles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_number TEXT UNIQUE NOT NULL,
        first_seen TIMESTAMP NOT NULL,
        last_seen TIMESTAMP NOT NULL,
        total_visits INTEGER DEFAULT 1,
        vehicle_type TEXT DEFAULT 'Car',
        notes TEXT
    )
    """)
    
    # 2. Driver Face Profiles (Baseline cluster)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS driver_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        driver_name TEXT DEFAULT 'Pengemudi Utama',
        embedding_json TEXT NOT NULL,
        sample_photo_path TEXT,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
    )
    """)
    
    # 3. Parking Logs (Every entry & exit event)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plate_number TEXT NOT NULL,
        event_type TEXT NOT NULL, -- 'ENTRY' or 'EXIT'
        timestamp TIMESTAMP NOT NULL,
        visit_number INTEGER NOT NULL,
        status TEXT NOT NULL,     -- 'NORMAL' or 'ANOMALY'
        similarity_score REAL,
        decision_notes TEXT,
        plate_photo_path TEXT,
        face_photo_path TEXT,
        anomaly_evidence_path TEXT,
        high_res_triggered BOOLEAN DEFAULT 0
    )
    """)
    
    conn.commit()
    conn.close()

# Helper queries
def get_vehicle_by_plate(plate_number: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM vehicles WHERE plate_number = ?", (plate_number,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def record_vehicle_visit(plate_number: str, vehicle_type: str = 'Car') -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    
    cursor.execute("SELECT * FROM vehicles WHERE plate_number = ?", (plate_number,))
    existing = cursor.fetchone()
    
    if existing:
        new_visits = existing["total_visits"] + 1
        cursor.execute("""
            UPDATE vehicles 
            SET total_visits = ?, last_seen = ? 
            WHERE plate_number = ?
        """, (new_visits, now, plate_number))
        vehicle_id = existing["id"]
        total_visits = new_visits
    else:
        cursor.execute("""
            INSERT INTO vehicles (plate_number, first_seen, last_seen, total_visits, vehicle_type)
            VALUES (?, ?, ?, 1, ?)
        """, (plate_number, now, now, vehicle_type))
        vehicle_id = cursor.lastrowid
        total_visits = 1
        
    conn.commit()
    conn.close()
    return {"id": vehicle_id, "plate_number": plate_number, "total_visits": total_visits}

def save_driver_baseline_profile(vehicle_id: int, embedding: List[float], photo_path: str, driver_name: str = "Pengemudi Terdaftar"):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO driver_profiles (vehicle_id, driver_name, embedding_json, sample_photo_path, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (vehicle_id, driver_name, json.dumps(embedding), photo_path, now))
    conn.commit()
    conn.close()

def get_vehicle_baseline_embeddings(vehicle_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM driver_profiles WHERE vehicle_id = ?", (vehicle_id,))
    rows = cursor.fetchall()
    conn.close()
    
    profiles = []
    for r in rows:
        profiles.append({
            "id": r["id"],
            "driver_name": r["driver_name"],
            "embedding": json.loads(r["embedding_json"]),
            "sample_photo_path": r["sample_photo_path"],
            "created_at": r["created_at"]
        })
    return profiles

def insert_parking_log(
    plate_number: str,
    event_type: str,
    visit_number: int,
    status: str,
    similarity_score: Optional[float],
    decision_notes: str,
    plate_photo_path: Optional[str] = None,
    face_photo_path: Optional[str] = None,
    anomaly_evidence_path: Optional[str] = None,
    high_res_triggered: bool = False
) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO parking_logs (
            plate_number, event_type, timestamp, visit_number, status,
            similarity_score, decision_notes, plate_photo_path, face_photo_path,
            anomaly_evidence_path, high_res_triggered
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        plate_number, event_type, now, visit_number, status,
        similarity_score, decision_notes, plate_photo_path, face_photo_path,
        anomaly_evidence_path, 1 if high_res_triggered else 0
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

def reset_database():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM parking_logs")
    cursor.execute("DELETE FROM driver_profiles")
    cursor.execute("DELETE FROM vehicles")
    conn.commit()
    conn.close()
