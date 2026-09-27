from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import (
    Emergency, Ambulance, Hospital, TrafficSignal, BloodBank, BloodInventory,
    EmergencyEvent, Notification, User, Doctor
)
from services.emergency_engine import emergency_engine

router = APIRouter(prefix="/admin", tags=["Emergency Control Room"])

@router.get("/overview")
def get_control_room_overview(db: Session = Depends(get_db)):
    """Comprehensive single-pane-of-glass telemetry for Central Emergency Control Room."""
    emergencies = db.query(Emergency).order_by(Emergency.created_at.desc()).all()
    ambulances = db.query(Ambulance).all()
    hospitals = db.query(Hospital).all()
    signals = db.query(TrafficSignal).all()
    notifications = db.query(Notification).order_by(Notification.created_at.desc()).limit(15).all()

    active_emergencies = [e for e in emergencies if e.status not in ["COMPLETED", "CANCELLED"]]
    active_ambulances = [a for a in ambulances if a.status in ["EN_ROUTE", "TRANSPORTING", "ARRIVED", "BUSY"]]
    total_beds = sum(h.total_beds for h in hospitals)
    available_beds = sum(h.available_beds for h in hospitals)
    total_icu = sum(h.total_icu for h in hospitals)
    available_icu = sum(h.available_icu for h in hospitals)
    priority_signals = [s for s in signals if s.emergency_priority_active]

    # Blood bank inventory aggregation
    blood_totals = {}
    for inv in db.query(BloodInventory).all():
        blood_totals[inv.blood_group] = blood_totals.get(inv.blood_group, 0) + inv.units_available

    return {
        "stats": {
            "active_emergencies": len(active_emergencies),
            "total_emergencies_today": len(emergencies),
            "fleet_total": len(ambulances),
            "fleet_active": len(active_ambulances),
            "fleet_available": len([a for a in ambulances if a.status == "AVAILABLE"]),
            "hospitals_monitored": len(hospitals),
            "available_beds": available_beds,
            "total_beds": total_beds,
            "available_icu": available_icu,
            "total_icu": total_icu,
            "priority_green_corridors": len(priority_signals),
        },
        "blood_inventory_summary": blood_totals,
        "active_emergencies": active_emergencies[:10],
        "ambulances": ambulances,
        "hospitals": hospitals,
        "traffic_signals": signals,
        "system_alerts": notifications
    }

@router.post("/reassign")
def control_reassign(
    emergency_id: int,
    ambulance_id: Optional[int] = None,
    hospital_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    em = db.query(Emergency).filter(Emergency.id == emergency_id).first()
    if not em:
        raise HTTPException(status_code=404, detail="Emergency not found")

    if ambulance_id:
        old_amb_id = em.ambulance_id
        if old_amb_id:
            old_amb = db.query(Ambulance).filter(Ambulance.id == old_amb_id).first()
            if old_amb:
                old_amb.status = "AVAILABLE"
                old_amb.current_emergency_id = None
        new_amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
        if new_amb:
            em.ambulance_id = new_amb.id
            new_amb.status = "EN_ROUTE"
            new_amb.current_emergency_id = em.id
            emergency_engine.add_timeline_event(
                db=db,
                emergency_id=em.id,
                event_type="DISPATCH_OVERRIDE",
                title=f"Manual Ambulance Dispatch Override: Unit {new_amb.vehicle_number}",
                description="Emergency Control Officer manually reassigned emergency crew.",
                actor_role="CONTROL_ROOM"
            )

    if hospital_id:
        hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
        if hosp:
            em.hospital_id = hosp.id
            emergency_engine.add_timeline_event(
                db=db,
                emergency_id=em.id,
                event_type="HOSPITAL_OVERRIDE",
                title=f"Hospital Diversion / Destination Override: {hosp.name}",
                description="Manual hospital destination override executed by Control Room.",
                actor_role="CONTROL_ROOM"
            )

    db.commit()
    db.refresh(em)
    return em
