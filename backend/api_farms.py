"""Farms & farming ledger (per-farm income/expense)."""
from collections import defaultdict
from fastapi import APIRouter, Depends
from core import db, serialize, oid, now_utc, require_admin, round2
from crud import make_crud_router

router = APIRouter(tags=["farms"])
crud, coll = make_crud_router("farms", "farms")


@router.get("/farms/summary")
async def farms_summary(user: dict = Depends(require_admin)):
    farms = [serialize(d) for d in await coll.find({"deleted_at": {"$exists": False}}).to_list(500)]
    txns = await db.transactions.find({"scope": "FARM", "deleted_at": {"$exists": False}}).to_list(20000)
    inc_by_farm = defaultdict(float)
    exp_by_farm = defaultdict(float)
    monthly = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    total_in = total_out = 0.0
    for t in txns:
        amt = round2(t.get("amount", 0))
        fid = t.get("farm_id")
        mk = (t.get("date") or "")[:7]
        if t.get("type") == "INCOME":
            inc_by_farm[fid] += amt; total_in += amt
            if mk: monthly[mk]["in"] += amt
        elif t.get("type") == "EXPENSE":
            exp_by_farm[fid] += amt; total_out += amt
            if mk: monthly[mk]["out"] += amt
    per_farm = []
    for f in farms:
        inc = round2(inc_by_farm.get(f["id"], 0))
        exp = round2(exp_by_farm.get(f["id"], 0))
        per_farm.append({**f, "income": inc, "expense": exp, "net": round2(inc - exp)})
    return {
        "total_income": round2(total_in),
        "total_expense": round2(total_out),
        "net": round2(total_in - total_out),
        "count": len(farms),
        "per_farm": per_farm,
        "monthly": [{"month": k, "in": round2(v["in"]), "out": round2(v["out"])} for k, v in sorted(monthly.items())],
    }


router.include_router(crud)
