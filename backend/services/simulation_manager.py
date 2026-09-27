import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from database import SessionLocal
from models.all_models import (
    Emergency, Ambulance, Hospital, Doctor, Patient, TrafficSignal,
    EmergencyEvent, MedicalRecord, TestResult, Medication, TreatmentNote, Notification
)
from services.route_engine import generate_interpolated_waypoints, route_engine
from services.traffic_engine import traffic_engine
from services.emergency_engine import emergency_engine
from websocket_manager import ws_manager

logger = logging.getLogger("lifegrid.simulation")

DEMO_STEPS = [
    {"step": 1, "name": "Accident created", "status": "REQUESTED"},
    {"step": 2, "name": "Patient detected", "status": "REQUESTED"},
    {"step": 3, "name": "Ambulance searched", "status": "SEARCHING"},
    {"step": 4, "name": "Ambulance assigned", "status": "AMBULANCE_ASSIGNED"},
    {"step": 5, "name": "Ambulance starts", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 6, "name": "GPS moves", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 7, "name": "Traffic detected", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 8, "name": "Route recalculated", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 9, "name": "Hospital selected", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 10, "name": "Hospital receives alert", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 11, "name": "Doctor receives patient summary", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 12, "name": "Family receives update", "status": "AMBULANCE_EN_ROUTE"},
    {"step": 13, "name": "Ambulance arrives", "status": "ARRIVED"},
    {"step": 14, "name": "Patient transferred", "status": "TRANSPORTING"},
    {"step": 15, "name": "Treatment record added", "status": "TREATMENT_STARTED"},
    {"step": 16, "name": "Emergency completed", "status": "COMPLETED"},
]

