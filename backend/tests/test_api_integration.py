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
    assert data["thresholds"]["min_visits"] == 3

def test_process_parking_flow():
    # Transaction 1
    resp1 = client.post("/api/parking/process", json={
        "plate_number": "B 1234 WLM",
        "driver_person_id": "driver_owner",
        "event_type": "EXIT"
    })
    assert resp1.status_code == 200
    assert resp1.json()["status"] == "NORMAL"

    # Transaction 2
    client.post("/api/parking/process", json={"plate_number": "B 1234 WLM", "driver_person_id": "driver_owner"})
    # Transaction 3
    client.post("/api/parking/process", json={"plate_number": "B 1234 WLM", "driver_person_id": "driver_owner"})
    
    # Transaction 4 - Thief
    resp_thief = client.post("/api/parking/process", json={
        "plate_number": "B 1234 WLM",
        "driver_person_id": "driver_thief",
        "event_type": "EXIT"
    })
    assert resp_thief.status_code == 200
    data = resp_thief.json()
    assert data["status"] == "ANOMALY"
    assert data["gate_action"] == "LOCK"
    assert data["high_res_camera_triggered"] is True

def test_stats_and_logs_endpoints():
    # Insert one transaction
    client.post("/api/parking/process", json={"plate_number": "B 5555 BOS", "driver_person_id": "driver_owner"})
    
    # Fetch logs
    resp_logs = client.get("/api/parking/logs")
    assert resp_logs.status_code == 200
    assert len(resp_logs.json()) >= 1

    # Fetch stats
    resp_stats = client.get("/api/stats")
    assert resp_stats.status_code == 200
    assert resp_stats.json()["total_transactions"] >= 1
