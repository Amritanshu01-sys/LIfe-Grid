import os
import re
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from models.all_models import (
    Emergency, Ambulance, Hospital, Patient, BloodBank, BloodInventory,
    EmergencyEvent, MedicalRecord
)
from services.emergency_engine import emergency_engine
from services.hospital_matching_engine import hospital_matching_engine
from services.route_engine import route_engine

SAFETY_DISCLAIMER = (
    "\n\n[LIFEGRID AI Safety Note: I am an AI coordination assistant, not a clinical doctor. "
    "I do not diagnose medical conditions or prescribe medication. In life-threatening emergencies, "
    "human dispatch and hospital medical staff provide direct clinical care.]"
)

class LifegridAIService:
    """
    LIFEGRID AI Assistant Layer
    Provides natural language understanding (English, Hindi, Hinglish),
    strictly executes through controlled backend tools, and maintains medical safety boundaries.
    """

    # Controlled AI Tools
    @staticmethod
    def tool_create_emergency(
        db: Session,
        caller_name: str,
        caller_phone: str,
        emergency_type: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        patient_id: Optional[int] = None
    ) -> Dict[str, Any]:
        em = emergency_engine.create_emergency_request(
            db=db,
            caller_name=caller_name,
            caller_phone=caller_phone,
            emergency_type=emergency_type,
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            patient_id=patient_id,
            priority="CRITICAL",
            notes="Initiated via LIFEGRID AI Natural Language Intake"
        )
        return {
            "status": "success",
            "emergency_id": em.id,
            "tracking_code": em.tracking_code,
            "ambulance_id": em.ambulance_id,
            "eta_minutes": em.eta_minutes,
            "hospital_id": em.hospital_id
        }

    @staticmethod
    def tool_get_emergency_status(db: Session, emergency_id: int) -> Dict[str, Any]:
        em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
        if not em:
            return {"error": "Emergency not found"}
        
        amb = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first() if em.ambulance_id else None
        hosp = db.query(Hospital).filter(Hospital.id == em.hospital_id).first() if em.hospital_id else None
        
        events = db.query(EmergencyEvent).filter(
            EmergencyEvent.emergency_id == em.id
        ).order_by(EmergencyEvent.timestamp.desc()).limit(5).all()

        return {
            "tracking_code": em.tracking_code,
            "current_status": em.status,
            "priority": em.priority,
            "eta_minutes": em.eta_minutes,
            "ambulance_unit": amb.vehicle_number if amb else "Searching / Standby",
            "destination_hospital": hosp.name if hosp else "Matching in progress",
            "recent_milestones": [f"[{e.actor_role}] {e.title}" for e in events]
        }

    @staticmethod
    def tool_get_ambulance_status(db: Session, ambulance_id: int) -> Dict[str, Any]:
        amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
        if not amb:
            return {"error": "Ambulance not found"}
        return {
            "vehicle_number": amb.vehicle_number,
            "type": amb.ambulance_type,
            "status": amb.status,
            "driver_name": amb.driver_name,
            "paramedic": amb.paramedic_name,
            "speed_kmh": amb.speed,
            "lat": amb.current_lat,
            "lng": amb.current_lng
        }

    @staticmethod
    def tool_find_blood_availability(db: Session, blood_group: str) -> Dict[str, Any]:
        group_clean = blood_group.strip().upper()
        results = db.query(BloodInventory, BloodBank).join(
            BloodBank, BloodInventory.blood_bank_id == BloodBank.id
        ).filter(
            BloodInventory.blood_group.ilike(f"%{group_clean}%"),
            BloodInventory.units_available > 0
        ).order_by(BloodInventory.units_available.desc()).limit(5).all()

        data = []
        for inv, bank in results:
            data.append({
                "blood_bank": bank.name,
                "address": bank.address,
                "phone": bank.contact_phone,
                "group": inv.blood_group,
                "units_available": inv.units_available
            })
        return {
            "requested_group": group_clean,
            "banks_found": len(data),
            "availability": data
        }

    @staticmethod
    def tool_get_hospital_capacity(db: Session, hospital_name_or_id: Any) -> Dict[str, Any]:
        if isinstance(hospital_name_or_id, int):
            hosp = db.query(Hospital).filter(Hospital.id == hospital_name_or_id).first()
        else:
            hosp = db.query(Hospital).filter(Hospital.name.ilike(f"%{str(hospital_name_or_id)}%")).first()

        if not hosp:
            return {"error": "Hospital not found"}
        return {
            "name": hosp.name,
            "status": hosp.status,
            "available_beds": hosp.available_beds,
            "total_beds": hosp.total_beds,
            "available_icu": hosp.available_icu,
            "total_icu": hosp.total_icu,
            "trauma_ready": hosp.trauma_ready,
            "cardiac_ready": hosp.cardiac_ready
        }

    @staticmethod
    def tool_get_patient_summary(db: Session, patient_id: int) -> Dict[str, Any]:
        p = db.query(Patient).filter(Patient.id == patient_id).first()
        if not p:
            return {"error": "Patient record not found"}
        return {
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "allergies": p.allergies or "None recorded",
            "existing_conditions": p.existing_conditions or "None recorded",
            "current_medications": p.current_medications or "None recorded",
            "emergency_contact": f"{p.emergency_contact} ({p.emergency_phone})"
        }

    # NLP & Processing Layer
    @classmethod
    def process_chat(
        cls,
        db: Session,
        message: str,
        user_role: str = "patient",
        emergency_id: Optional[int] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        text = message.lower().strip()

        # 1. Safety Guardrail: Block unauthorized clinical diagnosis / prescriptions
        diagnostic_probes = ["diagnose", "what illness do i have", "prescribe medicine", "prescribe", "kya dawai khau", "kaunsi dawai", "tablet name"]
        if any(probe in text for probe in diagnostic_probes):
            return {
                "reply": "I cannot provide a medical diagnosis or prescribe medications. In emergency situations, please consult the attending emergency doctor or paramedic directly." + SAFETY_DISCLAIMER,
                "intent": "safety_block",
                "suggested_actions": ["Request Emergency Assistance", "View Hospital Info", "Talk to Doctor"],
                "requires_escalation": False
            }

        # 2. Hindi / Hinglish Emergency Trigger
        # "Mera accident ho gaya hai, ambulance chahiye", "Madad chahiye", "Help emergency"
        emergency_keywords = [
            "accident", "ambulance", "emergency", "madad", "chahiye", "chest pain",
            "dil ka daura", "heart attack", "khoon", "bleeding", "unconscious", "behosh"
        ]
        if any(k in text for k in ["ambulance", "accident", "emergency", "madad", "chest pain", "behosh", "heart attack"]):
            # Check if requesting new dispatch
            if any(k in text for k in ["chahiye", "need", "request", "send", "bhejo", "call"]):
                # Controlled Tool Call: create emergency intake proposal
                return {
                    "reply": "I can help coordinate immediate emergency dispatch. Please confirm your pickup location and whether the patient is conscious.",
                    "intent": "emergency_intake_request",
                    "suggested_actions": ["Dispatch Ambulance to Current GPS", "Emergency Type: Trauma", "Emergency Type: Cardiac"],
                    "tool_called": "create_emergency",
                    "requires_escalation": True
                }

        # 3. Status Query: "Where is my ambulance?", "Ambulance kahan hai?", "Emergency status"
        if any(k in text for k in ["where is", "kahan hai", "status", "eta", "kab aayegi", "track"]):
            if emergency_id or any(k in text for k in ["ambulance", "emergency"]):
                # Query most recent or specified emergency
                em = db.query(Emergency).filter(Emergency.id == emergency_id).first() if emergency_id else (
                    db.query(Emergency).order_by(Emergency.created_at.desc()).first()
                )
                if em:
                    res = cls.tool_get_emergency_status(db, em.id)
                    amb_unit = res['ambulance_unit']
                    eta = res['eta_minutes']
                    st = res['current_status']
                    hosp = res['destination_hospital']
                    return {
                        "reply": f"Emergency #{res['tracking_code']} is currently **{st}**. Ambulance unit **{amb_unit}** is en route with an estimated ETA of **{eta} minutes** heading toward **{hosp}**.",
                        "intent": "emergency_status_query",
                        "tool_called": "get_emergency_status",
                        "tool_result": res,
                        "suggested_actions": ["View Live Map", "Contact Driver", "Hospital Pre-Alert Details"],
                        "requires_escalation": False
                    }

        # 4. Blood Availability Query: "Find blood", "O- blood", "Khoon chahiye", "Blood bank"
        blood_match = re.search(r'\b(a|b|ab|o)[\s]*(\+|\-|positive|negative)\b', text, re.IGNORECASE)
        if blood_match or "blood" in text or "khoon" in text:
            group = blood_match.group(0).upper().replace("POSITIVE", "+").replace("NEGATIVE", "-").replace(" ", "") if blood_match else "O+"
            res = cls.tool_find_blood_availability(db, group)
            banks = res.get("availability", [])
            if banks:
                summary_lines = [f"• **{b['blood_bank']}**: {b['units_available']} units of {group} ({b['phone']})" for b in banks[:3]]
                return {
                    "reply": f"Found {res['banks_found']} verified blood banks with **{group}** in stock:\n\n" + "\n".join(summary_lines),
                    "intent": "blood_bank_query",
                    "tool_called": "find_blood_availability",
                    "tool_result": res,
                    "suggested_actions": ["Search Another Blood Group", "View All Blood Banks", "Contact Blood Bank"],
                    "requires_escalation": False
                }

        # 5. Hospital Capacity Query: "Hospital beds", "ICU status", "Is hospital full?"
        if any(k in text for k in ["hospital", "bed", "icu", "capacity", "aspatal"]):
            hospitals = db.query(Hospital).limit(3).all()
            lines = [f"• **{h.name}**: {h.available_beds} General beds, {h.available_icu} ICU beds ({h.status})" for h in hospitals]
            return {
                "reply": "Current emergency hospital bed availability:\n\n" + "\n".join(lines),
                "intent": "hospital_capacity_query",
                "tool_called": "get_hospital_capacity",
                "suggested_actions": ["Find Suitable Hospital", "View Hospital Map", "Filter by Trauma Ready"],
                "requires_escalation": False
            }

        # Default conversational assistance with safety boundaries
        return {
            "reply": (
                "Hello! I am LIFEGRID AI, your emergency coordination assistant. "
                "I can assist with: \n"
                "1. Starting an emergency ambulance request\n"
                "2. Live tracking ambulance ETA and hospital destination\n"
                "3. Checking hospital ICU and general bed capacity\n"
                "4. Locating emergency blood bank stocks across all blood groups\n\n"
                "How can I assist you right now?" + SAFETY_DISCLAIMER
            ),
            "intent": "general_help",
            "suggested_actions": ["Request Emergency Assistance", "Where is my ambulance?", "Find O- blood", "Show hospital status"],
            "requires_escalation": False
        }

    @classmethod
    def process_voice(
        cls,
        db: Session,
        transcript: str,
        language: str = "en",
        user_role: str = "patient",
        location: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Voice assistant pipeline:
        Takes recognized speech transcript, runs natural language tool detection,
        and returns structured response formatted for Text-to-Speech synthesis.
        """
        chat_resp = cls.process_chat(db, message=transcript, user_role=user_role)
        
        # Audio-friendly concise speech script without complex markdown
        clean_speech = chat_resp["reply"].replace("*", "").replace("#", "").split("[LIFEGRID AI Safety Note")[0].strip()

        return {
            "transcript_heard": transcript,
            "language_detected": language,
            "spoken_response": clean_speech,
            "intent": chat_resp.get("intent"),
            "tool_called": chat_resp.get("tool_called"),
            "suggested_actions": chat_resp.get("suggested_actions", []),
            "requires_escalation": chat_resp.get("requires_escalation", False)
        }

lifegrid_ai = LifegridAIService()
