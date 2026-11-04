import pytest
from app.services.decision_engine import decision_engine
from app.database import reset_database, init_db

@pytest.fixture(autouse=True)
def setup_clean_db():
    init_db()
    reset_database()
    yield
    reset_database()

def test_full_flowchart_scenario():
    test_plate = "B 9999 TEST"
    
    # 1. First visit (<3x) -> Normal, learning phase
    res1 = decision_engine.process_transaction(test_plate, "EXIT", "driver_owner")
    assert res1["status"] == "NORMAL"
    assert res1["total_visits"] == 1
    assert res1["meets_3_visits_criteria"] is False
    assert res1["gate_action"] == "OPEN"
    assert res1["high_res_camera_triggered"] is False

    # 2. Second visit (<3x) -> Normal, learning phase
    res2 = decision_engine.process_transaction(test_plate, "EXIT", "driver_owner")
    assert res2["status"] == "NORMAL"
    assert res2["total_visits"] == 2
    assert res2["meets_3_visits_criteria"] is False
    assert res2["gate_action"] == "OPEN"

    # 3. Third visit (>=3x) -> Normal, baseline criteria fulfilled
    res3 = decision_engine.process_transaction(test_plate, "EXIT", "driver_owner")
    assert res3["status"] == "NORMAL"
    assert res3["total_visits"] == 3
    assert res3["meets_3_visits_criteria"] is True

    # 4. Fourth visit (Owner exits again) -> Normal, ArcFace verification passed
    res4 = decision_engine.process_transaction(test_plate, "EXIT", "driver_owner")
    assert res4["status"] == "NORMAL"
    assert res4["total_visits"] == 4
    assert res4["meets_3_visits_criteria"] is True
    assert res4["similarity_percentage"] >= 65.0
    assert res4["gate_action"] == "OPEN"
    assert res4["high_res_camera_triggered"] is False

    # 5. Fifth visit (Thief attempts to exit) -> ANOMALY ALERT!
    res5 = decision_engine.process_transaction(test_plate, "EXIT", "driver_thief")
    assert res5["status"] == "ANOMALY"
    assert res5["total_visits"] == 5
    assert res5["similarity_percentage"] < 65.0
    assert res5["gate_action"] == "LOCK"
    assert res5["high_res_camera_triggered"] is True
    assert res5["anomaly_evidence_url"] is not None
