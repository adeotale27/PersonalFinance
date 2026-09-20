"""Nivara Finance API entrypoint."""
import os
import logging
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from core import db, raw_db, hash_password, verify_password, now_utc, set_workspace, reset_workspace

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nivara")

app = FastAPI(title="Nivara Finance API", version="0.1.0")

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
from api_insurance import router as insurance_router
from api_farms import router as farms_router
from api_loans import router as loans_router
from api_exports import router as export_router
from api_losses import router as losses_router
from api_notifications import router as notifications_router
from api_diary import router as diary_router
from api_errors import router as errors_router
from api_necessities import router as necessities_router
from api_goals import router as goals_router
from api_proof import router as proof_router
from api_planning import router as planning_router
from api_version import router as version_router
from api_imports import router as imports_router

for r in (auth_router, finance_router, lending_router, wealth_router, rental_router,
          projects_router, admin_router, dashboard_router, documents_router,
          insurance_router, farms_router, loans_router, export_router, losses_router, notifications_router, diary_router, errors_router, necessities_router, goals_router, proof_router, planning_router, version_router, imports_router):
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

@app.middleware("http")
async def operational_error_logging(request, call_next):
    token = set_workspace(None)
    try:
        return await call_next(request)
    except Exception as exc:
        from api_errors import write_error
        await write_error("API", type(exc).__name__, str(exc), request.url.path, 500, {"method": request.method})
        raise
    finally:
        reset_workspace(token)


async def seed_admin():
    email = os.environ.get("ADMIN_EMAIL", "admin@nivara.app").strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", "Nivara@2026")
    name = os.environ.get("ADMIN_NAME", "Nivara Admin")
    existing = await raw_db.users.find_one({"email": email})
    if existing is None:
        await raw_db.users.insert_one({
            "email": email, "password_hash": hash_password(password),
            "name": name, "role": "SUPER_ADMIN", "active": True,
            "permissions": [], "created_at": now_utc(),
        })
        logger.info("Seeded admin user %s", email)
    elif not verify_password(password, existing.get("password_hash", "")):
        await raw_db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password), "role": "SUPER_ADMIN"}})
        logger.info("Updated admin password for %s", email)
    # The configured primary account is the only platform administrator. It can
    # oversee workspace owners without making those owners see each other's data.
    await raw_db.users.update_one({"email": email}, {"$set": {"role": "SUPER_ADMIN", "is_platform_admin": True}})


async def migrate_legacy_workspace_data() -> str:
    """Put pre-workspace installations into their original owner's workspace.

    This migration is idempotent and intentionally preserves every existing
    record; new workspace owners always start with no records.
    """
    owner = await raw_db.users.find_one({"is_platform_admin": True}) or await raw_db.users.find_one({"role": "SUPER_ADMIN"}, sort=[("created_at", 1)])
    if not owner:
        raise RuntimeError("A workspace owner is required")
    workspace_id = owner.get("workspace_id") or str(owner["_id"])
    await raw_db.users.update_one({"_id": owner["_id"]}, {"$set": {"workspace_id": workspace_id, "is_workspace_owner": True}})
    await raw_db.workspaces.update_one(
        {"_id": workspace_id},
        {"$setOnInsert": {"_id": workspace_id, "owner_user_id": str(owner["_id"]), "name": owner.get("name") or "My Finance", "created_at": now_utc()}},
        upsert=True,
    )
    # Collections are discovered rather than maintained as a fragile list, so
    # every current finance module is covered during the one-time upgrade.
    for name in await raw_db.list_collection_names():
        if name in {"users", "login_attempts", "workspaces"}:
            continue
        await raw_db[name].update_many({"workspace_id": {"$exists": False}}, {"$set": {"workspace_id": workspace_id}})
    await raw_db.users.update_many({"workspace_id": {"$exists": False}}, {"$set": {"workspace_id": workspace_id}})
    return workspace_id


@app.on_event("startup")
async def startup():
    try:
        await raw_db.users.create_index("email", unique=True)
        await raw_db.login_attempts.create_index("identifier")
        await raw_db.transactions.create_index([("workspace_id", 1), ("date", -1)])
        await raw_db.transactions.create_index([("workspace_id", 1), ("project_id", 1)])
        from financial_services import ensure_indexes
        await ensure_indexes()
    except Exception as e:
        logger.warning("Index setup: %s", e)
    await seed_admin()
    default_workspace = await migrate_legacy_workspace_data()
    try:
        from storage import init_storage
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.warning("Storage init failed (uploads may not work yet): %s", e)
    try:
        # Demo data belongs only to the original workspace, never to a new
        # household joining the same app.
        token = set_workspace(default_workspace)
        try:
            from seed import seed_demo, seed_v2
            await seed_demo()
            await seed_v2()
        finally:
            reset_workspace(token)
    except Exception as e:
        logger.warning("Demo seed skipped: %s", e)
