"""Matching engine: har donation ko best NGO need se jodta hai.
score = 0.5*paas hona + 0.3*quantity fit + 0.2*NGO kitna time se wait kar raha hai
Hard rules: category match, MAX_KM ke andar, expiry se pehle pahunch sake."""
from datetime import datetime, timezone
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from ..models import Donation, Need
from .routing import SPEED_KMH, haversine

MAX_KM = 25
BUFFER_MIN = 30  # pickup + handover ke liye safety time

def score(d: Donation, need: Need, now: datetime) -> float | None:
    ngo = need.ngo
    if need.status != "open" or ngo.lat is None:
        return None
    if need.category not in ("any", d.category):
        return None
    km = haversine(d.lat, d.lng, ngo.lat, ngo.lng)
    if km > MAX_KM:
        return None
    minutes_left = (d.expiry_time - now).total_seconds() / 60
    if minutes_left < km / SPEED_KMH * 60 + BUFFER_MIN:
        return None
    remaining = max(need.servings_needed - need.servings_received, 1)
    fit = min(d.quantity, remaining) / max(d.quantity, remaining)
    waited_h = (now - need.created_at).total_seconds() / 3600
    return 0.5 * (1 - km / MAX_KM) + 0.3 * fit + 0.2 * min(waited_h / 24, 1)

def match_donation(db: Session, d: Donation) -> bool:
    now = datetime.now(timezone.utc)
    needs = db.scalars(select(Need).where(Need.status == "open")).all()
    scored = [(s, n) for n in needs if (s := score(d, n, now)) is not None]
    if not scored:
        return False
    s, need = max(scored, key=lambda x: x[0])
    d.ngo_id, d.need_id, d.match_score, d.status = need.ngo_id, need.id, round(s, 3), "matched"
    need.servings_received += d.quantity
    if need.servings_received >= need.servings_needed:
        need.status = "fulfilled"
    db.commit()
    return True

def match_pending(db: Session) -> int:
    pending = db.scalars(select(Donation).where(Donation.status == "available").order_by(Donation.expiry_time)).all()
    return sum(match_donation(db, d) for d in pending)  # jaldi expire hone wale pehle

def expire_old(db: Session) -> None:
    db.execute(update(Donation)
               .where(Donation.status.in_(["available", "matched", "assigned"]),
                      Donation.expiry_time < datetime.now(timezone.utc))
               .values(status="expired"))
    db.commit()
