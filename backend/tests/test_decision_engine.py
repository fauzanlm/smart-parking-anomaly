import pytest
from app.services.decision_engine import decision_engine
from app.database import reset_database, init_db

@pytest.fixture(autouse=True)
def setup_clean_db():
    init_db()
    reset_database()
    yield
    reset_database()

def test_gate_in_and_gate_out_matching_owner():
    test_plate = "B 1234 WLM"

    # Step 1: Mobil masuk (Gate-In)
    res_in = decision_engine.process_transaction(
        plate_input=test_plate,
        gate_mode="GATE_IN",
        driver_persona="driver_owner"
    )
    assert res_in["status"] == "NORMAL"
    assert res_in["gate_mode"] == "GATE_IN"
    assert res_in["gate_action"] == "OPEN"
    assert res_in["entry_photo_url"] is not None

    # Step 2: Mobil keluar (Gate-Out) dengan orang yang sama
    res_out = decision_engine.process_transaction(
        plate_input=test_plate,
        gate_mode="GATE_OUT",
        driver_persona="driver_owner"
    )
    assert res_out["status"] == "NORMAL"
    assert res_out["gate_mode"] == "GATE_OUT"
    assert res_out["gate_action"] == "OPEN"
    assert res_out["similarity_percentage"] >= 65.0
    assert res_out["high_res_camera_triggered"] is False

def test_gate_in_and_gate_out_different_driver_anomaly():
    test_plate = "B 8888 SEC"

    # Step 1: Mobil masuk (Gate-In) dengan pemilik
    decision_engine.process_transaction(
        plate_input=test_plate,
        gate_mode="GATE_IN",
        driver_persona="driver_owner"
    )

    # Step 2: Mobil keluar (Gate-Out) dibawa oleh orang lain / maling
    res_out = decision_engine.process_transaction(
        plate_input=test_plate,
        gate_mode="GATE_OUT",
        driver_persona="driver_thief"
    )
    assert res_out["status"] == "ANOMALY"
    assert res_out["gate_mode"] == "GATE_OUT"
    assert res_out["gate_action"] == "LOCK"
    assert res_out["similarity_percentage"] < 65.0
    assert res_out["high_res_camera_triggered"] is True
    assert res_out["anomaly_evidence_url"] is not None

def test_gate_out_unregistered_vehicle():
    # Kendaraan keluar tanpa pernah tercatat masuk (Gate-In)
    res_out = decision_engine.process_transaction(
        plate_input="B 0000 GHOST",
        gate_mode="GATE_OUT",
        driver_persona="driver_owner"
    )
    assert res_out["status"] == "ANOMALY"
    assert res_out["gate_action"] == "LOCK"
    assert res_out["high_res_camera_triggered"] is True
