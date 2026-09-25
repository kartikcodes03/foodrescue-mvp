from datetime import datetime, timezone
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base

def now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(20), index=True)  # donor | ngo | volunteer | admin
    phone: Mapped[str | None] = mapped_column(String(30))
    address: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

class Need(Base):  # NGO ki demand: "mujhe itne servings chahiye"
    __tablename__ = "needs"
    id: Mapped[int] = mapped_column(primary_key=True)
    ngo_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    servings_needed: Mapped[int] = mapped_column(Integer)
    servings_received: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[str] = mapped_column(String(30), default="any")
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)  # open | fulfilled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    ngo: Mapped[User] = relationship()

class Donation(Base):
    __tablename__ = "donations"
    id: Mapped[int] = mapped_column(primary_key=True)
    donor_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    ngo_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    volunteer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    need_id: Mapped[int | None] = mapped_column(ForeignKey("needs.id"))
    food_name: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(30), default="cooked")
    quantity: Mapped[int] = mapped_column(Integer)  # servings
    expiry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    address: Mapped[str | None] = mapped_column(String(255))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    # available -> matched -> assigned -> picked_up -> delivered  (ya expired)
    status: Mapped[str] = mapped_column(String(20), default="available", index=True)
    match_score: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    donor: Mapped[User] = relationship(foreign_keys=[donor_id])
    ngo: Mapped[User | None] = relationship(foreign_keys=[ngo_id])
    volunteer: Mapped[User | None] = relationship(foreign_keys=[volunteer_id])
