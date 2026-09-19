"""Nivara API entrypoint."""
import os
import logging
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from core import db, hash_password, verify_password, now_utc

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nivara")

app = FastAPI(title="Nivara API", version="0.1.0")

api = APIRouter(prefix="/api")


@api.get("/health")
async def health():
    return {"status": "ok", "service": "nivara-api", "version": "0.1.0"}


# ---- mount domain routers ----
from api_auth import router as auth_router
from api_finance import router as finance_router
from api_lending import router as lending_router
from api_wealth import router as wealth_router
from api_rental import router as rental_router
from api_projects import router as projects_router
from api_admin import router as admin_router
from api_dashboard import router as dashboard_router
from api_documents import router as documents_router

for r in (auth_router, finance_router, lending_router, wealth_router, rental_router,
          projects_router, admin_router, dashboard_router, documents_router):
    api.include_router(r)

app.include_router(api)

CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@nivara.app").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "Nivara@2026")
    name = os.environ.get("ADMIN_NAME", "Nivara Admin")
    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "email": email, "password_hash": hash_password(password),
            "name": name, "role": "SUPER_ADMIN", "active": True,
            "permissions": [], "created_at": now_utc(),
        })
        logger.info("Seeded admin user %s", email)
    elif not verify_password(password, existing.get("password_hash", "")):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": "SUPER_ADMIN"}})
        logger.info("Updated admin password for %s", email)


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier")
        await db.transactions.create_index([("date", -1)])
        await db.transactions.create_index("project_id")
    except Exception as e:
        logger.warning("Index setup: %s", e)
    await seed_admin()
    try:
        from storage import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning("Storage init failed (uploads may not work yet): %s", e)
    try:
        from seed import seed_demo
        await seed_demo()
    except Exception as e:
        logger.warning("Demo seed skipped: %s", e)
