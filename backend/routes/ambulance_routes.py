from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import Ambulance, Emergency
from schemas.all_schemas import AmbulanceResponse, AmbulanceLocationUpdate
from services.traffic_engine import traffic_engine
from websocket_manager import ws_manager

router = APIRouter(prefix="/ambulances", tags=["Ambulances"])

@router.get("", response_model=List[AmbulanceResponse])
def list_ambulances(db: Session = Depends(get_db)):
    return db.query(Ambulance).all()

@router.get("/{ambulance_id}", response_model=AmbulanceResponse)
def get_ambulance(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return amb

@router.patch("/{ambulance_id}/location", response_model=AmbulanceResponse)
async def update_location(
    ambulance_id: int,
    payload: AmbulanceLocationUpdate,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    
    amb.current_lat = payload.lat
    amb.current_lng = payload.lng
    if payload.speed is not None:
        amb.speed = payload.speed

    # Check for upcoming traffic priority if on active emergency
    if amb.current_emergency_id:
        traffic_engine.activate_green_corridor(
            db=db,
            ambulance_id=amb.id,
            current_lat=amb.current_lat,
            current_lng=amb.current_lng,
            radius_km=1.5
        )

    db.commit()
    db.refresh(amb)

    # Broadcast location update over WebSocket
    await ws_manager.broadcast({
        "type": "AMBULANCE_LOCATION",
        "ambulance_id": amb.id,
        "lat": amb.current_lat,
        "lng": amb.current_lng,
        "speed": amb.speed,
        "status": amb.status
    })

    return amb

@router.patch("/{ambulance_id}/status", response_model=AmbulanceResponse)
def update_status(
    ambulance_id: int,
    new_status: str,
    db: Session = Depends(get_db)
):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    
    amb.status = new_status
    if new_status == "AVAILABLE":
        amb.current_emergency_id = None
        traffic_engine.reset_corridor_signals(db, amb.id)
        
    db.commit()
    db.refresh(amb)
    return amb
