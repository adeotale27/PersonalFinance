"""Unified, persistent finance alerts and acknowledgement workflow."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from core import db, serialize, now_utc, require_admin, oid, round2
from api_rental import ensure_recurring_rent_payments
from api_farms import ensure_annual_farm_rent_payments

router = APIRouter(tags=["notifications"])

def days_until(value):
    try: return (date.fromisoformat(str(value)[:10]) - now_utc().date()).days
    except (ValueError, TypeError): return None


def action_for(alert: dict) -> dict:
    """Give the UI a safe, explicit destination for fixing this alert."""
    kind, source = alert.get("kind"), alert.get("source", "")
    if kind == "RENT_DUE":
        return {"label": "Record collection", "path": f"/rental?payment={source}"}
    if kind == "FARM_RENT_DUE":
        return {"label": "Record collection", "path": f"/farms?payment={source}"}
    if kind in ("LENDING_OVERDUE", "BORROWING_OVERDUE"):
        tab = "BORROWED" if kind == "BORROWING_OVERDUE" else "LENT"
        return {"label": "Record repayment", "path": f"/lending?tab={tab}&focus={source}"}
    if kind == "LOAN_PAYMENT":
        return {"label": "Update loan", "path": f"/loans?focus={source}"}
    if kind.endswith("_CONTRIBUTION"):
        return {"label": "Update contribution", "path": f"/pf-ppf?focus={source}"}
    if kind == "CUSTOM_REMINDER":
        return {"label": "Review reminder", "path": "/notifications"}
    return {"label": "Review details", "path": "/notifications"}

async def upsert_alert(kind, title, message, due_date=None, amount=None, source=None, severity="info"):
    fingerprint = f"{kind}:{source or title}:{due_date or ''}"
    data = {"kind": kind, "title": title, "message": message, "due_date": due_date, "amount": round2(amount), "source": source or "", "severity": severity, "fingerprint": fingerprint, "updated_at": now_utc()}
    existing = await db.notifications.find_one({"fingerprint": fingerprint})
    if existing: await db.notifications.update_one({"_id": existing["_id"]}, {"$set": data})
    else:
        data.update({"status": "OPEN", "created_at": now_utc(), "acknowledged_at": None})
        await db.notifications.insert_one(data)

async def refresh_notifications():
    await ensure_recurring_rent_payments(); await ensure_annual_farm_rent_payments()
    today = now_utc().date().isoformat()
    rents = await db.rent_payments.find({"deleted_at": {"$exists": False}, "status": {"$in": ["PENDING", "PARTIAL"]}}).to_list(500)
    for p in rents:
        balance = round2(p.get("amount_due", 0) - p.get("amount_received", 0))
        if balance > 0: await upsert_alert("RENT_DUE", "Rent collection due", f"{p.get('property_name') or 'Rental'} · {p.get('tenant') or 'Tenant'}", p.get("due_date"), balance, str(p["_id"]), "critical" if (days_until(p.get("due_date")) or 0) < 0 else "warning")
    farm_rents = await db.farm_rent_payments.find({"deleted_at": {"$exists": False}, "status": {"$in": ["PENDING", "PARTIAL"]}}).to_list(500)
    for p in farm_rents:
        balance = round2(p.get("amount_due", 0) - p.get("amount_received", 0))
        if balance > 0: await upsert_alert("FARM_RENT_DUE", "Farm lease collection due", f"{p.get('farm_name') or 'Farm'} · {p.get('tenant') or 'Tenant'}", p.get("due_date"), balance, str(p["_id"]), "warning")
    lendings = await db.lendings.find({"deleted_at": {"$exists": False}}).to_list(2000)
    for x in lendings:
        paid = sum(round2(r.get("amount", 0)) for r in x.get("repayments", []) or []); balance, due = round2(x.get("amount", 0) - paid), x.get("due_date")
        if balance > 0 and due and due < today:
            borrowed = x.get("direction") == "BORROWED"; label = "Borrowing overdue" if borrowed else "Lending overdue"
            await upsert_alert("BORROWING_OVERDUE" if borrowed else "LENDING_OVERDUE", label, x.get("counterparty") or "Counterparty", due, balance, str(x["_id"]), "critical")
    loans = await db.loans.find({"deleted_at": {"$exists": False}, "status": {"$ne": "Closed"}}).to_list(500)
    for loan in loans:
        due, remaining = loan.get("next_due_date") or loan.get("disbursement_date"), days_until(loan.get("next_due_date") or loan.get("disbursement_date"))
        if due and remaining is not None and remaining <= 7: await upsert_alert("LOAN_PAYMENT", "Loan payment approaching" if remaining >= 0 else "Loan payment overdue", f"{loan.get('name') or loan.get('type') or 'Loan'} · {loan.get('lender') or 'Bank'}", due, loan.get("emi"), str(loan["_id"]), "critical" if remaining < 0 else "warning")
    funds = await db.pf_ppf.find({"deleted_at": {"$exists": False}}).to_list(500)
    for fund in funds:
        due, remaining = fund.get("contribution_due_date") or fund.get("next_contribution_date"), days_until(fund.get("contribution_due_date") or fund.get("next_contribution_date"))
        if due and remaining is not None and remaining <= 14:
            kind = (fund.get("kind") or "Fund").upper(); await upsert_alert(f"{kind}_CONTRIBUTION", f"{kind} contribution due", fund.get("institution") or "Account", due, fund.get("expected_contribution"), str(fund["_id"]), "warning")

@router.get("/notifications")
async def notifications(status: str = "OPEN", user: dict = Depends(require_admin)):
    await refresh_notifications(); query = {} if status == "ALL" else {"status": status}
    docs = await db.notifications.find(query).sort([("status", 1), ("due_date", 1), ("created_at", -1)]).to_list(1000)
    items = []
    for item in docs:
        result = serialize(item)
        result["action"] = action_for(item)
        items.append(result)
    return {"count": len(items), "items": items}

@router.post("/notifications/{item_id}/acknowledge")
async def acknowledge_notification(item_id: str, user: dict = Depends(require_admin)):
    alert = await db.notifications.find_one({"_id": oid(item_id)})
    if not alert: raise HTTPException(status_code=404, detail="Notification not found")
    # Acknowledgement is deliberately separate from a financial change.  The
    # action button takes the user to the original record to enter the actual
    # payment/repayment, preventing an accidental acknowledgement from marking
    # money as collected.
    # Older installs can contain duplicate alerts from a prior source-date
    # change. Acknowledging one must clear every open copy of that same action
    # from the bell; a materially changed due/amount gets a new fingerprint.
    acknowledged = {"status": "ACKNOWLEDGED", "acknowledged_at": now_utc(), "acknowledged_by": user.get("email")}
    await db.notifications.update_many({"kind": alert.get("kind"), "source": alert.get("source"), "status": "OPEN"}, {"$set": acknowledged})
    await db.notifications.update_one({"_id": alert["_id"]}, {"$set": acknowledged})
    return serialize(await db.notifications.find_one({"_id": alert["_id"]}))

@router.post("/notifications/reminders")
async def create_reminder(payload: dict, user: dict = Depends(require_admin)):
    title, due = (payload.get("title") or "").strip(), payload.get("due_date")
    if not title or not due: raise HTTPException(status_code=400, detail="Title and due date are required")
    await upsert_alert("CUSTOM_REMINDER", title, payload.get("message") or "Personal finance reminder", due, payload.get("amount"), payload.get("source") or title, payload.get("severity") or "info")
    return {"status": "created"}
