from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models.all_models import TrafficSignal, Emergency, Ambulance
from services.route_engine import haversine_distance

class TrafficEngine:
    @staticmethod
    def get_upcoming_intersections(
        db: Session,
        current_lat: float,
        current_lng: float,
        max_distance_km: float = 3.5
    ) -> List[TrafficSignal]:
        """Find intersections near the current location of an emergency vehicle."""
        signals = db.query(TrafficSignal).all()
        nearby = []
        for sig in signals:
            dist = haversine_distance(current_lat, current_lng, sig.lat, sig.lng)
            if dist <= max_distance_km:
                nearby.append((dist, sig))
        
        nearby.sort(key=lambda x: x[0])
        return [item[1] for item in nearby]

    @staticmethod
    def activate_green_corridor(
        db: Session,
        ambulance_id: int,
        current_lat: float,
        current_lng: float,
        radius_km: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Simulates LIFEGRID Emergency Green Wave:
        Detects approaching ambulance, activates emergency priority, and turns signals GREEN.
        """
        signals = db.query(TrafficSignal).all()
        affected_signals = []
        
        for sig in signals:
            dist = haversine_distance(current_lat, current_lng, sig.lat, sig.lng)
            if dist <= radius_km:
                sig.emergency_priority_active = True
                sig.current_state = "GREEN"
                sig.target_ambulance_id = ambulance_id
                sig.delay_factor = 0.8 # Cleared traffic flow
                affected_signals.append({
                    "id": sig.id,
                    "intersection_name": sig.intersection_name,
                    "distance_km": dist,
                    "status": "PRIORITY_GREEN_ENGAGED",
                    "lat": sig.lat,
                    "lng": sig.lng
                })
        
        db.commit()
        return affected_signals

    @staticmethod
    def reset_corridor_signals(db: Session, ambulance_id: int):
        """Restores normal cycling after ambulance passes."""
        signals = db.query(TrafficSignal).filter(TrafficSignal.target_ambulance_id == ambulance_id).all()
        for sig in signals:
            sig.emergency_priority_active = False
            sig.target_ambulance_id = None
            sig.current_state = "RED" # Cycle normally
            sig.delay_factor = 1.0
        db.commit()

traffic_engine = TrafficEngine()
