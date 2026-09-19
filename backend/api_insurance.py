"""Insurance policies & premium payments."""
from collections import defaultdict
from fastapi import APIRouter, Depends
from core import db, serialize, oid, now_utc, require_admin, round2
from crud import make_crud_router

router = APIRouter(tags=["insurance"])
crud, coll = make_crud_router("insurance", "insurance")


def _annualize(p):
    prem = round2(p.get("premium", 0))
    freq = (p.get("frequency") or "Yearly").lower()
    if "month" in freq:
        return prem * 12
    if "half" in freq or "semi" in freq:
        return prem * 2
    if "quarter" in freq:
        return prem * 4
    return prem


@router.get("/insurance/summary")
async def insurance_summary(user: dict = Depends(require_admin)):
    docs = [serialize(d) for d in await coll.find({"deleted_at": {"$exists": False}}).to_list(500)]
    total_annual = round2(sum(_annualize(d) for d in docs))
    total_cover = round2(sum(round2(d.get("sum_insured", 0)) for d in docs))
    today = now_utc().date()
    upcoming = []
    for d in docs:
        rd = d.get("renewal_date")
        if rd:
            try:
                from datetime import date
                y, m, dd = [int(x) for x in rd[:10].split("-")]
                days = (date(y, m, dd) - today).days
                if days <= 90:
                    upcoming.append({"id": d["id"], "policy_name": d.get("policy_name"), "type": d.get("type"),
                                     "renewal_date": rd, "days": days, "premium": round2(d.get("premium", 0))})
            except Exception:
                pass
    upcoming.sort(key=lambda x: x["days"])
    by_type = defaultdict(float)
    for d in docs:
        by_type[d.get("type") or "Other"] += _annualize(d)
    return {
        "total_annual_premium": total_annual,
        "total_cover": total_cover,
        "count": len(docs),
        "upcoming_renewals": upcoming,
        "by_type": [{"name": k, "value": round2(v)} for k, v in by_type.items()],
    }


@router.post("/insurance/{item_id}/payment")
async def add_premium(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    entry = {"date": payload.get("date") or now_utc().date().isoformat(),
             "amount": round2(payload.get("amount", 0)), "note": payload.get("note", "")}
    await coll.update_one({"_id": oid(item_id)}, {"$push": {"payments": entry}})
    if payload.get("renewal_date"):
        await coll.update_one({"_id": oid(item_id)}, {"$set": {"renewal_date": payload["renewal_date"]}})
    return serialize(await coll.find_one({"_id": oid(item_id)}))


router.include_router(crud)
