from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import TrafficSignal, Ambulance, Emergency
from schemas.all_schemas import TrafficSignalResponse
from services.traffic_engine import traffic_engine
from websocket_manager import ws_manager

router = APIRouter(prefix="/traffic", tags=["Traffic Control"])

@router.get("/signals", response_model=List[TrafficSignalResponse])
def get_signals(db: Session = Depends(get_db)):
    return db.query(TrafficSignal).all()

@router.get("/active-corridors")
def get_active_corridors(db: Session = Depends(get_db)):
    """Returns active emergency ambulances and upcoming intersections with signal states."""
    active_ambulances = db.query(Ambulance).filter(
        Ambulance.status.in_(["EN_ROUTE", "TRANSPORTING", "ARRIVED"])
    ).all()

    corridors = []
    for amb in active_ambulances:
        emergency = db.query(Emergency).filter(Emergency.id == amb.current_emergency_id).first()
        intersections = traffic_engine.get_upcoming_intersections(db, amb.current_lat, amb.current_lng)
        corridors.append({
            "ambulance_id": amb.id,
            "vehicle_number": amb.vehicle_number,
            "lat": amb.current_lat,
            "lng": amb.current_lng,
            "speed_kmh": amb.speed,
            "priority": emergency.priority if emergency else "HIGH",
            "emergency_type": emergency.emergency_type if emergency else "Emergency Response",
            "eta_minutes": emergency.eta_minutes if emergency else 5,
            "upcoming_intersections": [
                {
                    "id": sig.id,
                    "name": sig.intersection_name,
                    "lat": sig.lat,
                    "lng": sig.lng,
                    "current_state": sig.current_state,
                    "is_priority_green": sig.emergency_priority_active,
                    "congestion": sig.congestion_level
                }
                for sig in intersections[:5]
            ]
        })

    return corridors

@router.post("/override/{signal_id}")
async def override_signal(
    signal_id: int,
    state: str, # RED, YELLOW, GREEN
    emergency_priority: bool = False,
    db: Session = Depends(get_db)
):
    sig = db.query(TrafficSignal).filter(TrafficSignal.id == signal_id).first()
    if not sig:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    sig.current_state = state.upper()
    sig.emergency_priority_active = emergency_priority
    db.commit()
    db.refresh(sig)

    await ws_manager.broadcast({
        "type": "TRAFFIC_SIGNAL_UPDATE",
        "signal_id": sig.id,
        "state": sig.current_state,
        "priority_active": sig.emergency_priority_active
    })

    return sig
