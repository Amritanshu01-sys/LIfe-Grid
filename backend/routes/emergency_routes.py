from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import Emergency, EmergencyEvent, Ambulance, Hospital, Doctor, Patient
from schemas.all_schemas import (
    EmergencyCreate, EmergencyResponse, EmergencyUpdateStatus,
    TimelineEventResponse, AmbulanceTransferRequest
)
from services.emergency_engine import emergency_engine
from auth.jwt_handler import get_current_user

router = APIRouter(prefix="/emergency", tags=["Emergencies"])

@router.post("", response_model=EmergencyResponse)
def create_emergency(payload: EmergencyCreate, db: Session = Depends(get_db)):
    em = emergency_engine.create_emergency_request(
        db=db,
        caller_name=payload.caller_name,
        caller_phone=payload.caller_phone,
        emergency_type=payload.emergency_type,
        pickup_address=payload.pickup_address,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        patient_id=payload.patient_id,
        priority=payload.priority or "CRITICAL",
        notes=payload.notes
    )
    return em

@router.get("", response_model=List[EmergencyResponse])
def list_emergencies(
    status: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(Emergency)
    if status:
        query = query.filter(Emergency.status == status)
    return query.order_by(Emergency.created_at.desc()).limit(limit).all()

@router.get("/{emergency_id}")
def get_emergency_detail(emergency_id: int, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")
    
    ambulance = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first() if em.ambulance_id else None
    hospital = db.query(Hospital).filter(Hospital.id == em.hospital_id).first() if em.hospital_id else None
    doctor = db.query(Doctor).filter(Doctor.id == em.doctor_id).first() if em.doctor_id else None
    patient = db.query(Patient).filter(Patient.id == em.patient_id).first() if em.patient_id else None
    events = db.query(EmergencyEvent).filter(
        EmergencyEvent.emergency_id == em.id
    ).order_by(EmergencyEvent.timestamp.asc()).all()

    return {
        "emergency": em,
        "ambulance": ambulance,
        "hospital": hospital,
        "doctor": doctor,
        "patient": {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "blood_group": patient.blood_group,
            "allergies": patient.allergies,
            "existing_conditions": patient.existing_conditions,
            "current_medications": patient.current_medications,
            "emergency_contact": f"{patient.emergency_contact} ({patient.emergency_phone})"
        } if patient else None,
        "events": events
    }

@router.patch("/{emergency_id}/status", response_model=EmergencyResponse)
def update_status(
    emergency_id: int,
    payload: EmergencyUpdateStatus,
    db: Session = Depends(get_db)
):
    try:
        em = emergency_engine.update_emergency_status(
            db=db,
            emergency_id=emergency_id,
            new_status=payload.status,
            actor_role="CONTROL_ROOM",
            notes=payload.notes
        )
        return em
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{emergency_id}/transfer")
def transfer_ambulance(
    emergency_id: int,
    payload: AmbulanceTransferRequest,
    db: Session = Depends(get_db)
):
    res = emergency_engine.transfer_ambulance(
        db=db,
        emergency_id=emergency_id,
        reason=payload.reason
    )
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("message"))
    return res

@router.get("/{emergency_id}/timeline", response_model=List[TimelineEventResponse])
def get_timeline(emergency_id: int, db: Session = Depends(get_db)):
    events = db.query(EmergencyEvent).filter(
        EmergencyEvent.emergency_id == emergency_id
    ).order_by(EmergencyEvent.timestamp.asc()).all()
    return events
