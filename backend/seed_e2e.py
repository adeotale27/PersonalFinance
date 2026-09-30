"""Add explicitly requested dummy records to a disposable local E2E workspace."""
import argparse
import asyncio
import os
from datetime import timedelta
from urllib.parse import urlsplit

from dotenv import load_dotenv


async def seed_e2e():
    from core import db, now_utc

    today = now_utc().date()
    due = (today + timedelta(days=7)).isoformat()
    timestamp = now_utc()
    fixtures = {
        "goals": [{
            "name": "E2E emergency fund goal", "category": "Savings", "target_amount": 250000,
            "current_amount": 100000, "target_date": due, "status": "ACTIVE", "owner": "Self",
            "created_at": timestamp,
        }],
        "necessities": [{
            "name": "E2E family vehicle", "category": "Vehicle", "estimated_value": 850000,
            "owner": "Self", "status": "ACTIVE", "notes": "Disposable end-to-end test fixture",
            "created_at": timestamp,
        }],
        "losses": [{
            "group": "Other", "category": "E2E test loss", "amount": 1250,
            "date": today.isoformat(), "notes": "Disposable end-to-end test fixture",
            "created_at": timestamp,
        }],
        "diary_entries": [{
            "title": "E2E finance review", "date": today.isoformat(),
            "body": "Dummy diary entry for local end-to-end verification.",
            "created_at": timestamp, "created_by": "e2e-seed",
        }],
        "notifications": [{
            "kind": "CUSTOM_REMINDER", "title": "E2E review reminder",
            "message": "Dummy reminder for local end-to-end verification.",
            "due_date": due, "amount": 1000, "source": "e2e-seed",
            "status": "OPEN", "severity": "info", "created_at": timestamp,
        }],
    }
    for collection, documents in fixtures.items():
        if await db[collection].count_documents({}) == 0:
            await db[collection].insert_many(documents)

    if not await db.farms.find_one({"number": "E2E-LEASE"}):
        await db.farms.insert_one({
            "name": "E2E leased farm",
            "number": "E2E-LEASE",
            "annual_rent_enabled": True,
            "annual_rent": 84000,
            "lease_start_date": today.replace(month=1, day=1).isoformat(),
            "annual_rent_due_date": today.isoformat(),
            "tenant": "E2E farm tenant",
            "e2e_fixture": True,
            "created_at": timestamp,
        })

    project = await db.projects.find_one({
        "name": "Skyline Heights Residence",
        "deleted_at": {"$exists": False},
    })
    if project:
        project_id = str(project["_id"])
        architect = await db.parties.find_one({
            "project_id": project_id,
            "name": "Arjun Design Studio",
            "deleted_at": {"$exists": False},
        })
        if architect:
            party_id = str(architect["_id"])
            existing_payment = await db.transactions.find_one({
                "project_id": project_id,
                "party_id": party_id,
                "deleted_at": {"$exists": False},
            })
            account = await db.accounts.find_one({"name": "SBI Project Account"})
            if not existing_payment and account:
                await db.transactions.insert_one({
                    "type": "EXPENSE",
                    "date": today.isoformat(),
                    "amount": 200000,
                    "account_id": str(account["_id"]),
                    "category": "Professional Fees",
                    "party": "Arjun Design Studio",
                    "party_id": party_id,
                    "scope": "PROJECT",
                    "project_id": project_id,
                    "description": "E2E architect milestone payment",
                    "payment_mode": "Bank Transfer",
                    "payment_status": "RECORDED",
                    "created_at": timestamp,
                    "created_by": "e2e-seed",
                })


def main():
    parser = argparse.ArgumentParser(description="Seed extra dummy records in an isolated local E2E database.")
    parser.add_argument("--env-file", default=".env.e2e", help="Local E2E dotenv file (default: .env.e2e)")
    args = parser.parse_args()
    if not load_dotenv(args.env_file, override=True):
        parser.error(f"Could not load {args.env_file}")
    mongo_url = os.environ.get("MONGO_URL", "")
    database_name = os.environ.get("DB_NAME", "")
    if urlsplit(mongo_url).hostname not in {"localhost", "127.0.0.1", "::1"}:
        parser.error("Refusing to seed a non-loopback MongoDB server")
    if not database_name.startswith("nivara_e2e_"):
        parser.error("DB_NAME must begin with 'nivara_e2e_'")

    from core import _client

    asyncio.run(seed_e2e_workspace())
    print(f"Dummy E2E fixtures are ready in local database {database_name}.")
    _client.close()


async def seed_e2e_workspace():
    from core import DB_NAME, MONGO_URL, raw_db, reset_workspace, set_workspace, workspace_for
    from financial_services import ensure_indexes
    if urlsplit(MONGO_URL).hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise RuntimeError("Refusing to seed a non-loopback MongoDB server")
    if not DB_NAME.startswith("nivara_e2e_"):
        raise RuntimeError("Refusing to seed a database outside the nivara_e2e_ namespace")

    await ensure_indexes()
    owner = await raw_db.users.find_one({"is_platform_admin": True})
    if not owner:
        raise RuntimeError("The local E2E database has no initialized workspace owner")
    token = set_workspace(workspace_for(owner))
    try:
        from seed import ensure_demo_party_links
        await ensure_demo_party_links()
        await seed_e2e()
    finally:
        reset_workspace(token)


if __name__ == "__main__":
    main()
