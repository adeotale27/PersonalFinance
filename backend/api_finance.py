"""Finance: accounts, transactions (income/expense/transfer), settings."""
from datetime import datetime, timezone
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Request
from core import db, serialize, oid, now_utc, require_admin, round2, log_audit, normalize_date, validate_financial_payload

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
    payload = validate_financial_payload(payload)
    payload["opening_balance"] = round2(payload.get("opening_balance", 0))
    payload.setdefault("status", "ACTIVE")
    payload.setdefault("currency", "INR")
    payload["created_at"] = now_utc()
    res = await db.accounts.insert_one(payload)
    return serialize(await db.accounts.find_one({"_id": res.inserted_id}))


@router.put("/accounts/{item_id}")
async def update_account(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload = validate_financial_payload(payload)
    payload.pop("id", None); payload.pop("_id", None); payload.pop("current_balance", None)
    if "opening_balance" in payload:
        payload["opening_balance"] = round2(payload["opening_balance"])
    payload["updated_at"] = now_utc()
    await db.accounts.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.accounts.find_one({"_id": oid(item_id)}))


@router.delete("/accounts/{item_id}")
async def delete_account(item_id: str, user: dict = Depends(require_admin)):
    await db.accounts.delete_one({"_id": oid(item_id)})
    return {"status": "deleted"}


# ---------------- transactions ----------------
@router.get("/transactions")
async def list_transactions(request: Request, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    params = dict(request.query_params)
    for key in ("type", "scope", "project_id", "category", "account_id", "family_member_id", "source", "farm_id", "party"):
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
    payload = validate_financial_payload(payload)
    if payload.get("type") == "EXPENSE" and payload.get("project_id") and payload.get("party"):
        party = await db.parties.find_one({"project_id": payload["project_id"], "name": payload["party"], "deleted_at": {"$exists": False}})
        if not party:
            raise HTTPException(status_code=422, detail="Choose a party belonging to this project")
        payload["party_id"] = str(party["_id"])
    if payload.get("payment_mode") != "UPI":
        payload.pop("utr_number", None)
    if payload.get("type") == "EXPENSE" and payload.get("party_id"):
        payload.setdefault("payment_status", "PENDING_PARTY_ACKNOWLEDGEMENT" if payload.get("payment_mode") in ("Cash", "UPI") else "RECORDED")
    payload["amount"] = round2(payload.get("amount", 0))
    payload.setdefault("scope", "PERSONAL")
    payload["date"] = normalize_date(payload.get("date") or now_utc().date().isoformat())
    payload["created_at"] = now_utc()
    payload["created_by"] = user["email"]
    res = await db.transactions.insert_one(payload)
    await log_audit(user, "create", "transaction", str(res.inserted_id), {"type": payload.get("type"), "amount": payload["amount"]})
    return serialize(await db.transactions.find_one({"_id": res.inserted_id}))


@router.put("/transactions/{item_id}")
async def update_transaction(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload = validate_financial_payload(payload)
    payload.pop("id", None); payload.pop("_id", None)
    if "amount" in payload:
        payload["amount"] = round2(payload["amount"])
    if "date" in payload:
        payload["date"] = normalize_date(payload["date"])
    payload["updated_at"] = now_utc()
    await db.transactions.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.transactions.find_one({"_id": oid(item_id)}))


@router.delete("/transactions/{item_id}")
async def delete_transaction(item_id: str, user: dict = Depends(require_admin)):
    await db.transactions.delete_one({"_id": oid(item_id)})
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
    "date_format": "DD-MM-YYYY",
    "income_categories": ["Salary", "Business", "Rental", "Interest", "Dividend", "Investment", "Freelance", "Other"],
    "expense_categories": ["Household", "Rent", "Utilities", "Food & Dining", "Groceries", "Transport & Fuel", "Travel", "Medical", "Education", "Insurance", "Taxes", "Construction", "Home Maintenance", "Subscriptions", "EMI", "Shopping", "Entertainment", "Gifts & Donations", "Personal Care", "Childcare", "Pets", "Other"],
    "project_categories": ["Civil", "Architecture", "Structural", "Plumbing", "Electrical", "Government", "Materials", "Labour", "Interior", "Consultant", "Equipment", "Transport", "Miscellaneous"],
    "payment_methods": ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Net Banking"],
}

