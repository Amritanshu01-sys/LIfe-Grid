from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON
)
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(120), unique=True, index=True, nullable=False)
    username = Column(String(60), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False) # patient, family, admin, ambulance, doctor, hospital, traffic, bloodbank
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    blood_group = Column(String(10), nullable=False) # A+, A-, B+, B-, O+, O-, AB+, AB-
    emergency_contact = Column(String(120), nullable=False)
    emergency_phone = Column(String(30), nullable=False)
    allergies = Column(Text, nullable=True)
    existing_conditions = Column(Text, nullable=True)
    current_medications = Column(Text, nullable=True)
    previous_history = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    emergency_preferences = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="patient_profile")
    emergencies = relationship("Emergency", back_populates="patient")
    family_members = relationship("FamilyMember", back_populates="patient")

class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    relationship_to_patient = Column(String(50), nullable=False)
    contact_phone = Column(String(30), nullable=False)
    is_authorized = Column(Boolean, default=True)

    patient = relationship("Patient", back_populates="family_members")

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String(30), unique=True, index=True, nullable=False)
    ambulance_type = Column(String(30), default="ALS") # BLS (Basic), ALS (Advanced), Mobile ICU
    driver_name = Column(String(100), nullable=False)
    driver_phone = Column(String(30), nullable=False)
    paramedic_name = Column(String(100), nullable=False)
    status = Column(String(30), default="AVAILABLE") # AVAILABLE, BUSY, EN_ROUTE, ARRIVED, TRANSPORTING, OFFLINE
    current_lat = Column(Float, nullable=False)
    current_lng = Column(Float, nullable=False)
    speed = Column(Float, default=0.0) # km/h
    equipment = Column(Text, default="Oxygen, Defibrillator, Ventilator, Monitor")
    current_emergency_id = Column(Integer, nullable=True)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), index=True, nullable=False)
    code = Column(String(30), unique=True, index=True, nullable=False)
    address = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    total_beds = Column(Integer, default=100)
    available_beds = Column(Integer, default=20)
    total_icu = Column(Integer, default=20)
    available_icu = Column(Integer, default=5)
    trauma_ready = Column(Boolean, default=True)
    cardiac_ready = Column(Boolean, default=True)
    pediatric_ready = Column(Boolean, default=True)
    burn_unit = Column(Boolean, default=False)
    status = Column(String(30), default="NORMAL") # NORMAL, HIGH_LOAD, CRITICAL
    phone = Column(String(30), nullable=False)
    email = Column(String(100), nullable=False)

    doctors = relationship("Doctor", back_populates="hospital")
    emergencies = relationship("Emergency", back_populates="hospital")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(120), nullable=False)
    specialty = Column(String(100), nullable=False) # Emergency Medicine, Cardiology, Trauma Surgery, Neurology
    on_duty = Column(Boolean, default=True)
    phone = Column(String(30), nullable=True)
    room = Column(String(30), default="ER-1")

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")

