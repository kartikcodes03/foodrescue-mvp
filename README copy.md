# FoodRescue

**Save food. Feed people. In real time.**

FoodRescue is a real-time food rescue routing platform built for the hackathon problem statement *"Surplus-to-Shelter: Real-Time Food Rescue Routing."* It lets food donors post surplus edible food, automatically matches each donation to the best-fit nearby NGO based on need, distance, quantity fit and expiry urgency, routes a volunteer to pick it up and deliver it, and tracks the whole lifecycle on a live impact dashboard.

## Problem statement

Restaurants, kitchens and stores throw away edible surplus food every day while nearby shelters and NGOs go without. The gap isn't food, it's **coordination**: no one knows what's available, who needs it, or who can move it in time before it spoils.

## Solution

FoodRescue closes that loop end-to-end:

```
Donor posts surplus food
        |
Matching engine scores every open NGO need
        |
Best-fit NGO is matched automatically
        |
Volunteer sees the pickup, accepts it
        |
Volunteer marks Picked up -> Delivered
        |
Impact dashboard updates live
```

Donors can post **multiple food items in a single submission** — each item is matched independently, since food type, quantity and expiry each change which NGO is the best fit.

## Architecture

```
        +--------------------+
        |   REACT FRONTEND   |
        |  (Vite + Tailwind) |
        +---------+----------+
                  | REST (JSON, JWT auth)
        +---------v----------+
        |      FASTAPI       |
        |      BACKEND       |
        +---------+----------+
                  |
   +---------------+---------------+
   |               |               |
+--v------+   +-----v------+  +-----v-----+
|Matching |   |  Routing   |  |  Auth /   |
| Engine  |   |  Engine    |  |  RBAC     |
+--+------+   +-----+------+  +-----------+
   |                |
   +--------+-------+
            v
     +-------------+
     | PostgreSQL  |
     +-------------+
```

React never talks to PostgreSQL directly — every request goes through FastAPI, which owns matching, routing, auth and persistence.

## Technology stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router |
| Backend | FastAPI, Pydantic, SQLAlchemy 2.0 |
| Database | PostgreSQL 16 |
| Auth | JWT (PyJWT) + bcrypt password hashing, role-based access control |
| Infra | Docker Compose (database container) |

## Features

- **Roles**: Donor, NGO, Volunteer, Admin — each with a guarded, role-specific view.
- **Multi-item donations**: a donor can add several food items (different type/quantity/expiry each) and post them all in one go; each is matched separately.
- **Rule-based, explainable matching engine** — no black-box ML, every score is auditable.
- **Nearest-neighbour route planning** for volunteers with multiple pickups/drops.
- **Automatic expiry handling**: donations past their safe-to-eat time are excluded from matching and marked `expired`.
- **Live dashboard**: polls every few seconds for meals rescued, active donors/volunteers, CO2 avoided (estimate), and the full status pipeline.
- **Background maintenance loop**: every 60s the server retries unmatched donations and expires stale ones, so nothing needs a manual refresh trigger.

## Matching algorithm

For every donation, the engine scores every **open** NGO need and picks the highest:

```
score = 0.5 x proximity_score      (closer NGO scores higher, out to a 25 km cap)
      + 0.3 x quantity_fit_score   (how closely donation size matches remaining need)
      + 0.2 x wait_time_score      (older, unfulfilled needs get priority, capped at 24h)
```

**Hard filters applied before scoring** (a candidate NGO is dropped entirely, not down-weighted, if it fails any of these):

- The NGO's food-category need doesn't match the donation (`any` need matches everything).
- The NGO is farther than 25 km away.
- There isn't enough time to travel there and hand over the food before it expires (distance / 25 km/h + a 30-minute safety buffer).

Weights, the distance cap and the buffer all live as named constants in `backend/app/engines/matching.py` and are easy to retune. The engine runs synchronously the moment a donation is posted, and again every 60 seconds for anything still unmatched (e.g. because an NGO need was posted *after* the donation).

## Routing approach

