from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import require_roles
from ..engines.matching import match_donation
from ..engines.routing import haversine, plan_route
from ..models import Donation, User
from ..schemas import DonationCreate, DonationOut

router = APIRouter(prefix="/donations", tags=["donations"])
ACTIVE = ["assigned", "picked_up"]

def to_out(d: Donation, from_: User | None = None) -> DonationOut:
    dist = None
    if from_ and from_.lat is not None:
        dist = round(haversine(from_.lat, from_.lng, d.lat, d.lng), 2)
    return DonationOut(
        id=d.id, food_name=d.food_name, category=d.category, quantity=d.quantity,
        expiry_time=d.expiry_time, status=d.status, match_score=d.match_score,
        address=d.address, lat=d.lat, lng=d.lng, donor_name=d.donor.name,
        ngo_name=d.ngo.name if d.ngo else None, ngo_address=d.ngo.address if d.ngo else None,
        ngo_lat=d.ngo.lat if d.ngo else None, ngo_lng=d.ngo.lng if d.ngo else None,
        volunteer_name=d.volunteer.name if d.volunteer else None,
        distance_km=dist, created_at=d.created_at)

@router.post("", response_model=DonationOut)
def create_donation(body: DonationCreate, donor: User = Depends(require_roles("donor")), db: Session = Depends(get_db)):
    lat = body.lat if body.lat is not None else donor.lat
    lng = body.lng if body.lng is not None else donor.lng
    if lat is None or lng is None:
        raise HTTPException(400, "Pickup location required")
    if body.expiry_time <= datetime.now(timezone.utc):
        raise HTTPException(400, "Expiry time must be in the future")
    d = Donation(donor_id=donor.id, lat=lat, lng=lng, **body.model_dump(exclude={"lat", "lng"}))
    db.add(d); db.commit()
    match_donation(db, d)  # turant matching engine chalao
    db.refresh(d)
    return to_out(d)

@router.get("/mine", response_model=list[DonationOut])
def my_donations(donor: User = Depends(require_roles("donor")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Donation).where(Donation.donor_id == donor.id).order_by(Donation.id.desc())).all()
    return [to_out(d) for d in rows]

@router.get("/incoming", response_model=list[DonationOut])
def incoming(ngo: User = Depends(require_roles("ngo")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Donation).where(Donation.ngo_id == ngo.id).order_by(Donation.id.desc())).all()
    return [to_out(d) for d in rows]

@router.get("/available", response_model=list[DonationOut])
def available(vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Donation).where(Donation.status == "matched", Donation.volunteer_id.is_(None))).all()
    out = [to_out(d, vol) for d in rows]
    return sorted(out, key=lambda o: o.distance_km if o.distance_km is not None else 1e9)

@router.get("/tasks", response_model=list[DonationOut])
def my_tasks(vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    rows = db.scalars(select(Donation).where(Donation.volunteer_id == vol.id, Donation.status.in_(ACTIVE))).all()
    return [to_out(d, vol) for d in rows]

@router.get("/route")
def my_route(vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    if vol.lat is None:
        raise HTTPException(400, "Set your location first")
    rows = db.scalars(select(Donation).where(Donation.volunteer_id == vol.id, Donation.status.in_(ACTIVE))).all()
    tasks = [{"id": d.id, "food": d.food_name, "picked": d.status == "picked_up",
              "pickup": (d.lat, d.lng), "pickup_name": d.donor.name,
              "drop": (d.ngo.lat, d.ngo.lng), "drop_name": d.ngo.name} for d in rows]
    return plan_route((vol.lat, vol.lng), tasks)

def _lock(db: Session, id: int) -> Donation | None:
    return db.scalar(select(Donation).where(Donation.id == id).with_for_update())  # race condition se bachao

@router.post("/{id}/accept", response_model=DonationOut)
def accept(id: int, vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    d = _lock(db, id)
    if not d or d.status != "matched" or d.volunteer_id:
        raise HTTPException(409, "Task already taken")
    d.volunteer_id, d.status = vol.id, "assigned"
    db.commit(); db.refresh(d)
    return to_out(d, vol)

def _advance(db: Session, id: int, vol: User, expected: str, new: str) -> DonationOut:
    d = _lock(db, id)
    if not d or d.volunteer_id != vol.id or d.status != expected:
        raise HTTPException(409, f"Donation must be '{expected}' and assigned to you")
    d.status = new
    db.commit(); db.refresh(d)
    return to_out(d, vol)

@router.post("/{id}/pickup", response_model=DonationOut)
def pickup(id: int, vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    return _advance(db, id, vol, "assigned", "picked_up")

@router.post("/{id}/deliver", response_model=DonationOut)
def deliver(id: int, vol: User = Depends(require_roles("volunteer")), db: Session = Depends(get_db)):
    return _advance(db, id, vol, "picked_up", "delivered")
