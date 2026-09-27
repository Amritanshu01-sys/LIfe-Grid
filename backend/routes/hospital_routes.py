from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import Hospital, Emergency, Patient, Doctor, Ambulance
from schemas.all_schemas import HospitalResponse, HospitalCapacityUpdate, PreArrivalAlert
from services.emergency_engine import emergency_engine

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])

@router.get("", response_model=List[HospitalResponse])
def list_hospitals(db: Session = Depends(get_db)):
    return db.query(Hospital).all()

@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return hosp

@router.get("/{hospital_id}/pre-alerts")
def get_hospital_pre_alerts(hospital_id: int, db: Session = Depends(get_db)):
    """Fetch all active incoming emergency alerts for this hospital's trauma/ER team."""
    active_statuses = ["AMBULANCE_ASSIGNED", "AMBULANCE_EN_ROUTE", "ARRIVED", "PATIENT_PICKED_UP", "TRANSPORTING"]
    emergencies = db.query(Emergency).filter(
        Emergency.hospital_id == hospital_id,
        Emergency.status.in_(active_statuses)
    ).order_by(Emergency.eta_minutes.asc()).all()

    alerts = []
    for em in emergencies:
        patient = db.query(Patient).filter(Patient.id == em.patient_id).first() if em.patient_id else None
        amb = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first() if em.ambulance_id else None
        
        alerts.append({
            "emergency_id": em.id,
            "tracking_code": em.tracking_code,
            "patient_name": patient.name if patient else em.caller_name,
            "age": patient.age if patient else 32,
            "gender": patient.gender if patient else "Unknown",
            "blood_group": patient.blood_group if patient else "Pending",
            "emergency_type": em.emergency_type,
            "priority": em.priority,
            "eta_minutes": em.eta_minutes,
            "status": em.status,
            "allergies": patient.allergies if patient else "None reported",
            "existing_conditions": patient.existing_conditions if patient else "None",
            "current_medications": patient.current_medications if patient else "None",
            "required_specialty": "Trauma / Surgical" if "Trauma" in em.emergency_type else "Cardiology / Cath Lab",
            "ambulance_number": amb.vehicle_number if amb else "ALS Unit",
            "driver_name": amb.driver_name if amb else "Paramedic Crew",
            "driver_phone": amb.driver_phone if amb else "112",
            "selection_reason": em.hospital_selection_reason
        })

    return alerts

@router.patch("/{hospital_id}/capacity", response_model=HospitalResponse)
def update_capacity(
    hospital_id: int,
    payload: HospitalCapacityUpdate,
    db: Session = Depends(get_db)
):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    if payload.available_beds is not None:
        hosp.available_beds = max(0, payload.available_beds)
    if payload.available_icu is not None:
        hosp.available_icu = max(0, payload.available_icu)
    if payload.status:
        hosp.status = payload.status

    db.commit()
    db.refresh(hosp)
    return hosp

@router.post("/{hospital_id}/emergency/{emergency_id}/accept")
def hospital_accept_emergency(
    hospital_id: int,
    emergency_id: int,
    db: Session = Depends(get_db)
):
    emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency not found")

    emergency_engine.add_timeline_event(
        db=db,
        emergency_id=emergency_id,
        event_type="HOSPITAL_ACCEPTED",
        title="Hospital Accepted Case & Prepared ER Bay",
        description="Resuscitation Bay reserved. Attending trauma team stood up.",
        actor_role="HOSPITAL"
    )
    db.commit()
    return {"status": "success", "message": "Emergency intake accepted"}
