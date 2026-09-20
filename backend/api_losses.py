"""Private loss ledger. Losses are deliberately excluded from net-worth calculations."""
import hmac
import os
from collections import defaultdict
from datetime import timedelta

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request

from core import db, serialize, oid, now_utc, require_admin, round2, get_jwt_secret, normalize_date

router = APIRouter(tags=["losses"])
LOSS_PASSWORD = os.environ.get("LOSSES_PASSWORD", "Q@w3e4r5")

LOSS_CATEGORIES = [
    {"group": "Stock Market", "name": "FnO", "period": "YEARLY"},
    {"group": "Stock Market", "name": "Equity", "period": "YEARLY"},
    {"group": "Stock Market", "name": "Mutual Fund", "period": "YEARLY"},
    {"group": "Forex", "name": "Exness Loss", "period": "ANY"},
    {"group": "Farm", "name": "Farm Loss", "period": "ANY"},
    {"group": "Other", "name": "Crypto / Digital Assets", "period": "ANY"},
    {"group": "Other", "name": "Business", "period": "ANY"},
    {"group": "Other", "name": "Property", "period": "ANY"},
    {"group": "Other", "name": "Vehicle", "period": "ANY"},
    {"group": "Other", "name": "Medical", "period": "ANY"},
    {"group": "Other", "name": "Legal / Tax", "period": "ANY"},
    {"group": "Other", "name": "Fraud / Theft", "period": "ANY"},
    {"group": "Other", "name": "Defaulted Lending", "period": "ANY"},
    {"group": "Other", "name": "Unanticipated Loss", "period": "ANY"},
    {"group": "Other", "name": "Other Loss", "period": "ANY"},
]


def _loss_token(email: str) -> str:
    return jwt.encode({"scope": "losses", "email": email, "exp": now_utc() + timedelta(hours=8)}, get_jwt_secret(), algorithm="HS256")


async def require_loss_access(request: Request, user: dict = Depends(require_admin)):
    token = request.headers.get("X-Loss-Token", "")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("scope") != "losses" or payload.get("email") != user.get("email"):
            raise ValueError("wrong scope")
    except Exception:
        raise HTTPException(status_code=423, detail="Unlock the Losses folder to continue")
    return user


@router.post("/losses/unlock")
async def unlock_losses(payload: dict, user: dict = Depends(require_admin)):
    if not hmac.compare_digest(str(payload.get("password", "")), LOSS_PASSWORD):
        raise HTTPException(status_code=403, detail="Incorrect password")
    return {"token": _loss_token(user.get("email", "")), "expires_in_hours": 8}


@router.get("/losses/meta")
async def losses_meta(user: dict = Depends(require_loss_access)):
    return {"categories": LOSS_CATEGORIES}


@router.get("/losses")
async def list_losses(year: str = None, user: dict = Depends(require_loss_access)):
    query = {"deleted_at": {"$exists": False}}
    if year:
        query["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    docs = await db.losses.find(query).sort([("date", -1), ("created_at", -1)]).to_list(5000)
    return [serialize(d) for d in docs]


@router.post("/losses")
async def create_loss(payload: dict, user: dict = Depends(require_loss_access)):
    amount = round2(payload.get("amount", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Loss amount must be greater than zero")
    payload["amount"] = amount
    payload["date"] = normalize_date(payload.get("date") or now_utc().date().isoformat())
    payload.setdefault("group", "Other")
    payload.setdefault("category", "Other Loss")
    payload["created_at"] = now_utc()
    res = await db.losses.insert_one(payload)
    return serialize(await db.losses.find_one({"_id": res.inserted_id}))


@router.put("/losses/{item_id}")
async def update_loss(item_id: str, payload: dict, user: dict = Depends(require_loss_access)):
    payload.pop("id", None); payload.pop("_id", None)
    if "amount" in payload:
        payload["amount"] = round2(payload["amount"])
        if payload["amount"] <= 0:
            raise HTTPException(status_code=400, detail="Loss amount must be greater than zero")
    if "date" in payload:
        payload["date"] = normalize_date(payload["date"])
    payload["updated_at"] = now_utc()
    await db.losses.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.losses.find_one({"_id": oid(item_id)}))


@router.delete("/losses/{item_id}")
async def delete_loss(item_id: str, user: dict = Depends(require_loss_access)):
    await db.losses.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


@router.get("/losses/summary")
async def losses_summary(year: str = None, user: dict = Depends(require_loss_access)):
    query = {"deleted_at": {"$exists": False}}
    if year:
        query["date"] = {"$gte": f"{year}-01-01", "$lte": f"{year}-12-31"}
    docs = await db.losses.find(query).to_list(5000)
    by_group, by_category, trend = defaultdict(float), defaultdict(float), defaultdict(float)
    for d in docs:
        amount = round2(d.get("amount", 0))
        by_group[d.get("group") or "Other"] += amount
        by_category[d.get("category") or "Other Loss"] += amount
        key = (d.get("date") or "")[:4 if year is None else 7]
        if key:
            trend[key] += amount
    return {
        "total": round2(sum(round2(d.get("amount", 0)) for d in docs)), "count": len(docs),
        "by_group": [{"name": k, "value": round2(v)} for k, v in sorted(by_group.items(), key=lambda item: -item[1])],
        "by_category": [{"name": k, "value": round2(v)} for k, v in sorted(by_category.items(), key=lambda item: -item[1])],
        "trend": [{"period": k, "value": round2(v)} for k, v in sorted(trend.items())],
    }
