"""Rental income: properties, units, tenants, rent collection."""
from collections import defaultdict
from fastapi import APIRouter, Depends
from core import db, serialize, oid, now_utc, require_admin, round2

router = APIRouter(tags=["rental"])


@router.get("/rental/properties")
async def list_properties(user: dict = Depends(require_admin)):
    docs = await db.rental_properties.find({"deleted_at": {"$exists": False}}).sort([("created_at", -1)]).to_list(1000)
    return [serialize(d) for d in docs]


@router.post("/rental/properties")
async def create_property(payload: dict, user: dict = Depends(require_admin)):
    payload.setdefault("units", [])
    payload["created_at"] = now_utc()
    res = await db.rental_properties.insert_one(payload)
    return serialize(await db.rental_properties.find_one({"_id": res.inserted_id}))


@router.put("/rental/properties/{item_id}")
async def update_property(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    payload["updated_at"] = now_utc()
    await db.rental_properties.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.rental_properties.find_one({"_id": oid(item_id)}))


@router.delete("/rental/properties/{item_id}")
async def delete_property(item_id: str, user: dict = Depends(require_admin)):
    await db.rental_properties.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


@router.get("/rental/payments")
async def list_payments(property_id: str = None, status: str = None, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    if property_id:
        q["property_id"] = property_id
    if status:
        q["status"] = status
    docs = await db.rent_payments.find(q).sort([("period", -1)]).to_list(5000)
    return [serialize(d) for d in docs]


@router.post("/rental/payments")
async def create_payment(payload: dict, user: dict = Depends(require_admin)):
    payload["amount_due"] = round2(payload.get("amount_due", 0))
    payload["amount_received"] = round2(payload.get("amount_received", 0))
    if payload["amount_received"] >= payload["amount_due"] and payload["amount_due"] > 0:
        payload.setdefault("status", "COLLECTED")
    elif payload["amount_received"] > 0:
        payload.setdefault("status", "PARTIAL")
    else:
        payload.setdefault("status", "PENDING")
    payload["created_at"] = now_utc()
    res = await db.rent_payments.insert_one(payload)
    return serialize(await db.rent_payments.find_one({"_id": res.inserted_id}))


@router.put("/rental/payments/{item_id}")
async def update_payment(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    if "amount_received" in payload:
        payload["amount_received"] = round2(payload["amount_received"])
    if "amount_due" in payload:
        payload["amount_due"] = round2(payload["amount_due"])
    payload["updated_at"] = now_utc()
    await db.rent_payments.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.rent_payments.find_one({"_id": oid(item_id)}))


@router.delete("/rental/payments/{item_id}")
async def delete_payment(item_id: str, user: dict = Depends(require_admin)):
    await db.rent_payments.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


@router.get("/rental/summary")
async def rental_summary(user: dict = Depends(require_admin)):
    props = [serialize(d) for d in await db.rental_properties.find({"deleted_at": {"$exists": False}}).to_list(1000)]
    monthly_rent = 0.0
    for p in props:
        for u in p.get("units", []) or []:
            if (u.get("status") or "OCCUPIED") == "OCCUPIED":
                monthly_rent += round2(u.get("monthly_rent", 0))
    payments = [serialize(d) for d in await db.rent_payments.find({"deleted_at": {"$exists": False}}).to_list(5000)]
    this_month = now_utc().strftime("%Y-%m")
    collected = round2(sum(p.get("amount_received", 0) for p in payments if p.get("period") == this_month))
    expected = round2(sum(p.get("amount_due", 0) for p in payments if p.get("period") == this_month))
    outstanding = round2(sum(max(p.get("amount_due", 0) - p.get("amount_received", 0), 0) for p in payments))
    today = now_utc().date().isoformat()
    overdue = round2(sum(max(p.get("amount_due", 0) - p.get("amount_received", 0), 0)
                         for p in payments if p.get("due_date") and p.get("due_date") < today
                         and p.get("status") != "COLLECTED"))
    collection_rate = round2((collected / expected * 100) if expected > 0 else 0)
    trend = defaultdict(float)
    for p in payments:
        mk = p.get("period")
        if mk:
            trend[mk] += round2(p.get("amount_received", 0))
    by_property = defaultdict(float)
    for p in payments:
        by_property[p.get("property_name") or "Unknown"] += round2(p.get("amount_received", 0))
    return {
        "monthly_rent": round2(monthly_rent),
        "collected": collected,
        "expected": expected,
        "outstanding": outstanding,
        "overdue": overdue,
        "collection_rate": collection_rate,
        "properties": len(props),
        "income_trend": [{"month": k, "value": round2(v)} for k, v in sorted(trend.items())],
        "by_property": [{"name": k, "value": round2(v)} for k, v in by_property.items() if v > 0],
    }