class SimulationManager:
    def __init__(self):
        self.is_running = False
        self.current_step_index = 0
        self.speed_multiplier = 1.0 # 1.0 = normal, 2.0 = fast
        self.traffic_level = "MODERATE" # LOW, MODERATE, HEAVY
        self.active_emergency_id: Optional[int] = None
        self.task: Optional[asyncio.Task] = None
        self.waypoints: List[Dict[str, float]] = []
        self.current_waypoint_idx = 0

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "current_step": self.current_step_index + 1 if self.is_running or self.current_step_index > 0 else 0,
            "total_steps": len(DEMO_STEPS),
            "step_name": DEMO_STEPS[self.current_step_index]["name"] if self.current_step_index < len(DEMO_STEPS) else "Idle",
            "speed_multiplier": self.speed_multiplier,
            "traffic_level": self.traffic_level,
            "active_emergency_id": self.active_emergency_id
        }

    async def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.current_step_index = 0
        self.current_waypoint_idx = 0
        self.task = asyncio.create_task(self._run_loop())
        logger.info("Simulation loop started")

    async def pause(self):
        self.is_running = False
        if self.task and not self.task.done():
            self.task.cancel()
        logger.info("Simulation paused")

    async def reset(self):
        await self.pause()
        self.current_step_index = 0
        self.current_waypoint_idx = 0
        self.active_emergency_id = None
        logger.info("Simulation reset")

    def set_speed(self, multiplier: float):
        self.speed_multiplier = max(0.2, min(5.0, multiplier))

    def set_traffic(self, level: str):
        if level in ["LOW", "MODERATE", "HEAVY"]:
            self.traffic_level = level

    async def step(self):
        """Execute a single simulation step manually."""
        if self.current_step_index < len(DEMO_STEPS):
            await self._execute_step(self.current_step_index)
            self.current_step_index += 1
            if self.current_step_index >= len(DEMO_STEPS):
                self.is_running = False

    async def _run_loop(self):
        try:
            while self.is_running and self.current_step_index < len(DEMO_STEPS):
                await self._execute_step(self.current_step_index)
                self.current_step_index += 1
                base_delay = 3.5 / self.speed_multiplier
                await asyncio.sleep(base_delay)
            self.is_running = False
            await ws_manager.broadcast({
                "type": "SIMULATION_STATUS",
                "data": self.get_status()
            })
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in simulation loop: {e}", exc_info=True)
            self.is_running = False

    async def _execute_step(self, step_idx: int):
        db = SessionLocal()
        try:
            step_meta = DEMO_STEPS[step_idx]
            step_num = step_meta["step"]
            step_name = step_meta["name"]

            # STEP 1: Accident Created
            if step_num == 1:
                # Find demo patient Rahul Sharma
                patient = db.query(Patient).filter(Patient.name.ilike("%Rahul Sharma%")).first()
                patient_id = patient.id if patient else 1

                # Location: Rajiv Chowk / Connaught Place junction
                em = emergency_engine.create_emergency_request(
                    db=db,
                    caller_name="Pooja Sharma",
                    caller_phone="+91-9876543210",
                    emergency_type="Trauma (High-Speed Vehicle Collision)",
                    pickup_address="Barakhamba Road Intersection, Connaught Place, New Delhi",
                    pickup_lat=28.6304,
                    pickup_lng=77.2177,
                    patient_id=patient_id,
                    priority="CRITICAL",
                    notes="Multi-vehicle collision reported. Patient unconscious, severe leg trauma and chest impact."
                )
                self.active_emergency_id = em.id

                # Generate waypoints for ambulance
                amb = db.query(Ambulance).filter(Ambulance.id == em.ambulance_id).first()
                if amb:
                    self.waypoints = generate_interpolated_waypoints(
                        amb.current_lat, amb.current_lng, em.pickup_lat, em.pickup_lng, 12
                    )

            emergency = db.query(Emergency).filter(Emergency.id == self.active_emergency_id).first()
            if not emergency:
                return

            amb = db.query(Ambulance).filter(Ambulance.id == emergency.ambulance_id).first() if emergency.ambulance_id else None
            hosp = db.query(Hospital).filter(Hospital.id == emergency.hospital_id).first() if emergency.hospital_id else None

            # STEP 2: Patient Detected
            if step_num == 2:
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="PATIENT_IDENTIFIED",
                    title="Patient Medical Profile Retrieved",
                    description="Rahul Sharma, 28 yrs, Blood: O+. Critical Allergy: PENICILLIN. Prior Asthma record loaded into pre-arrival packet.",
                    actor_role="SYSTEM"
                )

            # STEP 3: Ambulance Searched
            elif step_num == 3:
                emergency.status = "SEARCHING"
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="AMBULANCE_GEOSEARCH",
                    title="Fleet Geosearch: 5 ALS Units Scanned",
                    description="Evaluating closest units by travel time and ventilator/ALS readiness.",
                    actor_role="SYSTEM"
                )

            # STEP 4: Ambulance Assigned
            elif step_num == 4:
                emergency.status = "AMBULANCE_ASSIGNED"
                if amb:
                    amb.status = "EN_ROUTE"
                    emergency_engine.add_timeline_event(
                        db=db,
                        emergency_id=emergency.id,
                        event_type="CREW_ACKNOWLEDGED",
                        title=f"Ambulance {amb.vehicle_number} Accepted Call",
                        description=f"Driver {amb.driver_name} acknowledged. Onboard Paramedic: {amb.paramedic_name}.",
                        actor_role="AMBULANCE"
                    )

            # STEP 5: Ambulance Starts
            elif step_num == 5:
                emergency.status = "AMBULANCE_EN_ROUTE"
                if amb:
                    amb.speed = 52.0
                    emergency_engine.add_timeline_event(
                        db=db,
                        emergency_id=emergency.id,
                        event_type="AMBULANCE_DISPATCHED",
                        title="Emergency Vehicle Rolling",
                        description="Sirens and priority beacon active. Approaching arterial corridor.",
                        actor_role="AMBULANCE"
                    )

            # STEP 6: GPS Moves
            elif step_num == 6:
                if amb and self.waypoints and len(self.waypoints) > 2:
                    amb.current_lat = self.waypoints[3]["lat"]
                    amb.current_lng = self.waypoints[3]["lng"]
                    amb.speed = 58.0
                    emergency.distance_km = max(0.8, emergency.distance_km - 1.2)
                    emergency.eta_minutes = max(3, emergency.eta_minutes - 3)
                    emergency_engine.add_timeline_event(
                        db=db,
                        emergency_id=emergency.id,
                        event_type="GPS_TELEMETRY",
                        title="Live GPS Broadcast: Radial Road 2",
                        description=f"Speed: {amb.speed} km/h. Distance to patient: {emergency.distance_km} km. ETA: {emergency.eta_minutes} mins.",
                        actor_role="AMBULANCE"
                    )

            # STEP 7: Traffic Detected
            elif step_num == 7:
                traffic_signals = traffic_engine.get_upcoming_intersections(db, emergency.pickup_lat, emergency.pickup_lng)
                congested_name = traffic_signals[0].intersection_name if traffic_signals else "Mandi House Junction"
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="TRAFFIC_BOTTLENECK",
                    title=f"Congestion Detected: {congested_name}",
                    description="Heavy peak arterial traffic detected ahead. LIFEGRID AI triggers dynamic bypass evaluation.",
                    actor_role="TRAFFIC"
                )

            # STEP 8: Route Recalculated
            elif step_num == 8:
                comparison = route_engine.compare_routes(
                    emergency.pickup_lat, emergency.pickup_lng,
                    hosp.lat if hosp else 28.6139, hosp.lng if hosp else 77.2090
                )
                emergency.route_details = comparison
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="ROUTE_OPTIMIZED",
                    title="Dynamic Route Recalculated -> Priority Bypass (Route B)",
                    description="Switched to green corridor route. Saved ~4 minutes. Traffic signal priority active.",
                    actor_role="AI"
                )
                if amb:
                    traffic_engine.activate_green_corridor(db, amb.id, amb.current_lat, amb.current_lng)

            # STEP 9: Hospital Selected
            elif step_num == 9:
                if hosp:
                    emergency_engine.add_timeline_event(
                        db=db,
                        emergency_id=emergency.id,
                        event_type="HOSPITAL_FINALIZED",
                        title=f"Target Facility: {hosp.name}",
                        description=f"Selected using multi-factor decision engine: Level-1 Trauma capability verified, {hosp.available_icu} ICU beds free, nearest specialized trauma bay.",
                        actor_role="CONTROL_ROOM"
                    )

            # STEP 10: Hospital Receives Alert
            elif step_num == 10:
                if hosp:
                    emergency_engine.add_timeline_event(
                        db=db,
                        emergency_id=emergency.id,
                        event_type="PRE_ARRIVAL_ALERT",
                        title="Hospital Trauma Bay Pre-Alert Activated",
                        description=f"Pre-arrival packet sent to {hosp.name}. Blood Type O+ verified. Zero Penicillin alert flagged.",
                        actor_role="HOSPITAL"
                    )

            # STEP 11: Doctor Receives Patient Summary
            elif step_num == 11:
                doc = db.query(Doctor).filter(Doctor.id == emergency.doctor_id).first() if emergency.doctor_id else None
                doc_name = doc.name if doc else "Dr. Vikram Seth (Trauma Lead)"
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="DOCTOR_BRIEFED",
                    title=f"Attending Doctor Notified: {doc_name}",
                    description="AI pre-arrival summary received on doctor tablet. Resuscitation Bay 1 reserved.",
                    actor_role="DOCTOR"
                )

            # STEP 12: Family Receives Update
            elif step_num == 12:
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="FAMILY_SYNC",
                    title="Family Portal Real-Time Notification Sent",
                    description=f"Family notified: Ambulance arrival imminent. Destination confirmed: {hosp.name if hosp else 'Hospital'}.",
                    actor_role="PATIENT"
                )

            # STEP 13: Ambulance Arrives
            elif step_num == 13:
                emergency.status = "ARRIVED"
                if amb:
                    amb.status = "ARRIVED"
                    amb.current_lat = emergency.pickup_lat
                    amb.current_lng = emergency.pickup_lng
                    amb.speed = 0.0
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="ARRIVED_AT_SCENE",
                    title="Ambulance On Scene",
                    description="Emergency crew arrived at Barakhamba Rd. Paramedics initiating cervical spine stabilization and IV access.",
                    actor_role="AMBULANCE"
                )

            # STEP 14: Patient Picked Up & Transferred to Ambulance
            elif step_num == 14:
                emergency.status = "TRANSPORTING"
                if amb:
                    amb.status = "TRANSPORTING"
                    amb.speed = 64.0
                    if hosp:
                        amb.current_lat = (emergency.pickup_lat + hosp.lat) / 2.0
                        amb.current_lng = (emergency.pickup_lng + hosp.lng) / 2.0
                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="PATIENT_SECURED",
                    title="Patient Onboard -> En Route to Hospital",
                    description="Patient secured in ambulance. SpO2 96%, BP 118/76, pulse 88. Heading to Emergency Department.",
                    actor_role="AMBULANCE"
                )

            # STEP 15: Treatment Record Added
            elif step_num == 15:
                emergency.status = "TREATMENT_STARTED"
                if hosp:
                    hosp.available_beds = max(0, hosp.available_beds - 1)
                    hosp.available_icu = max(0, hosp.available_icu - 1)
                
                # Create clinical record
                rec = MedicalRecord(
                    emergency_id=emergency.id,
                    patient_id=emergency.patient_id or 1,
                    doctor_id=emergency.doctor_id,
                    diagnosis="Polytrauma with blunt chest contusion and closed tibial fracture",
                    vitals={"bp": "122/80", "pulse": 84, "spO2": 98, "temp": "98.4 F", "gcs": "14/15"},
                    summary="Patient arrived conscious. Cervical collar maintained. Primary trauma survey completed.",
                    outcome="Stabilized in Trauma ICU"
                )
                db.add(rec)
                db.flush()

                # Add test result
                test = TestResult(
                    medical_record_id=rec.id,
                    emergency_id=emergency.id,
                    test_name="Whole Body CT & Focused Sonography (FAST)",
                    result_status="NORMAL",
                    result_value="No intracranial bleed. No hemoperitoneum.",
                    notes="FAST scan negative for free fluid. Orthopedic consult requested for left tibia."
                )
                db.add(test)

                # Add medication
                med = Medication(
                    medical_record_id=rec.id,
                    emergency_id=emergency.id,
                    medicine_name="Tramadol 50mg IV + Normal Saline 500ml",
                    dosage="50mg",
                    route="IV",
                    instructions="Administered for acute pain control. Note: Avoid all beta-lactam antibiotics due to verified penicillin allergy."
                )
                db.add(med)

                # Add doctor note
                note = TreatmentNote(
                    medical_record_id=rec.id,
                    emergency_id=emergency.id,
                    author_name="Dr. Vikram Seth",
                    author_role="Lead Trauma Surgeon",
                    note_text="Pre-arrival alert allowed trauma team to prep bay 5 minutes early. Patient stabilized smoothly."
                )
                db.add(note)

                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="TREATMENT_LOGGED",
                    title="Treatment Initiated & Clinical Notes Documented",
                    description="Primary trauma scan completed. IV analgesia given (penicillin allergy respected). FAST negative.",
                    actor_role="DOCTOR"
                )

            # STEP 16: Emergency Completed
            elif step_num == 16:
                emergency.status = "COMPLETED"
                if amb:
                    amb.status = "AVAILABLE"
                    amb.current_emergency_id = None
                    amb.speed = 0.0
                    traffic_engine.reset_corridor_signals(db, amb.id)

                emergency_engine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="CASE_CLOSED",
                    title="Emergency Case Successfully Closed",
                    description="Patient handed over to Orthopedic Surgery and Trauma ICU. Ambulance returned to AVAILABLE status.",
                    actor_role="SYSTEM"
                )

            db.commit()

            # Broadcast simulation and emergency update to all dashboards via WebSocket
            await ws_manager.broadcast({
                "type": "SIMULATION_STEP",
                "step": step_num,
                "name": step_name,
                "emergency_id": emergency.id,
                "status": emergency.status,
                "ambulance_lat": amb.current_lat if amb else None,
                "ambulance_lng": amb.current_lng if amb else None,
                "timestamp": datetime.utcnow().isoformat()
            })

        finally:
            db.close()

simulation_manager = SimulationManager()
