"""Lending & Borrowing."""
from datetime import datetime
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from core import db, serialize, oid, now_utc, require_admin, round2, normalize_date, validate_financial_payload

router = APIRouter(tags=["lending"])


def _enrich(doc: dict) -> dict:
    d = serialize(doc)
    principal = round2(d.get("amount", 0))
    repayments = d.get("repayments", []) or []
    paid = round2(sum(round2(r.get("amount", 0)) for r in repayments))
    outstanding = round2(principal - paid)
    today = now_utc().date().isoformat()
    status = d.get("status")
    if status not in ("WRITTEN_OFF",):
        if outstanding <= 0.009:
            status = "FULLY_REPAID"
        elif paid > 0:
            status = "PARTIALLY_REPAID"
        else:
            status = "ACTIVE"
        due = d.get("due_date")
        if outstanding > 0.009 and due and due < today:
            status = "OVERDUE"
    d["paid"] = paid
    d["outstanding"] = max(outstanding, 0)
    d["status"] = status
    return d


@router.get("/lending")
async def list_lending(direction: str = "LENT", user: dict = Depends(require_admin)):
    docs = await db.lendings.find(
        {"direction": direction, "deleted_at": {"$exists": False}}
    ).sort([("created_at", -1)]).to_list(2000)
    return [_enrich(d) for d in docs]


@router.get("/lending/summary")
async def lending_summary(direction: str = "LENT", user: dict = Depends(require_admin)):
    docs = [_enrich(d) for d in await db.lendings.find(
        {"direction": direction, "deleted_at": {"$exists": False}}).to_list(2000)]
    total = round2(sum(d.get("amount", 0) for d in docs))
    recovered = round2(sum(d.get("paid", 0) for d in docs))
    outstanding = round2(sum(d.get("outstanding", 0) for d in docs))
    overdue = round2(sum(d.get("outstanding", 0) for d in docs if d.get("status") == "OVERDUE"))
    today = now_utc().date()
    this_month = today.strftime("%Y-%m")
    due_this_month = 0.0
    for d in docs:
        due = d.get("due_date")
        if due and due[:7] == this_month and d.get("outstanding", 0) > 0:
            due_this_month += d.get("outstanding", 0)
    by_person = defaultdict(float)
    for d in docs:
        by_person[d.get("counterparty") or "Unknown"] += d.get("outstanding", 0)
    # recovery trend by month
    trend = defaultdict(float)
    for d in docs:
        for r in d.get("repayments", []) or []:
            mk = (r.get("date") or "")[:7]
            if mk:
                trend[mk] += round2(r.get("amount", 0))
    return {
        "total": total,
        "recovered": recovered,
        "outstanding": outstanding,
        "overdue": overdue,
        "due_this_month": round2(due_this_month),
        "count": len(docs),
        "by_person": [{"name": k, "value": round2(v)} for k, v in sorted(by_person.items(), key=lambda x: -x[1]) if v > 0],
        "recovery_trend": [{"month": k, "value": round2(v)} for k, v in sorted(trend.items())],
    }


@router.post("/lending")
async def create_lending(payload: dict, user: dict = Depends(require_admin)):
    payload = validate_financial_payload(payload)
    payload["amount"] = round2(payload.get("amount", 0))
    payload.setdefault("direction", "LENT")
    payload.setdefault("repayments", [])
    payload["date"] = normalize_date(payload.get("date") or now_utc().date().isoformat())
    if payload.get("due_date"):
        payload["due_date"] = normalize_date(payload["due_date"])
    payload["created_at"] = now_utc()
    res = await db.lendings.insert_one(payload)
    return _enrich(await db.lendings.find_one({"_id": res.inserted_id}))


@router.put("/lending/{item_id}")
async def update_lending(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload = validate_financial_payload(payload)
    payload.pop("id", None); payload.pop("_id", None)
    payload.pop("paid", None); payload.pop("outstanding", None)
    if "amount" in payload:
        payload["amount"] = round2(payload["amount"])
    for key in ("date", "due_date"):
        if key in payload and payload[key]:
            payload[key] = normalize_date(payload[key])
    payload["updated_at"] = now_utc()
    await db.lendings.update_one({"_id": oid(item_id)}, {"$set": payload})
    return _enrich(await db.lendings.find_one({"_id": oid(item_id)}))


@router.post("/lending/{item_id}/repayment")
async def add_repayment(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload = validate_financial_payload(payload)
    loan = await db.lendings.find_one({"_id": oid(item_id), "deleted_at": {"$exists": False}})
    if not loan:
        raise HTTPException(status_code=404, detail="Lending record not found")
    amount = round2(payload.get("amount", 0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Repayment amount must be greater than zero")
    outstanding = _enrich(loan)["outstanding"]
    if amount > outstanding + 0.009:
        raise HTTPException(status_code=400, detail=f"Repayment cannot exceed outstanding balance of {outstanding:.2f}")
    entry = {
        "date": normalize_date(payload.get("date") or now_utc().date().isoformat()),
        "amount": amount,
        "note": payload.get("note", ""),
    }
    await db.lendings.update_one({"_id": oid(item_id)}, {"$push": {"repayments": entry}})
    return _enrich(await db.lendings.find_one({"_id": oid(item_id)}))


@router.delete("/lending/{item_id}")
async def delete_lending(item_id: str, user: dict = Depends(require_admin)):
    await db.lendings.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}
