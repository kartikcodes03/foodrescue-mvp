from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import current_user, require_roles
from ..models import User
from ..schemas import LocationIn, LoginIn, RegisterIn, TokenOut, UserOut
from ..security import create_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut)
def register(body: RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    data = body.model_dump(exclude={"password", "email"})
    user = User(**data, email=email, password_hash=hash_password(body.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_token(user.id, user.role), "user": user}

@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return {"access_token": create_token(user.id, user.role), "user": user}

@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user

@router.put("/me/location", response_model=UserOut)
def set_location(body: LocationIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.lat, user.lng = body.lat, body.lng
    if body.address:
        user.address = body.address
    db.commit(); db.refresh(user)
    return user

@router.get("/users", response_model=list[UserOut])
def all_users(_: User = Depends(require_roles("admin")), db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()
