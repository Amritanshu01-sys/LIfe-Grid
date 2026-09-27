from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

# Authentication & User
class UserLogin(BaseModel):
    username_or_email: str
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    role: str
    full_name: str
    phone: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    role: str
    full_name: str
    phone: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Patient
class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    blood_group: str
    emergency_contact: str
    emergency_phone: str
    allergies: Optional[str] = None
    existing_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    previous_history: Optional[str] = None
    notes: Optional[str] = None
    emergency_preferences: Optional[str] = None

class PatientCreate(PatientBase):
    user_id: Optional[int] = None

class PatientUpdate(BaseModel):
    allergies: Optional[str] = None
    existing_conditions: Optional[str] = None
    current_medications: Optional[str] = None
    notes: Optional[str] = None
    emergency_preferences: Optional[str] = None

class PatientResponse(PatientBase):
    id: int
    user_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Emergency & Timeline
class EmergencyCreate(BaseModel):
    patient_id: Optional[int] = None
    caller_name: str
    caller_phone: str
    emergency_type: str # Trauma, Cardiac Arrest, Stroke, Respiratory Distress, Burn, Accident, General
    priority: Optional[str] = "CRITICAL"
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    notes: Optional[str] = None
    voice_transcript: Optional[str] = None

class EmergencyUpdateStatus(BaseModel):
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None

class TimelineEventResponse(BaseModel):
    id: int
    emergency_id: int
    event_type: str
    title: str
    description: Optional[str] = None
    timestamp: datetime
    actor_role: str

    class Config:
        from_attributes = True

class EmergencyResponse(BaseModel):
    id: int
    tracking_code: str
    patient_id: Optional[int] = None
    caller_name: str
    caller_phone: str
    emergency_type: str
    priority: str
    status: str
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    ambulance_id: Optional[int] = None
    hospital_id: Optional[int] = None
    doctor_id: Optional[int] = None
    eta_minutes: int
    distance_km: float
    hospital_selection_reason: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Ambulance
class AmbulanceResponse(BaseModel):
    id: int
    vehicle_number: str
    ambulance_type: str
    driver_name: str
    driver_phone: str
    paramedic_name: str
    status: str
    current_lat: float
    current_lng: float
    speed: float
    equipment: str
    current_emergency_id: Optional[int] = None

    class Config:
        from_attributes = True

class AmbulanceLocationUpdate(BaseModel):
    lat: float
    lng: float
    speed: Optional[float] = 0.0

class AmbulanceTransferRequest(BaseModel):
    reason: str
    urgency: Optional[str] = "HIGH"

# Hospital
class HospitalResponse(BaseModel):
    id: int
    name: str
    code: str
    address: str
    lat: float
    lng: float
    total_beds: int
    available_beds: int
    total_icu: int
    available_icu: int
    trauma_ready: bool
    cardiac_ready: bool
    pediatric_ready: bool
    burn_unit: bool
    status: str
    phone: str
    email: str

    class Config:
        from_attributes = True

class HospitalCapacityUpdate(BaseModel):
    available_beds: Optional[int] = None
    available_icu: Optional[int] = None
    status: Optional[str] = None

class PreArrivalAlert(BaseModel):
    emergency_id: int
    tracking_code: str
    patient_name: str
    age: int
    blood_group: str
    emergency_type: str
    eta_minutes: int
    allergies: Optional[str] = None
    existing_conditions: Optional[str] = None
    required_specialty: str
    ambulance_number: str

# Doctor & Medical
class DoctorResponse(BaseModel):
    id: int
    name: str
    specialty: str
    on_duty: bool
    phone: Optional[str] = None
    room: str
    hospital_id: int

    class Config:
        from_attributes = True

class DiagnosisCreate(BaseModel):
    diagnosis: str
    vitals: Optional[Dict[str, Any]] = None
    summary: Optional[str] = None
    outcome: Optional[str] = None

class TestResultCreate(BaseModel):
    test_name: str
    result_status: str
    result_value: Optional[str] = None
    notes: Optional[str] = None

class MedicationCreate(BaseModel):
    medicine_name: str
    dosage: str
    route: str = "IV"
    instructions: Optional[str] = None

class TreatmentNoteCreate(BaseModel):
    author_name: str
    author_role: str
    note_text: str

# Blood Bank
class BloodInventoryItem(BaseModel):
    blood_group: str
    units_available: int
    last_updated: datetime

    class Config:
        from_attributes = True

class BloodBankResponse(BaseModel):
    id: int
    name: str
    address: str
    lat: float
    lng: float
    contact_phone: str
    email: Optional[str] = None
    inventory: List[BloodInventoryItem] = []

    class Config:
        from_attributes = True

# Traffic
class TrafficSignalResponse(BaseModel):
    id: int
    intersection_name: str
    lat: float
    lng: float
    current_state: str
    emergency_priority_active: bool
    target_ambulance_id: Optional[int] = None
    congestion_level: str
    delay_factor: float

    class Config:
        from_attributes = True

# AI Assistant
class AIChatRequest(BaseModel):
    message: str
    user_role: Optional[str] = "patient"
    emergency_id: Optional[int] = None
    user_id: Optional[int] = None

class AIChatResponse(BaseModel):
    reply: str
    intent: Optional[str] = None
    suggested_actions: List[str] = []
    tool_called: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    requires_escalation: bool = False

class AIVoiceRequest(BaseModel):
    transcript: str
    language: Optional[str] = "en" # en, hi, hinglish
    user_role: Optional[str] = "patient"
    location: Optional[Dict[str, float]] = None

# Simulation
class SimulationControlRequest(BaseModel):
    action: str # start, pause, reset, step, speed_up, slow_down, increase_traffic, decrease_traffic
    speed_multiplier: Optional[float] = 1.0