class Emergency(Base):
    __tablename__ = "emergencies"

    id = Column(Integer, primary_key=True, index=True)
    tracking_code = Column(String(40), unique=True, index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    caller_name = Column(String(120), nullable=False)
    caller_phone = Column(String(30), nullable=False)
    emergency_type = Column(String(50), nullable=False) # Trauma, Cardiac Arrest, Stroke, Respiratory Distress, Burn, Accident, General
    priority = Column(String(20), default="CRITICAL") # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(40), default="REQUESTED")
    # States: REQUESTED, SEARCHING, AMBULANCE_ASSIGNED, AMBULANCE_EN_ROUTE, ARRIVED, PATIENT_PICKED_UP, TRANSPORTING, HOSPITAL_ARRIVED, TREATMENT_STARTED, COMPLETED, CANCELLED
    
    pickup_address = Column(String(255), nullable=False)
    pickup_lat = Column(Float, nullable=False)
    pickup_lng = Column(Float, nullable=False)
    
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    
    eta_minutes = Column(Integer, default=12)
    distance_km = Column(Float, default=4.5)
    route_details = Column(JSON, nullable=True) # GeoJSON or list of lat/lng waypoints
    hospital_selection_reason = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    patient = relationship("Patient", back_populates="emergencies")
    hospital = relationship("Hospital", back_populates="emergencies")
    events = relationship("EmergencyEvent", back_populates="emergency", order_by="EmergencyEvent.timestamp")
    medical_records = relationship("MedicalRecord", back_populates="emergency")

class EmergencyEvent(Base):
    __tablename__ = "emergency_events"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergencies.id"), nullable=False)
    event_type = Column(String(50), nullable=False)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor_role = Column(String(40), default="SYSTEM") # SYSTEM, PATIENT, AMBULANCE, HOSPITAL, DOCTOR, TRAFFIC, AI

    emergency = relationship("Emergency", back_populates="events")

class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(Integer, primary_key=True, index=True)
    emergency_id = Column(Integer, ForeignKey("emergencies.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    diagnosis = Column(String(255), nullable=True)
    vitals = Column(JSON, nullable=True) # bp, pulse, spO2, temp, gcs
    summary = Column(Text, nullable=True)
    outcome = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    emergency = relationship("Emergency", back_populates="medical_records")
    tests = relationship("TestResult", back_populates="medical_record")
    medications = relationship("Medication", back_populates="medical_record")
    treatment_notes = relationship("TreatmentNote", back_populates="medical_record")

class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    test_name = Column(String(100), nullable=False) # ECG, Troponin, Chest X-Ray, CT Scan, CBC
    result_status = Column(String(50), default="PENDING") # PENDING, NORMAL, ABNORMAL, CRITICAL
    result_value = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    medical_record = relationship("MedicalRecord", back_populates="tests")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    medicine_name = Column(String(100), nullable=False)
    dosage = Column(String(60), nullable=False)
    route = Column(String(30), default="IV") # IV, Oral, Inhalation, IM
    instructions = Column(String(255), nullable=True)
    administered_at = Column(DateTime, default=datetime.utcnow)

    medical_record = relationship("MedicalRecord", back_populates="medications")

class TreatmentNote(Base):
    __tablename__ = "treatment_notes"

    id = Column(Integer, primary_key=True, index=True)
    medical_record_id = Column(Integer, ForeignKey("medical_records.id"), nullable=False)
    author_name = Column(String(100), nullable=False)
    author_role = Column(String(50), nullable=False)
    note_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    medical_record = relationship("MedicalRecord", back_populates="treatment_notes")

class BloodBank(Base):
    __tablename__ = "blood_banks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    contact_phone = Column(String(30), nullable=False)
    email = Column(String(100), nullable=True)

    inventory = relationship("BloodInventory", back_populates="blood_bank")

class BloodInventory(Base):
    __tablename__ = "blood_inventory"

    id = Column(Integer, primary_key=True, index=True)
    blood_bank_id = Column(Integer, ForeignKey("blood_banks.id"), nullable=False)
    blood_group = Column(String(10), nullable=False) # A+, A-, B+, B-, O+, O-, AB+, AB-
    units_available = Column(Integer, default=0)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    blood_bank = relationship("BloodBank", back_populates="inventory")

class TrafficSignal(Base):
    __tablename__ = "traffic_signals"

    id = Column(Integer, primary_key=True, index=True)
    intersection_name = Column(String(150), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    current_state = Column(String(20), default="RED") # RED, YELLOW, GREEN
    emergency_priority_active = Column(Boolean, default=False)
    target_ambulance_id = Column(Integer, nullable=True)
    congestion_level = Column(String(20), default="MODERATE") # LOW, MODERATE, HEAVY
    delay_factor = Column(Float, default=1.0)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String(40), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    role = Column(String(40), nullable=False)
    title = Column(String(150), nullable=False)
    message = Column(Text, nullable=False)
    emergency_id = Column(Integer, nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
