from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models.all_models import (
    Doctor, Emergency, Patient, MedicalRecord, TestResult, Medication, TreatmentNote, Ambulance
)
from schemas.all_schemas import (
    DoctorResponse, DiagnosisCreate, TestResultCreate, MedicationCreate, TreatmentNoteCreate
)
from services.emergency_engine import emergency_engine

router = APIRouter(prefix="/doctor", tags=["Doctor"])

@router.get("/list", response_model=List[DoctorResponse])
def list_doctors(db: Session = Depends(get_db)):
    return db.query(Doctor).all()

@router.get("/patient/{emergency_id}")
def get_doctor_patient_view(emergency_id: int, db: Session = Depends(get_db)):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    patient = db.query(Patient).filter(Patient.id == em.patient_id).first() if em.patient_id else None
    amb = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first() if em.ambulance_id else None

    # Get clinical record if exists
    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    tests = db.query(TestResult).filter(TestResult.emergency_id == em.id).all()
    meds = db.query(Medication).filter(Medication.emergency_id == em.id).all()
    notes = db.query(TreatmentNote).filter(TreatmentNote.emergency_id == em.id).all()

    # AI Clinical Pre-Arrival Brief (Summary only - strictly decision support, no diagnosis)
    ai_summary = (
        f"PRE-ARRIVAL BRIEF: {em.emergency_type} case with ETA ~{em.eta_minutes} min via {amb.vehicle_number if amb else 'Ambulance'}. "
        f"Patient {patient.name if patient else 'Unknown'}, age {patient.age if patient else 'N/A'}. "
        f"CRITICAL ALLERGIES: {patient.allergies if patient else 'None recorded'}. "
        f"Pertinent History: {patient.existing_conditions or 'None'}. "
        f"Primary survey on arrival recommended."
    )

    return {
        "emergency": em,
        "patient": patient,
        "ambulance": amb,
        "ai_prearrival_summary": ai_summary,
        "medical_record": rec,
        "tests": tests,
        "medications": meds,
        "treatment_notes": notes
    }

@router.post("/patient/{emergency_id}/diagnosis")
def add_diagnosis(
    emergency_id: int,
    payload: DiagnosisCreate,
    db: Session = Depends(get_db)
):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    if not rec:
        rec = MedicalRecord(
            emergency_id=em.id,
            patient_id=em.patient_id or 1,
            doctor_id=em.doctor_id,
            diagnosis=payload.diagnosis,
            vitals=payload.vitals or {"bp": "120/80", "pulse": 80, "spO2": 99},
            summary=payload.summary,
            outcome=payload.outcome or "Under Observation"
        )
        db.add(rec)
    else:
        rec.diagnosis = payload.diagnosis
        if payload.vitals:
            rec.vitals = payload.vitals
        if payload.summary:
            rec.summary = payload.summary
        if payload.outcome:
            rec.outcome = payload.outcome

    emergency_engine.add_timeline_event(
        db=db,
        emergency_id=em.id,
        event_type="DIAGNOSIS_LOGGED",
        title=f"Clinical Diagnosis: {payload.diagnosis}",
        description=payload.summary or "Attending physician diagnosis updated in digital chart.",
        actor_role="DOCTOR"
    )

    db.commit()
    db.refresh(rec)
    return rec

@router.post("/patient/{emergency_id}/test")
def add_test(
    emergency_id: int,
    payload: TestResultCreate,
    db: Session = Depends(get_db)
):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    if not rec:
        rec = MedicalRecord(emergency_id=em.id, patient_id=em.patient_id or 1)
        db.add(rec)
        db.flush()

    test = TestResult(
        medical_record_id=rec.id,
        emergency_id=em.id,
        test_name=payload.test_name,
        result_status=payload.result_status,
        result_value=payload.result_value,
        notes=payload.notes
    )
    db.add(test)

    emergency_engine.add_timeline_event(
        db=db,
        emergency_id=em.id,
        event_type="TEST_ORDERED",
        title=f"Diagnostic Test: {payload.test_name} ({payload.result_status})",
        description=f"Findings: {payload.result_value or 'Pending'}. {payload.notes or ''}",
        actor_role="DOCTOR"
    )

    db.commit()
    db.refresh(test)
    return test

@router.post("/patient/{emergency_id}/medication")
def add_medication(
    emergency_id: int,
    payload: MedicationCreate,
    db: Session = Depends(get_db)
):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    if not rec:
        rec = MedicalRecord(emergency_id=em.id, patient_id=em.patient_id or 1)
        db.add(rec)
        db.flush()

    med = Medication(
        medical_record_id=rec.id,
        emergency_id=em.id,
        medicine_name=payload.medicine_name,
        dosage=payload.dosage,
        route=payload.route,
        instructions=payload.instructions
    )
    db.add(med)

    emergency_engine.add_timeline_event(
        db=db,
        emergency_id=em.id,
        event_type="MEDICATION_ADMINISTERED",
        title=f"Medication: {payload.medicine_name} {payload.dosage} ({payload.route})",
        description=payload.instructions or "Administered as prescribed by attending physician.",
        actor_role="DOCTOR"
    )

    db.commit()
    db.refresh(med)
    return med

@router.post("/patient/{emergency_id}/note")
def add_treatment_note(
    emergency_id: int,
    payload: TreatmentNoteCreate,
    db: Session = Depends(get_db)
):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    rec = db.query(MedicalRecord).filter(MedicalRecord.emergency_id == em.id).first()
    if not rec:
        rec = MedicalRecord(emergency_id=em.id, patient_id=em.patient_id or 1)
        db.add(rec)
        db.flush()

    note = TreatmentNote(
        medical_record_id=rec.id,
        emergency_id=em.id,
        author_name=payload.author_name,
        author_role=payload.author_role,
        note_text=payload.note_text
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
