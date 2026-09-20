"""Canonical financial read/write services.

Legacy collections remain the source for their existing screens.  New imports
write traceable canonical records as well, allowing a gradual, reversible move
to the unified model.
"""
from __future__ import annotations

import hashlib
import re
from collections import defaultdict
from datetime import datetime, timezone

from core import db, raw_db, now_utc, round2


def normalized_key(*parts: object) -> str:
    """Stable human-readable identity key, safe for idempotency checks."""
    text = "|".join(str(part or "").strip().lower() for part in parts)
    return re.sub(r"[^a-z0-9|]+", "-", text).strip("-")


def fingerprint(*parts: object) -> str:
    return hashlib.sha256(normalized_key(*parts).encode("utf-8")).hexdigest()


async def ensure_indexes() -> None:
    """Create identities that are unique within a workspace, not globally."""
    async def workspace_unique(collection, legacy_name, fields, name):
        info = await collection.index_information()
        legacy = info.get(legacy_name)
        # Old single-field unique indexes reject a new household's first record
        # (notably today's valuation snapshot). Replacing an index preserves data.
        if legacy and legacy.get("unique"):
            await collection.drop_index(legacy_name)
        await collection.create_index([("workspace_id", 1), *fields], unique=True, name=name)

    await workspace_unique(raw_db.financial_entities, "identity_key_1", [("identity_key", 1)], "workspace_identity_key")
    await workspace_unique(raw_db.holdings, "identity_key_1", [("identity_key", 1)], "workspace_identity_key")
    await workspace_unique(raw_db.financial_transactions, "fingerprint_1", [("fingerprint", 1)], "workspace_fingerprint")
    await raw_db.financial_transactions.create_index([("workspace_id", 1), ("occurred_on", -1), ("entity_id", 1)])
    await workspace_unique(raw_db.import_runs, "content_sha256_1", [("content_sha256", 1)], "workspace_content_sha256")
    await workspace_unique(raw_db.import_rows, "run_id_1_row_number_1", [("run_id", 1), ("row_number", 1)], "workspace_run_row")
    await raw_db.import_rows.create_index([("workspace_id", 1), ("fingerprint", 1)])
    await workspace_unique(raw_db.valuation_snapshots, "as_of_1", [("as_of", 1)], "workspace_as_of")
    await raw_db.reconciliation_cases.create_index([("workspace_id", 1), ("status", 1), ("created_at", -1)])


async def entity_for_investment(name: str, owner: str, asset_class: str, source_import_id: str | None = None, session=None) -> dict:
    key = normalized_key("investment", name, owner, asset_class)
    existing = await db.financial_entities.find_one({"identity_key": key}, session=session)
    if existing:
        return existing
    now = now_utc()
    doc = {
        "entity_type": "INVESTMENT",
        "display_name": name,
        "owner": owner,
        "asset_class": asset_class,
        "identity_key": key,
        "source_import_id": source_import_id,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.financial_entities.insert_one(doc, session=session)
    doc["_id"] = result.inserted_id
    return doc


async def record_imported_transaction(*, run_id: str, row_number: int, entity_id: str, kind: str, amount: float, occurred_on: str, source_reference: str, session=None) -> bool:
    token = fingerprint(run_id, row_number, kind, entity_id, amount, occurred_on)
    existing = await db.financial_transactions.find_one({"fingerprint": token}, session=session)
    if existing:
        return False
    await db.financial_transactions.insert_one({
        "fingerprint": token,
        "kind": kind,
        "amount": round2(amount),
        "occurred_on": occurred_on,
        "entity_id": entity_id,
        "source_import_id": run_id,
        "source_row": row_number,
        "source_reference": source_reference,
        "created_at": now_utc(),
    }, session=session)
    return True


async def snapshot_net_worth(net_worth: float, assets: float, liabilities: float, source: str = "derived") -> None:
    """One immutable daily snapshot. Historical gaps are never fabricated."""
    as_of = now_utc().date().isoformat()
    await db.valuation_snapshots.update_one(
        {"as_of": as_of},
        {"$setOnInsert": {"as_of": as_of, "net_worth": round2(net_worth), "total_assets": round2(assets), "total_liabilities": round2(liabilities), "source": source, "created_at": now_utc()}},
        upsert=True,
    )


async def net_worth_history() -> list[dict]:
    rows = await db.valuation_snapshots.find({}).sort("as_of", 1).to_list(2000)
    return [{"date": row["as_of"], "net_worth": round2(row.get("net_worth")), "assets": round2(row.get("total_assets")), "liabilities": round2(row.get("total_liabilities"))} for row in rows]


async def search_financial_records(query: str) -> list[dict]:
    query = query.strip()
    if len(query) < 2:
        return []
    regex = {"$regex": re.escape(query), "$options": "i"}
    results: list[dict] = []
    specs = [
        ("INVESTMENTS", db.investments, {"$or": [{"name": regex}, {"symbol": regex}], "deleted_at": {"$exists": False}}, "name", "/savings"),
        ("ACCOUNTS", db.accounts, {"$or": [{"name": regex}, {"bank": regex}], "deleted_at": {"$exists": False}}, "name", "/accounts"),
        ("TRANSACTIONS", db.transactions, {"$or": [{"title": regex}, {"category": regex}, {"description": regex}], "deleted_at": {"$exists": False}}, "title", "/cash-flow"),
        ("DOCUMENTS", db.documents, {"$or": [{"filename": regex}, {"category": regex}], "deleted_at": {"$exists": False}}, "filename", "/documents"),
        ("PROJECTS", db.projects, {"name": regex, "deleted_at": {"$exists": False}}, "name", "/projects"),
        ("PEOPLE", db.family_members, {"name": regex, "deleted_at": {"$exists": False}}, "name", "/family"),
    ]
    for group, collection, filter_, label, path in specs:
        for row in await collection.find(filter_).limit(5).to_list(5):
            results.append({"group": group, "id": str(row["_id"]), "label": row.get(label) or "Untitled", "detail": row.get("type") or row.get("category") or "", "path": path})
    return results
