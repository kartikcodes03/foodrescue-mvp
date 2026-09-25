from datetime import datetime
from typing import Literal
from pydantic import BaseModel, EmailStr, Field

class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6, max_length=64)
    role: Literal["donor", "ngo", "volunteer"]  # admin public signup se nahi ban sakta
    phone: str | None = None
    address: str | None = None
    lat: float | None = None
    lng: float | None = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class LocationIn(BaseModel):
    lat: float
    lng: float
    address: str | None = None

class UserOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; name: str; email: str; role: str
    phone: str | None; address: str | None; lat: float | None; lng: float | None

class TokenOut(BaseModel):
    access_token: str
    user: UserOut

CATEGORIES = Literal["cooked", "packaged", "produce", "bakery"]

class DonationCreate(BaseModel):
    food_name: str = Field(min_length=2, max_length=160)
    category: CATEGORIES = "cooked"
    quantity: int = Field(gt=0, le=5000)
    expiry_time: datetime
    address: str | None = None
    lat: float | None = None
    lng: float | None = None

class DonationOut(BaseModel):
    id: int; food_name: str; category: str; quantity: int
    expiry_time: datetime; status: str; match_score: float | None
    address: str | None; lat: float; lng: float
    donor_name: str
    ngo_name: str | None = None; ngo_address: str | None = None
    ngo_lat: float | None = None; ngo_lng: float | None = None
    volunteer_name: str | None = None
    distance_km: float | None = None
    created_at: datetime

class NeedCreate(BaseModel):
    servings_needed: int = Field(gt=0, le=10000)
    category: Literal["any", "cooked", "packaged", "produce", "bakery"] = "any"

class NeedOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int; servings_needed: int; servings_received: int
    category: str; status: str; created_at: datetime
