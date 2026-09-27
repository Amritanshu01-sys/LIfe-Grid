from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.all_schemas import AIChatRequest, AIChatResponse, AIVoiceRequest
from services.ai_service import lifegrid_ai

router = APIRouter(prefix="/ai", tags=["LIFEGRID AI"])

@router.post("/chat", response_model=AIChatResponse)
def ai_chat(payload: AIChatRequest, db: Session = Depends(get_db)):
    result = lifegrid_ai.process_chat(
        db=db,
        message=payload.message,
        user_role=payload.user_role or "patient",
        emergency_id=payload.emergency_id,
        user_id=payload.user_id
    )
    return result

@router.post("/voice")
def ai_voice(payload: AIVoiceRequest, db: Session = Depends(get_db)):
    result = lifegrid_ai.process_voice(
        db=db,
        transcript=payload.transcript,
        language=payload.language or "en",
        user_role=payload.user_role or "patient",
        location=payload.location
    )
    return result

@router.get("/tools")
def list_controlled_tools():
    """List all authorized AI tool functions complying with safety guardrails."""
    return {
        "status": "active",
        "description": "Controlled tool execution layer for LIFEGRID AI",
        "tools": [
            {"name": "create_emergency", "scope": "Write emergency intake into triage database"},
            {"name": "get_emergency_status", "scope": "Query emergency status and timeline"},
            {"name": "get_ambulance_status", "scope": "Query real-time ambulance telemetry"},
            {"name": "find_nearest_ambulance", "scope": "Proximity and ALS capability matching"},
            {"name": "get_hospital_capacity", "scope": "Query bed and ICU availability"},
            {"name": "find_suitable_hospital", "scope": "Multi-factor hospital suitability ranking"},
            {"name": "get_patient_summary", "scope": "Read authorized medical allergies and history"},
            {"name": "get_family_status", "scope": "Family authorized ETA and location"},
            {"name": "find_blood_availability", "scope": "Blood bank inventory query by ABO group"},
            {"name": "get_route", "scope": "Calculate primary vs priority bypass routes"},
            {"name": "get_eta", "scope": "Dynamic ETA calculation factoring traffic delay"},
            {"name": "create_hospital_alert", "scope": "Dispatch pre-arrival trauma/ER alert"}
        ]
    }
