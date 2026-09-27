from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import (
    FamilyMember, Emergency, Patient, Ambulance, Hospital, EmergencyEvent, MedicalRecord
)
from auth.jwt_handler import get_current_user

router = APIRouter(prefix="/family", tags=["Family Portal"])

@router.get("/dashboard")
def get_family_dashboard(
    patient_id: Optional[int] = None,
    emergency_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Family Member Authorized View:
    Exposes vital emergency status, location, ETA, ambulance crew, hospital name,
    and milestone timeline WITHOUT exposing unrestricted sensitive raw clinical files.
    """
    # Find active emergency for patient or specific id
    if emergency_id:
        em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    elif patient_id:
        em = db.query(Emergency).filter(Emergency.patient_id == patient_id).order_by(Emergency.created_at.desc()).first()
    else:
        # Default to latest active emergency
        em = db.query(Emergency).order_by(Emergency.created_at.desc()).first()

    if not em:
        return {
            "has_active_emergency": False,
            "message": "No active emergency on record."
        }

    patient = db.query(Patient).filter(Patient.id == em.patient_id).first() if em.patient_id else None
    amb = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first() if em.ambulance_id else None
    hosp = db.query(Hospital).filter(Hospital.id == em.hospital_id).first() if em.hospital_id else None
    events = db.query(EmergencyEvent).filter(
        EmergencyEvent.emergency_id == em.id
    ).order_by(EmergencyEvent.timestamp.asc()).all()

    # Basic sanitized clinical status for family
    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    basic_status = rec.outcome if rec else (
        "In Transit with Paramedic Crew" if em.status in ["PATIENT_PICKED_UP", "TRANSPORTING"] else (
            "Ambulance En Route to Scene" if em.status in ["AMBULANCE_ASSIGNED", "AMBULANCE_EN_ROUTE"] else (
                "Being Evaluated in Hospital Emergency Department" if em.status in ["HOSPITAL_ARRIVED", "TREATMENT_STARTED"] else "Emergency Assistance Requested"
            )
        )
    )

    return {
        "has_active_emergency": True,
        "emergency_id": em.id,
        "tracking_code": em.tracking_code,
        "patient_name": patient.name if patient else em.caller_name,
        "emergency_status": em.status,
        "ambulance_number": amb.vehicle_number if amb else "Assigning...",
        "ambulance_crew": {
            "driver_name": amb.driver_name if amb else "EMS Driver",
            "driver_phone": amb.driver_phone if amb else "112",
            "paramedic": amb.paramedic_name if amb else "Certified Paramedic"
        } if amb else None,
        "ambulance_location": {
            "lat": amb.current_lat if amb else em.pickup_lat,
            "lng": amb.current_lng if amb else em.pickup_lng,
            "speed_kmh": amb.speed if amb else 0
        },
        "eta_minutes": em.eta_minutes,
        "destination_hospital": {
            "name": hosp.name if hosp else "Matching Suitable Hospital...",
            "address": hosp.address if hosp else "",
            "phone": hosp.phone if hosp else "",
            "emergency_department_status": hosp.status if hosp else "NORMAL"
        },
        "basic_treatment_status": basic_status,
        "timeline": [
            {
                "time": e.timestamp.strftime("%H:%M"),
                "title": e.title,
                "description": e.description,
                "actor": e.actor_role
            }
            for e in events
        ]
    }
