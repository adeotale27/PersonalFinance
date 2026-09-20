"""Nivara core: config, db, auth, and shared helpers."""
import os
from datetime import datetime, timezone, timedelta

from dotenv import load_dotenv
load_dotenv()

import jwt
import bcrypt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, Request, Depends
from motor.motor_asyncio import AsyncIOMotorClient

JWT_ALGORITHM = "HS256"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]


# ---------- time ----------
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat()


# ---------- passwords ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------- jwt ----------
def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": now_utc() + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


# ---------- serialization ----------
def oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid id")


def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    doc.pop("password_hash", None)
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = iso(v)
    return doc


# ---------- auth dependency ----------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or not user.get("active", True):
            raise HTTPException(status_code=401, detail="User not found or inactive")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") not in ("SUPER_ADMIN", "PROJECT_ADMIN"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def round2(x) -> float:
    try:
        return round(float(x or 0), 2)
    except (TypeError, ValueError):
        return 0.0


# HTML inputs are helpful but never a security or data-integrity boundary. These
# names cover monetary, percentage and quantity fields used by Nivara's generic
# CRUD endpoints and prevent values such as "ten thousand" reaching Mongo.
NUMERIC_FIELDS = {
    "amount", "opening_balance", "current_balance", "current_value", "purchase_value", "estimated_value",
    "outstanding", "principal", "sanctioned", "disbursed", "emi", "premium", "sum_insured",
    "expected_contribution", "target_amount", "current_amount", "annual_rent", "amount_due", "amount_received",
    "ownership_percent", "interest_rate", "annual_increase_percent", "tenure_months", "area",
}
PERCENT_FIELDS = {"ownership_percent", "interest_rate", "annual_increase_percent"}


def validate_financial_payload(payload: dict) -> dict:
    """Reject non-numeric, non-finite and negative financial inputs centrally.
    Text fields remain deliberately open (apart from normal whitespace cleanup)."""
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="A JSON object is required")
    cleaned = dict(payload)
    for key, value in payload.items():
        if key in NUMERIC_FIELDS and value not in (None, ""):
            if isinstance(value, bool):
                raise HTTPException(status_code=422, detail=f"{key.replace('_', ' ').title()} must be a number")
            try:
                number = float(value)
            except (TypeError, ValueError):
                raise HTTPException(status_code=422, detail=f"{key.replace('_', ' ').title()} must be a number")
            if number != number or number in (float("inf"), float("-inf")) or number < 0:
                raise HTTPException(status_code=422, detail=f"{key.replace('_', ' ').title()} must be a finite non-negative number")
            if key in PERCENT_FIELDS and number > 100:
                raise HTTPException(status_code=422, detail=f"{key.replace('_', ' ').title()} cannot exceed 100%")
            cleaned[key] = round(number, 2)
        elif isinstance(value, str):
            cleaned[key] = value.strip()
    return cleaned


def normalize_date(value):
    """Store every user-entered date as ISO YYYY-MM-DD, regardless of common input format."""
    if value in (None, ""):
        return value
    text = str(value).strip()[:10]
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    raise HTTPException(status_code=400, detail="Use a valid date: YYYY-MM-DD (for example, 2026-09-20)")


async def log_audit(actor: dict, action: str, entity: str, entity_id: str = None, meta: dict = None):
    await db.audit_events.insert_one({
        "actor": actor.get("email") if actor else "system",
        "actor_id": str(actor["_id"]) if actor and actor.get("_id") else None,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "meta": meta or {},
        "timestamp": now_utc(),
    })