FLUSH_TARGETS = {
    "accounts": "accounts",
    "income": "transactions:INCOME",
    "expenses": "transactions:EXPENSE",
    "transfers": "transactions:TRANSFER",
    "transactions": "transactions",
    "loans": "loans",
    "projects": "projects",
    "farms": "farms",
    "insurance": "insurance",
    "pf_ppf": "pf_ppf",
    "savings": "savings",
    "assets": "assets",
    "liabilities": "liabilities",
    "lendings": "lendings",
    "investments": "investments",
    "family": "family_members",
    "parties": "parties",
    "work_logs": "work_logs",
    "losses": "losses",
    "rental_properties": "rental_properties",
    "rent_payments": "rent_payments",
    "farm_rent_payments": "farm_rent_payments",
    "diary_entries": "diary_entries",
}


def normalize_flush_selection(selection):
    if selection is None:
        return []
    values = []
    items = [str(v).strip().lower() for v in selection if str(v).strip()]
    if not items:
        return []
    if "all" in items or "select_all" in items or "all_data" in items:
        return ["all"]

    for item in items:
        normalized = item.replace(" ", "_").replace("-", "_")
        if normalized in {"income", "incomes"}:
            values.append("transactions:INCOME")
        elif normalized in {"expense", "expenses"}:
            values.append("transactions:EXPENSE")
        elif normalized in {"transfer", "transfers"}:
            values.append("transactions:TRANSFER")
        elif normalized in {"transactions", "all_transactions"}:
            values.append("transactions")
        else:
            mapped = FLUSH_TARGETS.get(normalized)
            if mapped:
                values.append(mapped)
    return list(dict.fromkeys(values))


async def _flush_collection_target(target: str):
    if ":" in target:
        collection, txn_type = target.split(":", 1)
        await db[collection].update_many(
            {"type": txn_type, "deleted_at": {"$exists": False}},
            {"$set": {"deleted_at": now_utc()}},
        )
        return

    if target == "transactions":
        await db.transactions.update_many(
            {"deleted_at": {"$exists": False}},
            {"$set": {"deleted_at": now_utc()}},
        )
        return

    # update_many is safe for a missing collection and avoids the old un-awaited
    # list_collection_names() check that prevented some selected streams flushing.
    await db[target].update_many(
        {"deleted_at": {"$exists": False}},
        {"$set": {"deleted_at": now_utc()}},
    )


@router.get("/settings")
async def get_settings(user: dict = Depends(require_admin)):
    # Earlier installations used the global `_id: app`; new workspaces use a
    # normal ObjectId plus a scoped settings key so each household is independent.
    doc = await db.settings.find_one({"$or": [{"settings_key": "app"}, {"_id": "app"}]})
    if not doc:
        doc = {"settings_key": "app", **DEFAULT_SETTINGS}
        result = await db.settings.insert_one(doc)
        doc["_id"] = result.inserted_id
    else:
        # New standard categories should appear for existing installations too,
        # without removing any categories the user already configured.
        additions = {}
        for key in ("income_categories", "expense_categories", "project_categories", "payment_methods"):
            merged = list(dict.fromkeys((doc.get(key) or []) + DEFAULT_SETTINGS[key]))
            if merged != doc.get(key):
                additions[key] = merged
        if additions:
            await db.settings.update_one({"_id": doc["_id"]}, {"$set": additions})
            doc.update(additions)
    doc.pop("_id", None)
    return doc


@router.put("/settings")
async def update_settings(payload: dict, user: dict = Depends(require_admin)):
    payload.pop("_id", None)
    doc = await db.settings.find_one({"$or": [{"settings_key": "app"}, {"_id": "app"}]})
    if doc:
        await db.settings.update_one({"_id": doc["_id"]}, {"$set": payload})
    else:
        result = await db.settings.insert_one({"settings_key": "app", **DEFAULT_SETTINGS, **payload})
        doc = await db.settings.find_one({"_id": result.inserted_id})
    doc = await db.settings.find_one({"_id": doc["_id"]})
    doc.pop("_id", None)
    return doc


@router.post("/settings/flush")
async def flush_selected_data(payload: dict, user: dict = Depends(require_admin)):
    selection = payload.get("selection") or payload.get("selections") or payload.get("items") or []
    normalized = normalize_flush_selection(selection)
    if not normalized:
        raise HTTPException(status_code=400, detail="Select at least one stream or category to flush.")

    targets = list(FLUSH_TARGETS.values()) if "all" in normalized else normalized
    seen = set()
    for target in targets:
        if target in seen:
            continue
        seen.add(target)
        await _flush_collection_target(target)

    return {"status": "flushed", "selected": list(seen), "count": len(seen)}
