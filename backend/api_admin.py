"""Admin: users, family members, access control, audit."""
from fastapi import APIRouter, Depends, HTTPException
from core import db, serialize, oid, now_utc, require_admin, hash_password, log_audit

router = APIRouter(tags=["admin"])

MODULES = ["overview", "finance", "budget", "costs", "payments", "parties",
           "contracts", "work", "documents", "requests", "reports"]
LEVELS = ["none", "view", "edit", "approve"]


# ---------------- family members ----------------
@router.get("/family")
async def list_family(user: dict = Depends(require_admin)):
    docs = await db.family_members.find({"deleted_at": {"$exists": False}}).sort([("created_at", 1)]).to_list(200)
    return [serialize(d) for d in docs]


@router.post("/family")
async def create_family(payload: dict, user: dict = Depends(require_admin)):
    payload["created_at"] = now_utc()
    res = await db.family_members.insert_one(payload)
    return serialize(await db.family_members.find_one({"_id": res.inserted_id}))


@router.put("/family/{item_id}")
async def update_family(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    await db.family_members.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.family_members.find_one({"_id": oid(item_id)}))


@router.delete("/family/{item_id}")
async def delete_family(item_id: str, user: dict = Depends(require_admin)):
    await db.family_members.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


# ---------------- users / access control ----------------
@router.get("/users")
async def list_users(user: dict = Depends(require_admin)):
    docs = await db.users.find({}).sort([("created_at", 1)]).to_list(500)
    return [serialize(d) for d in docs]


@router.post("/users")
async def create_user(payload: dict, admin: dict = Depends(require_admin)):
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    password = payload.get("password") or "changeme123"
    doc = {
        "email": email,
        "name": payload.get("name", email),
        "role": payload.get("role", "PARTY_USER"),
        "party_type": payload.get("party_type"),
        "permissions": payload.get("permissions", []),
        "password_hash": hash_password(password),
        "active": True,
        "created_at": now_utc(),
    }
    res = await db.users.insert_one(doc)
    await log_audit(admin, "create_user", "users", str(res.inserted_id), {"email": email})
    return serialize(await db.users.find_one({"_id": res.inserted_id}))


@router.put("/users/{item_id}")
async def update_user(item_id: str, payload: dict, admin: dict = Depends(require_admin)):
    update = {}
    for k in ("name", "role", "party_type", "permissions", "active"):
        if k in payload:
            update[k] = payload[k]
    if payload.get("password"):
        update["password_hash"] = hash_password(payload["password"])
    update["updated_at"] = now_utc()
    await db.users.update_one({"_id": oid(item_id)}, {"$set": update})
    await log_audit(admin, "update_user", "users", item_id)
    return serialize(await db.users.find_one({"_id": oid(item_id)}))


@router.delete("/users/{item_id}")
async def delete_user(item_id: str, admin: dict = Depends(require_admin)):
    target = await db.users.find_one({"_id": oid(item_id)})
    if target and target.get("role") == "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Cannot delete the super admin")
    await db.users.delete_one({"_id": oid(item_id)})
    await log_audit(admin, "delete_user", "users", item_id)
    return {"status": "deleted"}


@router.get("/access-meta")
async def access_meta(user: dict = Depends(require_admin)):
    return {"modules": MODULES, "levels": LEVELS,
            "roles": ["PROJECT_ADMIN", "PARTY_USER"],
            "party_types": ["Architect", "Civil Contractor", "Contractor A", "Contractor B",
                            "Plumber", "Electrician", "Structural Consultant", "Interior Contractor",
                            "Material Supplier", "Consultant", "Auditor", "Other"]}


@router.get("/audit")
async def audit_log(user: dict = Depends(require_admin)):
    docs = await db.audit_events.find({}).sort([("timestamp", -1)]).to_list(200)
    return [serialize(d) for d in docs]
