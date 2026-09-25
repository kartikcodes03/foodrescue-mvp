import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from .config import settings
from .database import Base, SessionLocal, engine
from .engines.matching import expire_old, match_pending
from .models import User
from .routers import auth, dashboard, donations, needs
from .security import hash_password

def maintenance():
    with SessionLocal() as db:
        expire_old(db)
        match_pending(db)  # jo donations pehle match nahi hue, unhe dobara try karo

async def maintenance_loop():
    while True:
        await asyncio.to_thread(maintenance)
        await asyncio.sleep(60)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)  # production me Alembic use karein
    with SessionLocal() as db:
        if not db.scalar(select(User).where(User.email == settings.ADMIN_EMAIL)):
            db.add(User(name="Admin", email=settings.ADMIN_EMAIL, role="admin",
                        password_hash=hash_password(settings.ADMIN_PASSWORD)))
            db.commit()
    task = asyncio.create_task(maintenance_loop())
    yield
    task.cancel()

app = FastAPI(title="FoodRescue API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
for r in (auth, needs, donations, dashboard):
    app.include_router(r.router)
