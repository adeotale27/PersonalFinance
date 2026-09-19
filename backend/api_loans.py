"""Loans (home/vehicle/personal) with amortization progress."""
from fastapi import APIRouter, Depends
from core import db, serialize, oid, now_utc, require_admin, round2
from crud import make_crud_router

router = APIRouter(tags=["loans"])
crud, coll = make_crud_router("loans", "loans")


def _enrich(d):
    d = serialize(d)
    disbursed = round2(d.get("disbursed") or d.get("sanctioned", 0))
    outstanding = round2(d.get("outstanding", 0))
    d["principal_paid"] = round2(max(disbursed - outstanding, 0))
    d["progress"] = round2((d["principal_paid"] / disbursed * 100) if disbursed else 0)
    return d


@router.get("/loans")
async def list_loans(user: dict = Depends(require_admin)):
    docs = await coll.find({"deleted_at": {"$exists": False}}).sort([("created_at", -1)]).to_list(500)
    return [_enrich(d) for d in docs]


@router.get("/loans/summary")
async def loans_summary(user: dict = Depends(require_admin)):
    docs = [_enrich(d) for d in await coll.find({"deleted_at": {"$exists": False}}).to_list(500)]
    return {
        "total_outstanding": round2(sum(d.get("outstanding", 0) for d in docs)),
        "total_sanctioned": round2(sum(d.get("sanctioned", 0) for d in docs)),
        "total_paid": round2(sum(d.get("principal_paid", 0) for d in docs)),
        "monthly_emi": round2(sum(d.get("emi", 0) for d in docs if (d.get("status") or "Open") != "Closed")),
        "count": len(docs),
    }


router.include_router(crud)
