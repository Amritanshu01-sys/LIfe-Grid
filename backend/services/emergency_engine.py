import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from models.all_models import (
    Emergency, EmergencyEvent, Ambulance, Hospital, Doctor, Patient,
    FamilyMember, Notification, AuditLog
)
from services.route_engine import haversine_distance, route_engine
from services.hospital_matching_engine import hospital_matching_engine
from services.traffic_engine import traffic_engine

class EmergencyEngine:
    @staticmethod
    def create_emergency_request(
        db: Session,
        caller_name: str,
        caller_phone: str,
        emergency_type: str,
        pickup_address: str,
        pickup_lat: float,
        pickup_lng: float,
        patient_id: Optional[int] = None,
        priority: str = "CRITICAL",
        notes: Optional[str] = None
    ) -> Emergency:
        """
        Primary entry point: orchestrates the full emergency intake workflow.
        """
        tracking_code = f"LG-{datetime.utcnow().strftime('%y%m%d')}-{str(uuid.uuid4())[:6].upper()}"

        # 1. Create emergency record
        emergency = Emergency(
            tracking_code=tracking_code,
            patient_id=patient_id,
            caller_name=caller_name,
            caller_phone=caller_phone,
            emergency_type=emergency_type,
            priority=priority,
            status="REQUESTED",
            pickup_address=pickup_address,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            notes=notes,
            created_at=datetime.utcnow()
        )
        db.add(emergency)
        db.flush()

        # Add initial timeline event
        EmergencyEngine.add_timeline_event(
            db=db,
            emergency_id=emergency.id,
            event_type="REQUEST_CREATED",
            title="Emergency Request Registered",
            description=f"Initial intake for {emergency_type} recorded at {pickup_address}. Triage priority: {priority}.",
            actor_role="PATIENT"
        )

        # 2. Search & Assign Nearest Available Ambulance
        emergency.status = "SEARCHING"
        db.flush()

        ambulance, amb_dist = EmergencyEngine.find_nearest_ambulance(
            db, pickup_lat, pickup_lng, emergency_type
        )

        if ambulance:
            emergency.ambulance_id = ambulance.id
            emergency.status = "AMBULANCE_ASSIGNED"
            ambulance.status = "EN_ROUTE"
            ambulance.current_emergency_id = emergency.id
            emergency.distance_km = amb_dist
            emergency.eta_minutes = route_engine.calculate_eta(amb_dist, speed_kmh=45.0, traffic_factor=1.1)

            # Generate initial route details
            routes_info = route_engine.compare_routes(
                ambulance.current_lat, ambulance.current_lng, pickup_lat, pickup_lng
            )
            emergency.route_details = routes_info

            EmergencyEngine.add_timeline_event(
                db=db,
                emergency_id=emergency.id,
                event_type="AMBULANCE_ASSIGNED",
                title=f"Ambulance {ambulance.vehicle_number} Assigned",
                description=f"Driver: {ambulance.driver_name} ({ambulance.driver_phone}), Paramedic: {ambulance.paramedic_name}. Unit ETA: {emergency.eta_minutes} mins.",
                actor_role="CONTROL_ROOM"
            )

            # Notify ambulance
            EmergencyEngine.create_notification(
                db=db,
                role="ambulance",
                title="URGENT: New Emergency Dispatch",
                message=f"Dispatch to {pickup_address}. Type: {emergency_type}. Priority: {priority}.",
                emergency_id=emergency.id
            )
        else:
            EmergencyEngine.add_timeline_event(
                db=db,
                emergency_id=emergency.id,
                event_type="SEARCH_WARNING",
                title="Ambulance Search Pending",
                description="No primary ambulance immediately within 5km radius. Emergency Control room escalation alerted.",
                actor_role="SYSTEM"
            )

        # 3. Match & Alert Destination Hospital
        matched = hospital_matching_engine.match_hospitals(
            db=db,
            pickup_lat=pickup_lat,
            pickup_lng=pickup_lng,
            emergency_type=emergency_type
        )

        if matched:
            best_hospital = matched[0]
            emergency.hospital_id = best_hospital["hospital_id"]
            emergency.hospital_selection_reason = best_hospital["reason_for_selection"]

            # Assign on-duty doctor if available
            doc = db.query(Doctor).filter(
                Doctor.hospital_id == best_hospital["hospital_id"],
                Doctor.on_duty == True
            ).first()
            if doc:
                emergency.doctor_id = doc.id

            EmergencyEngine.add_timeline_event(
                db=db,
                emergency_id=emergency.id,
                event_type="HOSPITAL_MATCHED",
                title=f"Destination Hospital Selected: {best_hospital['hospital_name']}",
                description=f"Matching Reason: {best_hospital['reason_for_selection']}",
                actor_role="SYSTEM"
            )

            # Pre-arrival alert to hospital & ER doctor
            patient = db.query(Patient).filter(Patient.id == patient_id).first() if patient_id else None
            patient_name = patient.name if patient else caller_name
            blood_grp = patient.blood_group if patient else "Pending Confirmation"

            EmergencyEngine.create_notification(
                db=db,
                role="hospital",
                title=f"PRE-ARRIVAL ALERT: {emergency_type.upper()}",
                message=f"Incoming patient {patient_name} (Blood: {blood_grp}). ETA ~{emergency.eta_minutes + 10} min.",
                emergency_id=emergency.id
            )

        # 4. Traffic Control Priority Coordination
        if ambulance:
            affected_signals = traffic_engine.activate_green_corridor(
                db=db,
                ambulance_id=ambulance.id,
                current_lat=ambulance.current_lat,
                current_lng=ambulance.current_lng,
                radius_km=3.0
            )
            if affected_signals:
                EmergencyEngine.add_timeline_event(
                    db=db,
                    emergency_id=emergency.id,
                    event_type="TRAFFIC_GREEN_CORRIDOR",
                    title="Traffic Priority Activated",
                    description=f"{len(affected_signals)} intersections switched to Emergency Green Wave corridor.",
                    actor_role="TRAFFIC"
                )

        # 5. Notify Family Members
        if patient_id:
            family_members = db.query(FamilyMember).filter(
                FamilyMember.patient_id == patient_id,
                FamilyMember.is_authorized == True
            ).all()
            for fam in family_members:
                EmergencyEngine.create_notification(
                    db=db,
                    role="family",
                    title="LIFEGRID: Emergency Alert For Family Member",
                    message=f"Emergency service dispatched for patient. Tracking code: {tracking_code}. ETA: {emergency.eta_minutes} mins.",
                    emergency_id=emergency.id
                )

        db.commit()
        db.refresh(emergency)
        return emergency

    @staticmethod
    def find_nearest_ambulance(
        db: Session, lat: float, lng: float, emergency_type: str
    ) -> tuple[Optional[Ambulance], float]:
        """Finds the optimal available ambulance using haversine proximity and capability."""
        ambulances = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").all()
        if not ambulances:
            return None, 0.0

        candidates = []
        is_als_needed = any(k in emergency_type.lower() for k in ["cardiac", "stroke", "respiratory", "icu", "trauma"])

        for amb in ambulances:
            dist = haversine_distance(lat, lng, amb.current_lat, amb.current_lng)
            # Prefer ALS for critical emergencies
            score = dist
            if is_als_needed and amb.ambulance_type != "ALS":
                score += 3.0 # slight penalty for BLS when ALS desired
            candidates.append((score, dist, amb))

        candidates.sort(key=lambda x: x[0])
        best_score, actual_dist, chosen_ambulance = candidates[0]
        return chosen_ambulance, actual_dist

    @staticmethod
    def update_emergency_status(
        db: Session,
        emergency_id: int,
        new_status: str,
        actor_role: str,
        notes: Optional[str] = None
    ) -> Emergency:
        """Transitions emergency state and registers timeline milestones."""
        emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
        if not emergency:
            raise ValueError(f"Emergency {emergency_id} not found")

        prev_status = emergency.status
        emergency.status = new_status
        if notes:
            emergency.notes = f"{emergency.notes or ''} | [{datetime.utcnow().strftime('%H:%M')}] {notes}".strip()

        # Update ambulance status if linked
        if emergency.ambulance_id:
            ambulance = db.query(Ambulance).filter(Ambulance.id == emergency.ambulance_id).first()
            if ambulance:
                if new_status == "AMBULANCE_EN_ROUTE":
                    ambulance.status = "EN_ROUTE"
                elif new_status == "ARRIVED":
                    ambulance.status = "ARRIVED"
                elif new_status == "PATIENT_PICKED_UP" or new_status == "TRANSPORTING":
                    ambulance.status = "TRANSPORTING"
                elif new_status == "COMPLETED" or new_status == "CANCELLED":
                    ambulance.status = "AVAILABLE"
                    ambulance.current_emergency_id = None
                    traffic_engine.reset_corridor_signals(db, ambulance.id)

        # Create corresponding timeline event
        titles = {
            "REQUESTED": "Emergency Request Logged",
            "SEARCHING": "Locating Nearest Ambulance",
            "AMBULANCE_ASSIGNED": "Emergency Crew Dispatched",
            "AMBULANCE_EN_ROUTE": "Ambulance En Route to Scene",
            "ARRIVED": "Ambulance Arrived at Scene",
            "PATIENT_PICKED_UP": "Patient Secured in Ambulance",
            "TRANSPORTING": "En Route to Destination Hospital",
            "HOSPITAL_ARRIVED": "Ambulance Arrived at Hospital ER",
            "TREATMENT_STARTED": "Emergency Resuscitation & Treatment Commenced",
            "COMPLETED": "Emergency Care Completed / Handover Finalized",
            "CANCELLED": "Emergency Call Cancelled"
        }

        EmergencyEngine.add_timeline_event(
            db=db,
            emergency_id=emergency.id,
            event_type=f"STATUS_{new_status}",
            title=titles.get(new_status, f"Status: {new_status}"),
            description=notes or f"Emergency transitioned from {prev_status} to {new_status}.",
            actor_role=actor_role
        )

        db.commit()
        db.refresh(emergency)
        return emergency

    @staticmethod
    def transfer_ambulance(
        db: Session, emergency_id: int, reason: str, actor_role: str = "AMBULANCE"
    ) -> Dict[str, Any]:
        """
        Ambulance Transfer Workflow:
        If current ambulance gets stuck or encounters mechanical breakdown,
        safely reassigns a backup ambulance while keeping patient, hospital, and family synced.
        """
        emergency = db.query(Emergency).filter(Emergency.id == emergency_id).first()
        if not emergency:
            raise ValueError("Emergency not found")

        old_ambulance_id = emergency.ambulance_id
        if old_ambulance_id:
            old_amb = db.query(Ambulance).filter(Ambulance.id == old_ambulance_id).first()
            if old_amb:
                old_amb.status = "OFFLINE"
                old_amb.current_emergency_id = None
                traffic_engine.reset_corridor_signals(db, old_amb.id)

        # Find backup ambulance
        ref_lat = emergency.pickup_lat
        ref_lng = emergency.pickup_lng
        new_ambulance, dist = EmergencyEngine.find_nearest_ambulance(db, ref_lat, ref_lng, emergency.emergency_type)

        if not new_ambulance:
            EmergencyEngine.add_timeline_event(
                db=db,
                emergency_id=emergency.id,
                event_type="TRANSFER_FAILED",
                title="Ambulance Transfer Alert: Standby Delay",
                description=f"Transfer requested: '{reason}'. No immediate secondary unit available. Central Dispatch escalated.",
                actor_role="CONTROL_ROOM"
            )
            return {"success": False, "message": "No secondary ambulance available immediately. Control room alerted."}

        # Assign new ambulance
        emergency.ambulance_id = new_ambulance.id
        emergency.status = "AMBULANCE_ASSIGNED"
        new_ambulance.status = "EN_ROUTE"
        new_ambulance.current_emergency_id = emergency.id
        emergency.eta_minutes = route_engine.calculate_eta(dist, speed_kmh=45.0, traffic_factor=1.1)

        EmergencyEngine.add_timeline_event(
            db=db,
            emergency_id=emergency.id,
            event_type="AMBULANCE_TRANSFERRED",
            title=f"Ambulance Reassigned to Unit {new_ambulance.vehicle_number}",
            description=f"Transfer initiated. Reason: {reason}. New crew: {new_ambulance.driver_name}. ETA: {emergency.eta_minutes} mins.",
            actor_role="CONTROL_ROOM"
        )

        EmergencyEngine.create_notification(
            db=db,
            role="family",
            title="Ambulance Update",
            message=f"Backup ambulance ({new_ambulance.vehicle_number}) dispatched. New ETA: {emergency.eta_minutes} mins.",
            emergency_id=emergency.id
        )

        db.commit()
        return {
            "success": True,
            "message": f"Successfully reassigned to {new_ambulance.vehicle_number}",
            "new_ambulance": new_ambulance.vehicle_number,
            "eta_minutes": emergency.eta_minutes
        }

    @staticmethod
    def add_timeline_event(
        db: Session,
        emergency_id: int,
        event_type: str,
        title: str,
        description: Optional[str] = None,
        actor_role: str = "SYSTEM"
    ):
        event = EmergencyEvent(
            emergency_id=emergency_id,
            event_type=event_type,
            title=title,
            description=description,
            timestamp=datetime.utcnow(),
            actor_role=actor_role
        )
        db.add(event)
        db.flush()

    @staticmethod
    def create_notification(
        db: Session,
        role: str,
        title: str,
        message: str,
        emergency_id: Optional[int] = None,
        user_id: Optional[int] = None
    ):
        notif = Notification(
            user_id=user_id,
            role=role,
            title=title,
            message=message,
            emergency_id=emergency_id,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notif)
        db.flush()

emergency_engine = EmergencyEngine()
