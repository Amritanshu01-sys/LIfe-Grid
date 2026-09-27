from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import Patient, User, Emergency, MedicalRecord
from schemas.all_schemas import PatientResponse, PatientCreate, PatientUpdate, EmergencyResponse
from auth.jwt_handler import get_current_user

router = APIRouter(prefix="/patient", tags=["Patient Profile"])

@router.get("/profile", response_model=PatientResponse)
def get_patient_profile(
    patient_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if patient_id:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
    elif current_user:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    else:
        # Default demo patient Rahul Sharma
        patient = db.query(Patient).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.put("/profile", response_model=PatientResponse)
def update_patient_profile(
    payload: PatientUpdate,
    patient_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if patient_id:
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
    elif current_user:
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    else:
        patient = db.query(Patient).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if payload.allergies is not None:
        patient.allergies = payload.allergies
    if payload.existing_conditions is not None:
        patient.existing_conditions = payload.existing_conditions
    if payload.current_medications is not None:
        patient.current_medications = payload.current_medications
    if payload.notes is not None:
        patient.notes = payload.notes
    if payload.emergency_preferences is not None:
        patient.emergency_preferences = payload.emergency_preferences

    db.commit()
    db.refresh(patient)
    return patient

@router.get("/history", response_model=List[EmergencyResponse])
def get_patient_history(
    patient_id: Optional[int] = None,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    pid = patient_id
    if not pid and current_user:
        p = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if p:
            pid = p.id
    if not pid:
        pid = 1

    return db.query(Emergency).filter(Emergency.patient_id == pid).order_by(Emergency.created_at.desc()).all()
