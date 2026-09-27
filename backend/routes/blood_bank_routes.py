from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.all_models import BloodBank, BloodInventory, Hospital
from schemas.all_schemas import BloodBankResponse
from services.route_engine import haversine_distance

router = APIRouter(prefix="/bloodbank", tags=["Blood Bank"])

@router.get("", response_model=List[BloodBankResponse])
def list_blood_banks(db: Session = Depends(get_db)):
    return db.query(BloodBank).all()

@router.get("/search")
def search_blood(
    blood_group: str = Query(..., description="e.g. O-, O+, A+, B+"),
    near_hospital_id: Optional[int] = Query(None, description="Find blood banks closest to this hospital"),
    ref_lat: Optional[float] = Query(None),
    ref_lng: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    clean_group = blood_group.strip().upper()

    # Determine reference coordinate
    lat = ref_lat
    lng = ref_lng
    hospital_name = None
    if near_hospital_id:
        hosp = db.query(Hospital).filter(Hospital.id == near_hospital_id).first()
        if hosp:
            lat = hosp.lat
            lng = hosp.lng
            hospital_name = hosp.name

    inventories = db.query(BloodInventory, BloodBank).join(
        BloodBank, BloodInventory.blood_bank_id == BloodBank.id
    ).filter(
        BloodInventory.blood_group.ilike(f"%{clean_group}%"),
        BloodInventory.units_available > 0
    ).all()

    results = []
    for inv, bank in inventories:
        dist = round(haversine_distance(lat, lng, bank.lat, bank.lng), 2) if (lat and lng) else None
        results.append({
            "blood_bank_id": bank.id,
            "bank_name": bank.name,
            "address": bank.address,
            "contact_phone": bank.contact_phone,
            "email": bank.email,
            "blood_group": inv.blood_group,
            "units_available": inv.units_available,
            "last_updated": inv.last_updated.isoformat(),
            "distance_km": dist,
            "lat": bank.lat,
            "lng": bank.lng
        })

    if lat and lng:
        results.sort(key=lambda x: (x["distance_km"] if x["distance_km"] is not None else 999))

    return {
        "requested_group": clean_group,
        "near_hospital": hospital_name,
        "total_results": len(results),
        "results": results
    }

@router.patch("/inventory/{inventory_id}")
def update_inventory_units(
    inventory_id: int,
    units: int,
    db: Session = Depends(get_db)
):
    inv = db.query(BloodInventory).filter(BloodInventory.id == inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    inv.units_available = max(0, units)
    db.commit()
    db.refresh(inv)
    return inv