`backend/app/engines/routing.py` implements a straight-line (haversine) distance model at an assumed 25 km/h city average speed, plus a **nearest-neighbour route planner**: given a volunteer's current location and their list of assigned pickups/drops, it repeatedly jumps to the closest next stop (respecting that a donation must be picked up before it's dropped), building an ordered stop list with running distance and ETA. This is intentionally simple for the MVP; it's isolated behind `plan_route()` so it can be swapped for a real routing API or a proper multi-stop optimizer later without touching the rest of the app.

## Database schema

| Table | Purpose |
|---|---|
| `users` | Donor / NGO / Volunteer / Admin accounts, with optional lat/lng for location-aware matching and routing. |
| `needs` | An NGO's open request for food (servings needed, category, fulfilment progress). |
| `donations` | A single posted food item: quantity, category, expiry, pickup location, and its current status (`available -> matched -> assigned -> picked_up -> delivered`, or `expired`). Carries the match score and links to the matched NGO, need and assigned volunteer. |

Tables are created automatically on backend startup for this MVP (`Base.metadata.create_all`); see **Future scope** for moving to Alembic migrations.

## API overview

All endpoints are under FastAPI's auto-generated docs at `/docs`. Summary:

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/me/location`, `GET /auth/users` (admin) |
| Donations | `POST /donations`, `GET /donations/mine`, `GET /donations/incoming`, `GET /donations/available`, `GET /donations/tasks`, `GET /donations/route`, `POST /donations/{id}/accept`, `POST /donations/{id}/pickup`, `POST /donations/{id}/deliver` |
| Needs | `POST /needs`, `GET /needs/mine` |
| Dashboard | `GET /dashboard/stats`, `GET /dashboard/recent` |

Every write endpoint validates its payload with Pydantic and enforces role access via `require_roles(...)`; errors come back as proper HTTP status codes (400/401/403/409) with a message.

## Setup instructions

### 1. Database

```bash
docker compose up -d
```

Starts PostgreSQL 16 on `localhost:5432` with the credentials below.

### 2. Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # adjust if needed
uvicorn app.main:app --reload
```

Runs on `http://localhost:8000` (interactive docs at `/docs`). Tables are created automatically on first run, and an admin user is seeded from `.env`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`. Vite proxies `/api/*` to the backend, so there's no CORS setup needed in dev.

## Environment variables

`backend/.env` (see `backend/.env.example`):

| Variable | Meaning | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+psycopg2://foodrescue:foodrescue@localhost:5432/foodrescue` |
| `SECRET_KEY` | JWT signing secret — **change this for anything beyond local dev** | `dev-secret` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeded admin login | `admin@foodrescue.local` / `admin123` |

## Demo workflow

1. Register as an **NGO**, set your location, post a request (e.g. 50 servings, any category).
2. Register as a **Donor**, post one or more food items (multi-item form) with a pickup location and expiry — the matching engine runs immediately and links each item to the best NGO.
3. Register as a **Volunteer**, set your location, accept an open pickup, then mark it **Picked up** and **Delivered**.
4. Open the home dashboard (or log in as admin) to watch meals rescued, active donors/volunteers and CO2 avoided update live.

## Limitations

- Distance/time use straight-line haversine at an assumed speed, not real road routing or live traffic.
- Matching weights, the 25 km radius and the 30-minute buffer are fixed constants, not yet exposed in an admin UI.
- No SMS/email/push notifications — status changes are visible in-app only (via polling).
- Tables are created with `create_all` rather than versioned Alembic migrations.
- CO2-avoided figures (`0.9 kg CO2e per meal`) are a rough, documented placeholder for demo purposes, not a certified figure.

## Future scope

- Real road-network routing (e.g. OSRM/Google Directions) and true multi-stop route optimization.
- Alembic migrations for schema changes.
- SMS/email/push notifications.
- Configurable matching weights from an admin panel.
- AI-based food/expiry classification from photos.
- Predictive donation forecasting and waste-hotspot mapping.
- Multi-city deployment.

## Team contributions

_Add your team's names and what each person built here before submitting._
