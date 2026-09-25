from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import require_roles
from ..engines.matching import match_pending
from ..models import Need, User
from ..schemas import NeedCreate, NeedOut

router = APIRouter(prefix="/needs", tags=["needs"])

@router.post("", response_model=NeedOut)
def create_need(body: NeedCreate, ngo: User = Depends(require_roles("ngo")), db: Session = Depends(get_db)):
    need = Need(ngo_id=ngo.id, **body.model_dump())
    db.add(need); db.commit(); db.refresh(need)
    match_pending(db)  # naya need aate hi wait kar rahe donations match ho jayein
    db.refresh(need)
    return need

@router.get("/mine", response_model=list[NeedOut])
def my_needs(ngo: User = Depends(require_roles("ngo")), db: Session = Depends(get_db)):
    return db.scalars(select(Need).where(Need.ngo_id == ngo.id).order_by(Need.id.desc())).all()
