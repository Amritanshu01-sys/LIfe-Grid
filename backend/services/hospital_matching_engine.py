from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models.all_models import Hospital
from services.route_engine import haversine_distance, RouteEngine

class HospitalMatchingEngine:
    @staticmethod
    def match_hospitals(
        db: Session,
        pickup_lat: float,
        pickup_lng: float,
        emergency_type: str,
        patient_age: Optional[int] = None,
        preferred_hospital_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Multi-factor decision-support matching:
        Evaluates Distance, ETA, Specialty Capability, Bed/ICU Availability, and Emergency Department Load.
        """
        hospitals = db.query(Hospital).all()
        if not hospitals:
            return []

        scored_candidates = []

        emergency_lower = emergency_type.lower()
        is_trauma = any(k in emergency_lower for k in ["trauma", "accident", "fracture", "bleed", "head injury", "fall"])
        is_cardiac = any(k in emergency_lower for k in ["cardiac", "heart", "chest pain", "arrest", "myocardial"])
        is_burn = any(k in emergency_lower for k in ["burn", "fire", "acid", "scald"])
        is_pediatric = (patient_age is not None and patient_age < 16) or "child" in emergency_lower or "infant" in emergency_lower

        for h in hospitals:
            distance = haversine_distance(pickup_lat, pickup_lng, h.lat, h.lng)
            traffic_factor = 1.3 if h.status == "HIGH_LOAD" else 1.0
            eta = RouteEngine.calculate_eta(distance, speed_kmh=42.0, traffic_factor=traffic_factor)

            # Score computation (Higher is better)
            score = 100.0

            # 1. Proximity penalty: 2 points per km
            score -= (distance * 2.0)

            # 2. Bed & ICU capacity
            bed_ratio = (h.available_beds / max(1, h.total_beds))
            icu_ratio = (h.available_icu / max(1, h.total_icu))

            if h.available_beds <= 0:
                score -= 30.0
            else:
                score += (bed_ratio * 15.0)

            if h.available_icu <= 0:
                score -= 20.0
            else:
                score += (icu_ratio * 20.0)

            # 3. Emergency load
            if h.status == "CRITICAL":
                score -= 40.0
            elif h.status == "HIGH_LOAD":
                score -= 15.0

            # 4. Capability matching
            capability_matches = []
            if is_trauma:
                if h.trauma_ready:
                    score += 25.0
                    capability_matches.append("Level-1 Trauma Center verified")
                else:
                    score -= 35.0

            if is_cardiac:
                if h.cardiac_ready:
                    score += 25.0
                    capability_matches.append("24/7 Cath Lab & Cardiac ICU available")
                else:
                    score -= 35.0

            if is_burn:
                if h.burn_unit:
                    score += 35.0
                    capability_matches.append("Dedicated Burn Care Unit on stand-by")
                else:
                    score -= 45.0

            if is_pediatric:
                if h.pediatric_ready:
                    score += 20.0
                    capability_matches.append("Pediatric Emergency & NICU/PICU ready")
                else:
                    score -= 25.0

            # Build human-readable reason
            reasons = []
            if capability_matches:
                reasons.extend(capability_matches)
            reasons.append(f"ETA: {eta} min ({distance} km)")
            reasons.append(f"{h.available_icu} ICU / {h.available_beds} General beds free")
            
            if h.status == "NORMAL":
                reasons.append("ER status: Optimal triage capacity")
            elif h.status == "HIGH_LOAD":
                reasons.append("ER status: High patient intake (expect triage delay)")
            else:
                reasons.append("ER status: Diversion recommended")

            reason_str = " | ".join(reasons)

            scored_candidates.append({
                "hospital_id": h.id,
                "hospital_name": h.name,
                "hospital_code": h.code,
                "address": h.address,
                "phone": h.phone,
                "distance_km": distance,
                "eta_minutes": eta,
                "available_beds": h.available_beds,
                "total_beds": h.total_beds,
                "available_icu": h.available_icu,
                "total_icu": h.total_icu,
                "trauma_ready": h.trauma_ready,
                "cardiac_ready": h.cardiac_ready,
                "pediatric_ready": h.pediatric_ready,
                "burn_unit": h.burn_unit,
                "er_status": h.status,
                "match_score": round(score, 1),
                "reason_for_selection": reason_str,
                "lat": h.lat,
                "lng": h.lng
            })

        # Rank candidates by match score descending
        scored_candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return scored_candidates

hospital_matching_engine = HospitalMatchingEngine()
