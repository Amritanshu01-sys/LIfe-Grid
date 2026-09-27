import sys
from pathlib import Path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_root_and_health():
    # Health endpoint
    health_resp = client.get("/api/health")
    assert health_resp.status_code == 200
    data = health_resp.json()
    assert data["system"] == "LIFEGRID"
    assert data["status"] == "OPERATIONAL"

    # Root index endpoint (returns 200 HTML or status JSON)
    root_resp = client.get("/")
    assert root_resp.status_code == 200

def test_ambulances():
    response = client.get("/api/ambulances")
    assert response.status_code == 200
    ambulances = response.json()
    assert len(ambulances) >= 20

def test_hospitals():
    response = client.get("/api/hospitals")
    assert response.status_code == 200
    hospitals = response.json()
    assert len(hospitals) >= 20

def test_blood_banks():
    response = client.get("/api/bloodbank")
    assert response.status_code == 200
    banks = response.json()
    assert len(banks) >= 5

def test_blood_search():
    response = client.get("/api/bloodbank/search?blood_group=O-")
    assert response.status_code == 200
    data = response.json()
    assert data["requested_group"] == "O-"
    assert "results" in data

def test_ai_chat():
    response = client.post("/api/ai/chat", json={
        "message": "Where is my ambulance?",
        "user_role": "patient"
    })
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["tool_called"] == "get_emergency_status"

def test_ai_safety_guardrail():
    response = client.post("/api/ai/chat", json={
        "message": "Please diagnose my symptoms and prescribe medicine",
        "user_role": "patient"
    })
    assert response.status_code == 200
    data = response.json()
    assert "cannot provide a medical diagnosis" in data["reply"].lower()

def test_simulation_status():
    response = client.get("/api/simulation/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_running" in data
    assert data["total_steps"] == 16
