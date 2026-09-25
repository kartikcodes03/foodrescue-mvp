"""Routing engine: volunteer ke saare tasks ka best stop-order (nearest-neighbour, pickup -> drop precedence)."""
from math import asin, cos, radians, sin, sqrt

SPEED_KMH = 25  # city average

def haversine(lat1, lng1, lat2, lng2) -> float:
    a = sin(radians(lat2 - lat1) / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ** 2
    return 2 * 6371 * asin(sqrt(a))

def plan_route(start: tuple[float, float], tasks: list[dict]) -> dict:
    """tasks: {id, food, pickup, pickup_name, drop, drop_name, picked}. pickup/drop = (lat, lng)."""
    by_id = {t["id"]: t for t in tasks}
    todo = {t["id"]: ("drop" if t["picked"] else "pickup") for t in tasks}
    pos, total, stops = start, 0.0, []
    while todo:
        tid, kind = min(todo.items(), key=lambda kv: haversine(*pos, *by_id[kv[0]][kv[1]]))
        point = by_id[tid][kind]
        leg = haversine(*pos, *point)
        total += leg
        pos = point
        stops.append({
            "donation_id": tid, "type": kind, "food": by_id[tid]["food"],
            "place": by_id[tid][f"{kind}_name"], "lat": point[0], "lng": point[1],
            "leg_km": round(leg, 2), "eta_min": round(total / SPEED_KMH * 60),
        })
        if kind == "pickup":
            todo[tid] = "drop"
        else:
            del todo[tid]
    return {"stops": stops, "total_km": round(total, 2), "total_min": round(total / SPEED_KMH * 60)}
