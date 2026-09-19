"""Finance: accounts, transactions (income/expense/transfer), settings."""
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from core import db, serialize, oid, now_utc, require_admin, round2, log_audit

router = APIRouter(tags=["finance"])


# ---------------- helpers ----------------
async def compute_account_balances():
    accts = await db.accounts.find({"deleted_at": {"$exists": False}}).to_list(1000)
    balances = {str(a["_id"]): round2(a.get("opening_balance", 0)) for a in accts}
    txns = await db.transactions.find({"deleted_at": {"$exists": False}}).to_list(50000)
    for t in txns:
        amt = round2(t.get("amount", 0))
        typ = t.get("type")
        acc = t.get("account_id")
        to_acc = t.get("to_account_id")
        if typ == "INCOME" and acc in balances:
            balances[acc] += amt
        elif typ == "EXPENSE" and acc in balances:
            balances[acc] -= amt
        elif typ == "TRANSFER":
            if acc in balances:
                balances[acc] -= amt
            if to_acc in balances:
                balances[to_acc] += amt
    return balances, accts


# ---------------- accounts ----------------
@router.get("/accounts")
async def list_accounts(user: dict = Depends(require_admin)):
    balances, accts = await compute_account_balances()
    out = []
    for a in accts:
        d = serialize(a)
        d["current_balance"] = balances.get(str(a["_id"]), round2(a.get("opening_balance", 0)))
        out.append(d)
    return out


@router.post("/accounts")
async def create_account(payload: dict, user: dict = Depends(require_admin)):
    payload["opening_balance"] = round2(payload.get("opening_balance", 0))
    payload.setdefault("status", "ACTIVE")
    payload.setdefault("currency", "INR")
    payload["created_at"] = now_utc()
    res = await db.accounts.insert_one(payload)
    return serialize(await db.accounts.find_one({"_id": res.inserted_id}))


@router.put("/accounts/{item_id}")
async def update_account(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None); payload.pop("current_balance", None)
    if "opening_balance" in payload:
        payload["opening_balance"] = round2(payload["opening_balance"])
    payload["updated_at"] = now_utc()
    await db.accounts.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.accounts.find_one({"_id": oid(item_id)}))


@router.delete("/accounts/{item_id}")
async def delete_account(item_id: str, user: dict = Depends(require_admin)):
    await db.accounts.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


# ---------------- transactions ----------------
@router.get("/transactions")
async def list_transactions(request: Request, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    params = dict(request.query_params)
    for key in ("type", "scope", "project_id", "category", "account_id", "family_member_id", "source"):
        if params.get(key):
            q[key] = params[key]
    date_q = {}
    if params.get("from"):
        date_q["$gte"] = params["from"]
    if params.get("to"):
        date_q["$lte"] = params["to"]
    if date_q:
        q["date"] = date_q
    docs = await db.transactions.find(q).sort([("date", -1), ("created_at", -1)]).to_list(5000)
    return [serialize(d) for d in docs]


@router.post("/transactions")
async def create_transaction(payload: dict, user: dict = Depends(require_admin)):
    payload["amount"] = round2(payload.get("amount", 0))
    payload.setdefault("scope", "PERSONAL")
    payload.setdefault("date", now_utc().date().isoformat())
    payload["created_at"] = now_utc()
    payload["created_by"] = user["email"]
    res = await db.transactions.insert_one(payload)
    await log_audit(user, "create", "transaction", str(res.inserted_id), {"type": payload.get("type"), "amount": payload["amount"]})
    return serialize(await db.transactions.find_one({"_id": res.inserted_id}))


@router.put("/transactions/{item_id}")
async def update_transaction(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    if "amount" in payload:
        payload["amount"] = round2(payload["amount"])
    payload["updated_at"] = now_utc()
    await db.transactions.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.transactions.find_one({"_id": oid(item_id)}))


@router.delete("/transactions/{item_id}")
async def delete_transaction(item_id: str, user: dict = Depends(require_admin)):
    await db.transactions.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


# ---------------- income / expense summaries ----------------
def _month_key(date_str: str) -> str:
    return (date_str or "")[:7]


@router.get("/income/summary")
async def income_summary(user: dict = Depends(require_admin)):
    return await _txn_summary("INCOME", "source")


@router.get("/expenses/summary")
async def expense_summary(user: dict = Depends(require_admin)):
    return await _txn_summary("EXPENSE", "category")


async def _txn_summary(txn_type: str, group_field: str):
    docs = await db.transactions.find(
        {"type": txn_type, "deleted_at": {"$exists": False}}
    ).to_list(20000)
    total = round2(sum(round2(d.get("amount", 0)) for d in docs))
    now = now_utc()
    this_month = now.strftime("%Y-%m")
    this_year = now.strftime("%Y")
    by_group = defaultdict(float)
    by_month = defaultdict(float)
    month_total = 0.0
    year_total = 0.0
    for d in docs:
        amt = round2(d.get("amount", 0))
        by_group[d.get(group_field) or "Uncategorized"] += amt
        mk = _month_key(d.get("date"))
        by_month[mk] += amt
        if mk == this_month:
            month_total += amt
        if (d.get("date") or "")[:4] == this_year:
            year_total += amt
    return {
        "total": total,
        "this_month": round2(month_total),
        "this_year": round2(year_total),
        "by_group": [{"name": k, "value": round2(v)} for k, v in sorted(by_group.items(), key=lambda x: -x[1])],
        "by_month": [{"month": k, "value": round2(v)} for k, v in sorted(by_month.items()) if k],
    }


# ---------------- settings ----------------
DEFAULT_SETTINGS = {
    "currency": "INR",
    "timezone": "Asia/Kolkata",
    "income_categories": ["Salary", "Business", "Rental", "Interest", "Dividend", "Investment", "Freelance", "Other"],
    "expense_categories": ["Household", "Utilities", "Food", "Travel", "Medical", "Education", "Insurance", "Taxes", "Construction", "Subscriptions", "EMI", "Shopping", "Other"],
    "project_categories": ["Civil", "Architecture", "Structural", "Plumbing", "Electrical", "Government", "Materials", "Labour", "Interior", "Consultant", "Equipment", "Transport", "Miscellaneous"],
    "payment_methods": ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Net Banking"],
}


@router.get("/settings")
async def get_settings(user: dict = Depends(require_admin)):
    doc = await db.settings.find_one({"_id": "app"})
    if not doc:
        doc = {"_id": "app", **DEFAULT_SETTINGS}
        await db.settings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/settings")
async def update_settings(payload: dict, user: dict = Depends(require_admin)):
    payload.pop("_id", None)
    await db.settings.update_one({"_id": "app"}, {"$set": payload}, upsert=True)
    doc = await db.settings.find_one({"_id": "app"})
    doc.pop("_id", None)
    return doc
