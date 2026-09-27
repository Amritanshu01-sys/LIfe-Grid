import math
from typing import Dict, List, Tuple, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on the earth."""
    R = 6371.0 # Radius of earth in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def generate_interpolated_waypoints(
    start_lat: float, start_lng: float, end_lat: float, end_lng: float, num_points: int = 15
) -> List[Dict[str, float]]:
    """Generates realistic intermediate navigation waypoints with minor street-like jitter."""
    waypoints = []
    for i in range(num_points + 1):
        ratio = i / float(num_points)
        lat = start_lat + (end_lat - start_lat) * ratio
        lng = start_lng + (end_lng - start_lng) * ratio
        # Add realistic micro curvature if not endpoints
        if 0 < i < num_points:
            curve_lat = math.sin(ratio * math.pi) * 0.0015
            curve_lng = math.cos(ratio * math.pi) * 0.0012
            lat += curve_lat
            lng += curve_lng
        waypoints.append({"lat": round(lat, 6), "lng": round(lng, 6)})
    return waypoints

class RouteEngine:
    @staticmethod
    def calculate_eta(distance_km: float, speed_kmh: float = 40.0, traffic_factor: float = 1.0) -> int:
        """Calculates ETA in minutes based on distance, average speed, and traffic congestion factor."""
        effective_speed = max(10.0, speed_kmh / traffic_factor)
        hours = distance_km / effective_speed
        minutes = int(math.ceil(hours * 60))
        return max(2, minutes)

    @staticmethod
    def compare_routes(start_lat: float, start_lng: float, end_lat: float, end_lng: float) -> Dict[str, Any]:
        """
        Calculates and compares primary vs alternative routes.
        Illustrates SIH requirement: Route A (direct but heavy traffic) vs Route B (slight detour, faster green corridor).
        """
        direct_dist = haversine_distance(start_lat, start_lng, end_lat, end_lng)
        
        # Route A: Direct arterials with heavy traffic
        dist_a = round(direct_dist * 1.15, 2)
        traffic_factor_a = 1.8 # Heavy congestion
        eta_a = RouteEngine.calculate_eta(dist_a, speed_kmh=42.0, traffic_factor=traffic_factor_a)
        waypoints_a = generate_interpolated_waypoints(start_lat, start_lng, end_lat, end_lng, 12)
        
        # Route B: Green corridor / Ring bypass with moderate traffic
        dist_b = round(direct_dist * 1.35, 2)
        traffic_factor_b = 1.15 # Moderate/Priority Corridor
        eta_b = RouteEngine.calculate_eta(dist_b, speed_kmh=52.0, traffic_factor=traffic_factor_b)
        
        # Route B waypoints with a slight diversion
        waypoints_b = []
        for wp in waypoints_a:
            waypoints_b.append({
                "lat": round(wp["lat"] + 0.003, 6),
                "lng": round(wp["lng"] + 0.004, 6)
            })

        recommended = "Route B" if eta_b < eta_a else "Route A"
        reason = f"Route B bypasses main arterial bottlenecks with smart traffic signal priority, saving {abs(eta_a - eta_b)} minutes despite slightly longer distance."

        return {
            "recommended_route": recommended,
            "recommendation_reason": reason,
            "routes": [
                {
                    "name": "Route A (Direct Arterial)",
                    "distance_km": dist_a,
                    "eta_minutes": eta_a,
                    "traffic_condition": "Heavy Traffic",
                    "congestion_factor": traffic_factor_a,
                    "signal_coordination": "Standard",
                    "waypoints": waypoints_a
                },
                {
                    "name": "Route B (LIFEGRID Priority Corridor)",
                    "distance_km": dist_b,
                    "eta_minutes": eta_b,
                    "traffic_condition": "Clear / Prioritized",
                    "congestion_factor": traffic_factor_b,
                    "signal_coordination": "Green Wave Synchronized",
                    "waypoints": waypoints_b
                }
            ]
        }

route_engine = RouteEngine()
