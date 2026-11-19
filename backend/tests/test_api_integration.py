import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, reset_database

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_db():
    init_db()
    reset_database()
    yield
    reset_database()

def test_health_check_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"

def test_gate_in_gate_out_api_flow():
    test_plate = "B 1234 WLM"

    # 1. GATE-IN: Mobil Masuk
    resp_in = client.post("/api/parking/process", json={
        "plate_number": test_plate,
        "gate_mode": "GATE_IN",
        "driver_person_id": "driver_owner"
    })
    assert resp_in.status_code == 200
    data_in = resp_in.json()
    assert data_in["gate_mode"] == "GATE_IN"
    assert data_in["status"] == "NORMAL"
    assert data_in["gate_action"] == "OPEN"

    # Check active sessions
    resp_active = client.get("/api/parking/active-sessions")
    assert resp_active.status_code == 200
    assert len(resp_active.json()) >= 1
    assert resp_active.json()[0]["plate_number"] == test_plate

    # 2. GATE-OUT: Pengemudi Sama (Lolos Normal)
    resp_out = client.post("/api/parking/process", json={
        "plate_number": test_plate,
        "gate_mode": "GATE_OUT",
        "driver_person_id": "driver_owner"
    })
    assert resp_out.status_code == 200
    data_out = resp_out.json()
    assert data_out["gate_mode"] == "GATE_OUT"
    assert data_out["status"] == "NORMAL"
    assert data_out["gate_action"] == "OPEN"
    assert data_out["similarity_percentage"] >= 65.0

def test_gate_out_anomaly_intruder():
    test_plate = "B 8888 SEC"

    # 1. GATE-IN: Pemilik Masuk
    client.post("/api/parking/process", json={
        "plate_number": test_plate,
        "gate_mode": "GATE_IN",
        "driver_person_id": "driver_owner"
    })

    # 2. GATE-OUT: Orang Lain / Maling Membawa Mobil Keluar
    resp_thief = client.post("/api/parking/process", json={
        "plate_number": test_plate,
        "gate_mode": "GATE_OUT",
        "driver_person_id": "driver_thief"
    })
    assert resp_thief.status_code == 200
    data_thief = resp_thief.json()
    assert data_thief["gate_mode"] == "GATE_OUT"
    assert data_thief["status"] == "ANOMALY"
    assert data_thief["gate_action"] == "LOCK"
    assert data_thief["high_res_camera_triggered"] is True
    assert data_thief["similarity_percentage"] < 65.0

def test_gate_out_without_entry():
    resp = client.post("/api/parking/process", json={
        "plate_number": "B 9999 GHO",
        "gate_mode": "GATE_OUT",
        "driver_person_id": "driver_owner"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ANOMALY"
    assert data["gate_action"] == "LOCK"

def test_stats_and_logs_endpoints():
    client.post("/api/parking/process", json={
        "plate_number": "B 5555 BOS",
        "gate_mode": "GATE_IN",
        "driver_person_id": "driver_owner"
    })
    
    resp_logs = client.get("/api/parking/logs")
    assert resp_logs.status_code == 200
    assert len(resp_logs.json()) >= 1

    resp_stats = client.get("/api/stats")
    assert resp_stats.status_code == 200
    assert resp_stats.json()["currently_parked"] >= 1
