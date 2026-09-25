from fastapi import APIRouter, Depends
from sqlalchemy import distinct, func, select
from sqlalchemy.orm import Session
from ..database import get_db
from ..engines.matching import expire_old
from ..models import Donation as D

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
CO2_KG_PER_MEAL = 0.9  # rough estimate, sirf indicative

@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    expire_old(db)
    meals = db.scalar(select(func.coalesce(func.sum(D.quantity), 0)).where(D.status == "delivered"))
    by_status = dict(db.execute(select(D.status, func.count()).group_by(D.status)).all())
    return {
        "meals_rescued": meals,
        "co2_saved_kg": round(meals * CO2_KG_PER_MEAL, 1),
        "ngos_served": db.scalar(select(func.count(distinct(D.ngo_id))).where(D.status == "delivered")),
        "donors_active": db.scalar(select(func.count(distinct(D.donor_id)))),
        "volunteers_active": db.scalar(select(func.count(distinct(D.volunteer_id))).where(D.status.in_(["assigned", "picked_up"]))),
        "by_status": by_status,
    }

@router.get("/recent")
def recent(db: Session = Depends(get_db)):
    rows = db.scalars(select(D).order_by(D.updated_at.desc()).limit(10)).all()
    return [{"id": d.id, "food_name": d.food_name, "quantity": d.quantity, "status": d.status,
             "donor": d.donor.name, "ngo": d.ngo.name if d.ngo else None, "updated_at": d.updated_at} for d in rows]
