"""Database-backed full-workspace checks; run with run_e2e_local.py."""
import os
from concurrent.futures import ThreadPoolExecutor
from calendar import monthrange
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient


pytestmark = pytest.mark.skipif(
    os.environ.get("NIVARA_LOCAL_E2E") != "1",
    reason="Run the isolated local suite with python run_e2e_local.py",
)
TODAY_DATE = datetime.now(timezone.utc).date()
TODAY = TODAY_DATE.isoformat()
NEXT_WEEK = (TODAY_DATE + timedelta(days=7)).isoformat()
IMPORT_SYMBOL = f"E2E{uuid4().hex[:6].upper()}"


class Api:
    def __init__(self, client, token):
        self.client = client
        self.token = token

    def request(self, method, path, **kwargs):
        headers = {**kwargs.pop("headers", {}), "Authorization": f"Bearer {self.token}"}
        return self.client.request(method, f"/api{path}", headers=headers, **kwargs)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def put(self, path, **kwargs):
        return self.request("PUT", path, **kwargs)

    def delete(self, path, **kwargs):
        return self.request("DELETE", path, **kwargs)


@pytest.fixture(scope="session")
def client():
    from pymongo import MongoClient
    from server import app
    from core import DB_NAME, MONGO_URL

    mongo = MongoClient(MONGO_URL, serverSelectionTimeoutMS=1500)
    try:
        mongo.admin.command("ping")
    except Exception as exc:
        mongo.close()
        pytest.skip(f"Local MongoDB is unavailable: {type(exc).__name__}")
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        if os.environ.get("NIVARA_E2E_KEEP_DB") != "1":
            mongo.drop_database(DB_NAME)
        mongo.close()


@pytest.fixture(scope="session")
def admin(client):
    email = os.environ["ADMIN_EMAIL"]
    password = os.environ["ADMIN_PASSWORD"]
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200
    return Api(client, token)


def test_login_protection_and_full_dashboard_calculations(client, admin):
    assert client.get("/api/accounts").status_code == 401
    assert client.post(
        "/api/auth/login",
        json={"email": os.environ["ADMIN_EMAIL"], "password": "not-the-local-password"},
    ).status_code == 401
    assert client.get(
        "/api/auth/me", headers={"Authorization": "Bearer invalid"}
    ).status_code == 401

    overview_response = admin.get("/dashboard/overview")
    assert overview_response.status_code == 200, overview_response.text
    data = overview_response.json()
    assert data["total_assets"] > 0
    assert data["net_worth"] == pytest.approx(data["total_assets"] - data["total_liabilities"])
    assert data["month_income"] > 0 and data["month_expense"] > 0
    assert data["month_savings"] == pytest.approx(data["month_income"] - data["month_expense"])
    assert data["cash_position"]["available_now"] == pytest.approx(data["cash"] + data["bank"])
    assert data["cash_flow"] and data["allocation"] and data["income_breakdown"]

    snapshot = admin.get("/networth")
    assert snapshot.status_code == 200, snapshot.text
    assert snapshot.json()["net_worth"] == pytest.approx(data["net_worth"])
    history = admin.get("/networth/history")
    assert history.status_code == 200 and history.json()["items"]


def test_all_screen_data_apis_and_seeded_dummy_sections(admin):
    endpoints = [
        ("/dashboard/cashflow?period=monthly", dict),
        ("/accounts", list), ("/transactions", list),
        ("/income/summary", dict), ("/expenses/summary", dict), ("/settings", dict),
        ("/lending?direction=LENT", list), ("/lending/summary?direction=LENT", dict),
        ("/savings/summary", dict), ("/savings", list), ("/investments", list),
        ("/pf-ppf/summary", dict), ("/pf-ppf", list),
        ("/loans/summary", dict), ("/loans", list),
        ("/insurance/summary", dict), ("/insurance", list),
        ("/farms/summary", dict), ("/farms", list), ("/farms/rent-payments", list),
        ("/rental/summary", dict), ("/rental/properties", list), ("/rental/payments", list),
        ("/assets", list), ("/liabilities", list), ("/networth/history", dict),
        ("/projects", list), ("/parties", list), ("/work-logs", list),
        ("/family", list), ("/users", list), ("/access-meta", dict), ("/audit", list),
        ("/documents", list), ("/documents/link-options", list),
        ("/goals", list), ("/necessities", list),
        ("/planning/overview", dict), ("/planning/ownership", dict), ("/planning/inbox", list),
        ("/notifications?status=ALL", dict), ("/error-logs", list),
        ("/error-logs/unread-count", dict), ("/version-history", dict),
        ("/imports", list), ("/search?q=salary", dict),
        ("/export/financial-snapshot", bytes),
    ]
    for path, expected_type in endpoints:
        response = admin.get(path)
        assert response.status_code == 200, f"{path}: {response.status_code} {response.text}"
        if expected_type is bytes:
            assert response.headers["content-type"].startswith("application/vnd.openxmlformats-officedocument")
            assert response.content.startswith(b"PK")
        else:
            assert isinstance(response.json(), expected_type), path

    assert admin.get("/goals").json()
    assert admin.get("/necessities").json()
    assert admin.get("/notifications?status=ALL").json()["items"]
    assert admin.get("/planning/overview").json()["calendar"]
    assert admin.get("/work-logs").json()
    assert admin.get("/projects").json()
    inbox_item = admin.get("/planning/inbox?state=NEEDS_REVIEW").json()[0]
    reviewed = admin.post(
        f"/planning/inbox/{inbox_item['source']}/{inbox_item['source_id']}/review",
        json={"state": "REVIEWED"},
    )
    assert reviewed.status_code == 200 and reviewed.json()["state"] == "REVIEWED"


def test_demo_finance_coverage_and_dashboard_reconciliation(admin):
    populated_endpoints = (
        "/accounts",
        "/transactions",
        "/income/summary",
        "/expenses/summary",
        "/lending?direction=LENT",
        "/lending?direction=BORROWED",
        "/savings",
        "/investments",
        "/pf-ppf",
        "/loans",
        "/insurance",
        "/rental/properties",
        "/rental/payments",
        "/farms",
        "/farms/rent-payments",
        "/projects",
        "/parties",
        "/work-logs",
        "/family",
        "/goals",
        "/necessities",
    )
    for endpoint in populated_endpoints:
        response = admin.get(endpoint)
        assert response.status_code == 200, f"{endpoint}: {response.text}"
        assert response.json(), f"Expected demo data for {endpoint}"

    lent = admin.get("/lending/summary?direction=LENT").json()
    borrowed = admin.get("/lending/summary?direction=BORROWED").json()
    networth = admin.get("/networth").json()
    overview = admin.get("/dashboard/overview").json()
    assert lent["total"] > 0 and lent["outstanding"] > 0
    assert borrowed["total"] > 0 and borrowed["outstanding"] > 0
    assert networth["breakdown"]["receivables"] == pytest.approx(lent["outstanding"])
    assert networth["liability_breakdown"]["borrowings"] == pytest.approx(borrowed["outstanding"])
    assert overview["lending_outstanding"] == pytest.approx(lent["outstanding"])
    assert overview["borrowing_outstanding"] == pytest.approx(borrowed["outstanding"])
    assert overview["cash_position"]["expected_receivables"] >= lent["outstanding"]
    assert overview["cash_position"]["upcoming_obligations"] == pytest.approx(borrowed["outstanding"])

    accounts = admin.get("/accounts").json()
    assert networth["breakdown"]["cash"] == pytest.approx(sum(
        account["current_balance"] for account in accounts if account["type"] == "CASH"
    ))
    assert networth["breakdown"]["bank"] == pytest.approx(sum(
        account["current_balance"] for account in accounts if account["type"] != "CASH"
    ))
    assert networth["breakdown"]["savings"] == pytest.approx(admin.get("/savings/summary").json()["total"])
    assert networth["breakdown"]["pf_ppf"] == pytest.approx(admin.get("/pf-ppf/summary").json()["total"])
    investments = admin.get("/investments").json()
    assets = admin.get("/assets").json()
    liabilities = admin.get("/liabilities").json()
    loans = admin.get("/loans").json()
    assert networth["breakdown"]["investments"] == pytest.approx(sum(
        row["current_value"] for row in investments
    ))
    assert networth["breakdown"]["property"] == pytest.approx(sum(
        row["current_value"] for row in assets
    ))
    loan_liabilities = sum(row["outstanding"] for row in liabilities) + sum(
        row["outstanding"] for row in loans
    )
    assert networth["liability_breakdown"]["loans"] == pytest.approx(loan_liabilities)
    assert networth["total_liabilities"] == pytest.approx(
        loan_liabilities + borrowed["outstanding"]
    )
    assert networth["total_assets"] == pytest.approx(sum(networth["breakdown"].values()))
    assert networth["net_worth"] == pytest.approx(networth["total_assets"] - networth["total_liabilities"])

    transactions = admin.get("/transactions").json()
    this_month = TODAY[:7]
    assert overview["month_income"] == pytest.approx(sum(
        row["amount"] for row in transactions if row["type"] == "INCOME" and row["date"].startswith(this_month)
    ))
    assert overview["month_expense"] == pytest.approx(sum(
        row["amount"] for row in transactions if row["type"] == "EXPENSE" and row["date"].startswith(this_month)
    ))
    rental_payments = admin.get("/rental/payments").json()
    expected_rent_outstanding = sum(
        max(row["amount_due"] - row["amount_received"], 0)
        for row in rental_payments if row["status"] != "COLLECTED"
    )
    assert overview["cash_position"]["expected_receivables"] == pytest.approx(
        lent["outstanding"] + expected_rent_outstanding
    )
    projects = admin.get("/projects").json()
    assert overview["active_projects"] == sum(row["status"] == "ACTIVE" for row in projects)
    assert overview["total_projects"] == len(projects)
    assert overview["total_budget"] == pytest.approx(sum(row["budget"] for row in projects))
    assert overview["project_spend"] == pytest.approx(sum(
        row["amount"] for row in transactions if row["type"] == "EXPENSE" and row.get("project_id")
    ))

    project = admin.get("/projects").json()[0]
    project_id = project["id"]
    project_txns = admin.get(f"/transactions?project_id={project_id}").json()
    project_parties = admin.get(f"/parties?project_id={project_id}").json()
    project_finance = admin.get(f"/projects/{project_id}/finance").json()
    assert project_finance["spent"] == pytest.approx(sum(
        row["amount"] for row in project_txns if row["type"] == "EXPENSE"
    ))
    assert project_finance["received"] == pytest.approx(sum(
        row["amount"] for row in project_txns if row["type"] == "INCOME"
    ))
    assert project_finance["committed"] == pytest.approx(sum(
        row["contract_value"] for row in project_parties
    ))
    assert project_finance["available"] == pytest.approx(
        project_finance["received"] - project_finance["spent"]
    )
    for party in project_parties:
        assert party["paid"] == pytest.approx(sum(
            row["amount"] for row in project_txns
            if row["type"] == "EXPENSE" and row.get("party") == party["name"]
        ))

    unlock = admin.post("/losses/unlock", json={"password": os.environ["LOSSES_PASSWORD"]})
    assert unlock.status_code == 200, unlock.text
    private_headers = {"X-Loss-Token": unlock.json()["token"]}
    assert any(row["category"] == "E2E test loss" for row in admin.get(
        "/losses", headers=private_headers
    ).json())
    assert any(row["title"] == "E2E finance review" for row in admin.get(
        "/diary", headers=private_headers
    ).json())


def test_generic_crud_modules_read_write_delete_and_ownership(admin):
    samples = [
        ("/savings", {"name": "E2E savings", "type": "FD", "current_value": 1000, "owner": "Self"}),
        ("/investments", {"name": "E2E index fund", "type": "Mutual Fund", "cost": 800, "current_value": 1000, "owner": "Self"}),
        ("/assets", {"name": "E2E equipment", "type": "Other", "purchase_value": 500, "current_value": 450, "owner": "Self"}),
        ("/liabilities", {"name": "E2E payable", "type": "Other", "outstanding": 125, "owner": "Self"}),
        ("/pf-ppf", {"kind": "PPF", "institution": "E2E bank", "current_balance": 500, "owner": "Self"}),
        ("/loans", {"name": "E2E loan", "type": "Personal Loan", "sanctioned": 2000, "disbursed": 1800, "outstanding": 1600, "emi": 100, "status": "Open"}),
        ("/insurance", {"type": "Health", "policy_name": "E2E policy", "premium": 1200, "frequency": "Monthly", "sum_insured": 25000, "status": "Active"}),
        ("/goals", {"name": "E2E education", "target_amount": 10000, "current_amount": 1000, "target_date": "2030-01-01"}),
        ("/necessities", {"name": "E2E water filter", "category": "Home", "estimated_value": 6000}),
    ]
    for endpoint, payload in samples:
        created = admin.post(endpoint, json=payload)
        assert created.status_code == 200, f"{endpoint}: {created.status_code} {created.text}"
        row = created.json()
        assert row.get("id") and "password_hash" not in row
        updated = admin.put(f"{endpoint}/{row['id']}", json={**payload, "name": f"{payload.get('name', payload.get('policy_name', 'E2E'))} updated"})
        assert updated.status_code == 200, f"{endpoint}: {updated.text}"
        deleted = admin.delete(f"{endpoint}/{row['id']}")
        assert deleted.status_code == 200, f"{endpoint}: {deleted.text}"
        assert all(item["id"] != row["id"] for item in admin.get(endpoint).json())


def test_transaction_balance_reconciliation_and_dashboard_refresh(admin):
    before = admin.get("/accounts").json()
    account = admin.post(
        "/accounts",
        json={"name": "E2E reconciliation account", "type": "BANK", "opening_balance": 1000, "owner": "Self"},
    )
    assert account.status_code == 200, account.text
    account_id = account.json()["id"]
    base_date = TODAY
    income = admin.post("/transactions", json={
        "type": "INCOME", "date": base_date, "amount": 500,
        "account_id": account_id, "source": "E2E salary", "scope": "PERSONAL",
    })
    expense = admin.post("/transactions", json={
        "type": "EXPENSE", "date": base_date, "amount": 100,
        "account_id": account_id, "category": "E2E household", "scope": "PERSONAL",
    })
    assert income.status_code == 200, income.text
    assert expense.status_code == 200, expense.text
    balance = next(row["current_balance"] for row in admin.get("/accounts").json() if row["id"] == account_id)
    assert balance == 1400
    assert admin.get("/income/summary").json()["by_group"]
    assert admin.get("/expenses/summary").json()["by_group"]
    monthly = admin.get("/dashboard/cashflow?period=monthly").json()
    yearly = admin.get("/dashboard/cashflow?period=yearly").json()
    quarterly = admin.get("/dashboard/cashflow?period=quarterly").json()
    assert monthly["total_in"] > 0
    assert monthly["total_in"] == yearly["total_in"] == quarterly["total_in"]

    changed = admin.put(f"/transactions/{expense.json()['id']}", json={"amount": 125})
    assert changed.status_code == 200 and changed.json()["amount"] == 125
    assert next(row["current_balance"] for row in admin.get("/accounts").json() if row["id"] == account_id) == 1375
    assert admin.delete(f"/transactions/{income.json()['id']}").status_code == 200
    assert admin.delete(f"/transactions/{expense.json()['id']}").status_code == 200
    assert admin.delete(f"/accounts/{account_id}").status_code == 200
    assert len(admin.get("/accounts").json()) == len(before)


def test_lending_savings_contribution_insurance_and_rent_calculations(admin):
    assert admin.post("/lending", json={
        "direction": "IOU", "counterparty": "E2E invalid direction", "amount": 100,
    }).status_code == 422
    assert admin.post("/lending", json={
        "direction": "LENT", "counterparty": " ", "amount": 100,
    }).status_code == 422
    assert admin.post("/lending", json={
        "direction": "LENT", "counterparty": "E2E zero principal", "amount": 0,
    }).status_code == 422
    assert admin.post("/lending", json={
        "direction": "LENT", "counterparty": "E2E invalid repayments",
        "amount": 100, "repayments": "75",
    }).status_code == 422
    lending = admin.post("/lending", json={
        "direction": "LENT", "counterparty": "E2E borrower", "amount": 1000,
        "date": TODAY, "due_date": NEXT_WEEK, "purpose": "E2E test",
    })
    assert lending.status_code == 200, lending.text
    lending_id = lending.json()["id"]
    repayment = admin.post(f"/lending/{lending_id}/repayment", json={"amount": 250, "date": TODAY})
    assert repayment.status_code == 200, repayment.text
    assert repayment.json()["paid"] == 250
    assert repayment.json()["outstanding"] == 750
    assert repayment.json()["status"] == "PARTIALLY_REPAID"
    assert admin.post(f"/lending/{lending_id}/repayment", json={"amount": 751}).status_code == 400
    assert admin.post(f"/lending/{lending_id}/repayment", json={"amount": 0}).status_code == 400
    assert admin.post(f"/lending/{lending_id}/repayment", json={"amount": -1}).status_code == 422
    assert admin.put(f"/lending/{lending_id}", json={"amount": 249}).status_code == 400
    assert admin.put(f"/lending/{lending_id}", json={"amount": 0}).status_code == 422
    assert admin.put(f"/lending/{lending_id}", json={"counterparty": " "}).status_code == 422
    assert admin.put(f"/lending/{lending_id}", json={"repayments": []}).status_code == 422
    assert admin.put(f"/lending/{'0' * 24}", json={"purpose": "missing"}).status_code == 404
    assert admin.post(f"/lending/{'0' * 24}/repayment", json={"amount": 1}).status_code == 404
    summary = admin.get("/lending/summary?direction=LENT").json()
    assert summary["outstanding"] >= 750
    assert admin.delete(f"/lending/{lending_id}").status_code == 200
    assert admin.delete(f"/lending/{lending_id}").status_code == 404

    borrowed = admin.post("/lending", json={
        "direction": "BORROWED", "counterparty": "E2E lender", "amount": 800,
        "date": TODAY, "purpose": "E2E borrowing",
    })
    assert borrowed.status_code == 200, borrowed.text
    borrowed_id = borrowed.json()["id"]
    paid_borrowing = admin.post(
        f"/lending/{borrowed_id}/repayment", json={"amount": 300, "date": TODAY}
    )
    assert paid_borrowing.status_code == 200 and paid_borrowing.json()["outstanding"] == 500
    overview = admin.get("/dashboard/overview").json()
    assert overview["borrowing_outstanding"] == pytest.approx(
        admin.get("/lending/summary?direction=BORROWED").json()["outstanding"]
    )
    assert overview["cash_position"]["upcoming_obligations"] == pytest.approx(
        overview["borrowing_outstanding"]
    )
    assert admin.delete(f"/lending/{borrowed_id}").status_code == 200

    concurrent = admin.post("/lending", json={
        "direction": "LENT", "counterparty": "E2E concurrent repayment",
        "amount": 100, "date": TODAY,
    })
    assert concurrent.status_code == 200, concurrent.text
    concurrent_id = concurrent.json()["id"]
    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(
            lambda _: admin.post(f"/lending/{concurrent_id}/repayment", json={"amount": 70}),
            range(2),
        ))
    assert sorted(response.status_code for response in results) == [200, 400]
    concurrently_repaid = admin.get("/lending?direction=LENT").json()
    concurrent_record = next(row for row in concurrently_repaid if row["id"] == concurrent_id)
    assert concurrent_record["paid"] == 70 and concurrent_record["outstanding"] == 30
    assert admin.post(
        f"/lending/{concurrent_id}/repayment", json={"amount": 30}
    ).json()["status"] == "FULLY_REPAID"
    assert admin.delete(f"/lending/{concurrent_id}").status_code == 200

    savings = admin.post("/savings", json={"name": "E2E deposit", "type": "SAVINGS", "current_value": 500})
    assert savings.status_code == 200, savings.text
    updated_savings = admin.post(f"/savings/{savings.json()['id']}/contribution", json={"amount": 75})
    assert updated_savings.status_code == 200 and updated_savings.json()["current_value"] == 575

    fund = admin.post("/pf-ppf", json={"kind": "PF", "institution": "E2E EPFO", "current_balance": 800})
    assert fund.status_code == 200, fund.text
    updated_fund = admin.post(f"/pf-ppf/{fund.json()['id']}/contribution", json={"amount": 100})
    assert updated_fund.status_code == 200 and updated_fund.json()["current_balance"] == 900

    policy = admin.post("/insurance", json={
        "type": "Health", "policy_name": "E2E monthly policy", "premium": 100,
        "frequency": "Monthly", "sum_insured": 5000, "status": "Active",
    })
    assert policy.status_code == 200, policy.text
    assert admin.post(f"/insurance/{policy.json()['id']}/payment", json={"amount": 100}).status_code == 200
    insurance_summary = admin.get("/insurance/summary").json()
    assert insurance_summary["total_annual_premium"] >= 1200

    rental = admin.post("/rental/properties", json={"name": "E2E rental", "units": [
        {"name": "Unit 1", "tenant": "E2E tenant", "monthly_rent": 1000, "status": "OCCUPIED",
         "rent_start_date": TODAY, "rent_due_day": 1},
    ]})
    assert rental.status_code == 200, rental.text
    payment = admin.post("/rental/payments", json={
        "property_id": rental.json()["id"], "property_name": "E2E rental", "unit": "Unit 1",
        "tenant": "E2E tenant", "period": TODAY[:7], "due_date": TODAY,
        "amount_due": 1000, "amount_received": 0,
    })
    assert payment.status_code == 200 and payment.json()["status"] == "PENDING"
    assert admin.post(f"/rental/payments/{payment.json()['id']}/acknowledge", json={"amount": 400}).json()["status"] == "PARTIAL"
    assert admin.post(f"/rental/payments/{payment.json()['id']}/acknowledge", json={"amount": 600}).json()["status"] == "COLLECTED"
    rental_summary = admin.get("/rental/summary").json()
    assert rental_summary["monthly_rent"] >= 1000

    recurring_property = admin.post("/rental/properties", json={"name": "E2E recurring-rent race", "units": [
        {"name": "Unit 31", "tenant": "E2E concurrent tenant", "monthly_rent": 900,
         "status": "OCCUPIED", "rent_start_date": TODAY, "rent_due_day": 31},
    ]})
    assert recurring_property.status_code == 200, recurring_property.text
    property_id = recurring_property.json()["id"]
    with ThreadPoolExecutor(max_workers=2) as executor:
        rent_responses = list(executor.map(
            lambda _: admin.get(f"/rental/payments?property_id={property_id}"),
            range(2),
        ))
    assert all(response.status_code == 200 for response in rent_responses)
    recurring_rows = admin.get(f"/rental/payments?property_id={property_id}").json()
    assert len(recurring_rows) == 1
    month_date = date.fromisoformat(TODAY)
    expected_due = month_date.replace(day=min(31, monthrange(month_date.year, month_date.month)[1]))
    assert recurring_rows[0]["due_date"] == expected_due.isoformat()

    today = datetime.now(timezone.utc).date().isoformat()
    farm_name = f"E2E calculation farm {uuid4().hex[:6]}"
    farm = admin.post("/farms", json={
        "name": farm_name, "number": f"E2E-{uuid4().hex[:6]}", "annual_rent_enabled": True,
        "annual_rent": 5000, "tenant": "E2E lease tenant", "lease_start_date": today,
        "annual_rent_due_date": today,
    })
    assert farm.status_code == 200, farm.text
    farm_id = farm.json()["id"]
    farm_payments = admin.get("/farms/rent-payments")
    assert farm_payments.status_code == 200, farm_payments.text
    farm_payment = next(row for row in farm_payments.json() if row["farm_id"] == farm_id)
    assert admin.post(f"/farms/rent-payments/{farm_payment['id']}/receive", json={"amount": 2000}).json()["status"] == "PARTIAL"
    assert admin.post(f"/farms/rent-payments/{farm_payment['id']}/receive", json={"amount": 3000}).json()["status"] == "COLLECTED"
    assert admin.get("/farms/summary").json()["annual_rent_received"] >= 5000

    leap_farm = admin.post("/farms", json={
        "name": "E2E leap-year lease", "annual_rent_enabled": True, "annual_rent": 1000,
        "lease_start_date": "2024-02-29", "annual_rent_due_date": "2024-02-29",
    })
    assert leap_farm.status_code == 200, leap_farm.text
    leap_payments = admin.get("/farms/rent-payments").json()
    dates_by_year = {
        row["period"]: row["due_date"]
        for row in leap_payments
        if row["farm_id"] == leap_farm.json()["id"]
    }
    assert dates_by_year["2024"] == "2024-02-29"
    assert dates_by_year["2025"] == "2025-02-28"
    assert dates_by_year["2026"] == "2026-02-28"

    recurring_farm = admin.post("/farms", json={
        "name": "E2E recurring-farm-rent race",
        "number": f"E2E-RACE-{uuid4().hex[:6]}",
        "annual_rent_enabled": True,
        "annual_rent": 1200,
        "lease_start_date": TODAY,
        "annual_rent_due_date": TODAY,
    })
    assert recurring_farm.status_code == 200, recurring_farm.text
    farm_id = recurring_farm.json()["id"]
    with ThreadPoolExecutor(max_workers=2) as executor:
        farm_rent_responses = list(executor.map(
            lambda _: admin.get("/farms/rent-payments"),
            range(2),
        ))
    assert all(response.status_code == 200 for response in farm_rent_responses)
    generated_farm_rows = [
        row for row in admin.get("/farms/rent-payments").json()
        if row["farm_id"] == farm_id
    ]
    assert len(generated_farm_rows) == 1


def test_projects_farms_family_and_party_portal_permissions(admin, client):
    seeded_party_login = client.post("/api/auth/login", json={
        "email": "architect@nivara.app", "password": "Architect@2026",
    })
    assert seeded_party_login.status_code == 200, seeded_party_login.text
    seeded_party_token = seeded_party_login.json()["access_token"]
    seeded_portal = client.get(
        "/api/party-portal",
        headers={"Authorization": f"Bearer {seeded_party_token}"},
    )
    assert seeded_portal.status_code == 200, seeded_portal.text
    assert seeded_portal.json()["party"]["name"] == "Arjun Design Studio"
    assert client.get(
        "/api/accounts",
        headers={"Authorization": f"Bearer {seeded_party_token}"},
    ).status_code == 403

    project = admin.post("/projects", json={"name": "E2E project", "budget": 10000, "status": "ACTIVE"})
    assert project.status_code == 200, project.text
    project_id = project.json()["id"]
    party = admin.post("/parties", json={
        "project_id": project_id, "name": "E2E Contractor", "party_type": "Civil Contractor",
        "contract_value": 3000,
    })
    assert party.status_code == 200, party.text
    party_id = party.json()["id"]
    assert admin.get(f"/projects/{project_id}").status_code == 200
    finance = admin.get(f"/projects/{project_id}/finance")
    assert finance.status_code == 200 and finance.json()["budget"] == 10000
    project_update = admin.put(f"/projects/{project_id}", json={"progress": 35, "budget": 11000})
    assert project_update.status_code == 200 and project_update.json()["budget"] == 11000

    work = admin.post("/work-logs", json={
        "project_id": project_id, "title": "E2E foundation", "date": TODAY,
        "status": "IN_PROGRESS", "progress": 50,
    })
    assert work.status_code == 200, work.text
    assert admin.put(f"/work-logs/{work.json()['id']}", json={"progress": 75}).status_code == 200
    assert admin.delete(f"/work-logs/{work.json()['id']}").status_code == 200

    login = party.json()["initial_login"]
    party_session = client.post("/api/auth/login", json=login)
    assert party_session.status_code == 200, party_session.text
    party_token = party_session.json()["access_token"]
    party_portal = client.get("/api/party-portal", headers={"Authorization": f"Bearer {party_token}"})
    assert party_portal.status_code == 200, party_portal.text
    assert party_portal.json()["party"]["id"] == party_id
    assert client.get("/api/accounts", headers={"Authorization": f"Bearer {party_token}"}).status_code == 403

    user = admin.post("/users", json={
        "name": "E2E Access User", "email": f"qa-access-{uuid4().hex[:8]}@nivara.local",
        "role": "PARTY_USER", "password": "LocalE2E-Only-2026!",
    })
    assert user.status_code == 200 and user.json()["initial_login"]["email"]
    user_id = user.json()["id"]
    assert admin.put(f"/users/{user_id}", json={"active": False}).status_code == 200
    assert admin.delete(f"/users/{user_id}").status_code == 200

    family = admin.post("/family", json={"name": "E2E family member", "relation": "Sibling"})
    assert family.status_code == 200, family.text
    assert admin.put(f"/family/{family.json()['id']}", json={"notes": "Updated"}).status_code == 200
    assert admin.delete(f"/family/{family.json()['id']}").status_code == 200
    assert admin.delete(f"/parties/{party_id}").status_code == 200
    assert admin.delete(f"/projects/{project_id}").status_code == 200


def test_external_party_login_isolation_and_project_offboarding(admin, client):
    seeded_sessions = []
    for email, password, expected_party in (
        ("architect@nivara.app", "Architect@2026", "Arjun Design Studio"),
        ("contractor.a@nivara.app", "Contractor@2026", "BuildRight Civil"),
    ):
        login = client.post("/api/auth/login", json={"email": email, "password": password})
        assert login.status_code == 200, login.text
        headers = {"Authorization": "Bearer " + login.json()["access_token"]}
        portal = client.get("/api/party-portal", headers=headers)
        assert portal.status_code == 200, portal.text
        assert portal.json()["party"]["name"] == expected_party
        assert portal.json()["payments"]
        assert all(payment["party_id"] == portal.json()["party"]["id"] for payment in portal.json()["payments"])
        assert client.get("/api/accounts", headers=headers).status_code == 403
        seeded_sessions.append((headers, portal.json()))
    assert seeded_sessions[0][1]["party"]["id"] != seeded_sessions[1][1]["party"]["id"]

    project = admin.post("/projects", json={"name": "E2E offboarding project", "budget": 10000})
    assert project.status_code == 200, project.text
    project_id = project.json()["id"]
    party = admin.post("/parties", json={
        "project_id": project_id, "name": "E2E Sample Contractor",
        "party_type": "Civil Contractor", "contract_value": 3000,
    })
    assert party.status_code == 200, party.text
    party_id = party.json()["id"]
    initial_login = party.json()["initial_login"]
    assert initial_login["email"].endswith("@nivara.com")
    party_login = client.post("/api/auth/login", json=initial_login)
    assert party_login.status_code == 200, party_login.text
    party_headers = {"Authorization": "Bearer " + party_login.json()["access_token"]}
    assert client.get("/api/party-portal", headers=party_headers).json()["party"]["id"] == party_id

    payment = admin.post("/transactions", json={
        "type": "EXPENSE", "date": TODAY, "amount": 450,
        "scope": "PROJECT", "project_id": project_id, "party": party.json()["name"],
        "category": "E2E progress payment", "payment_mode": "UPI", "utr_number": "E2E-UTR-1",
    })
    assert payment.status_code == 200, payment.text
    payment_id = payment.json()["id"]
    assert payment.json()["payment_status"] == "PENDING_PARTY_ACKNOWLEDGEMENT"
    updated_portal = client.get("/api/party-portal", headers=party_headers).json()
    assert any(row["id"] == payment_id for row in updated_portal["payments"])
    assert client.post(
        f"/api/party-portal/payments/{payment_id}/acknowledge",
        headers=seeded_sessions[0][0],
    ).status_code == 404
    acknowledged = client.post(
        f"/api/party-portal/payments/{payment_id}/acknowledge",
        headers=party_headers,
    )
    assert acknowledged.status_code == 200, acknowledged.text
    assert admin.get("/transactions").json()

    assert admin.delete(f"/projects/{project_id}").status_code == 200
    assert admin.get(f"/projects/{project_id}").status_code == 404
    assert admin.get(f"/projects/{project_id}/finance").status_code == 404
    assert admin.delete(f"/projects/{project_id}").status_code == 404
    assert client.get("/api/party-portal", headers=party_headers).status_code == 401
    assert client.get("/api/auth/me", headers=party_headers).status_code == 401
    inactive_login = client.post("/api/auth/login", json=initial_login)
    assert inactive_login.status_code == 403


def test_private_areas_notifications_errors_exports_and_import_review(admin, client, monkeypatch):
    assert admin.get("/losses").status_code == 423
    unlock = admin.post("/losses/unlock", json={"password": os.environ["LOSSES_PASSWORD"]})
    assert unlock.status_code == 200, unlock.text
    loss_headers = {"X-Loss-Token": unlock.json()["token"]}
    assert admin.get("/losses/meta", headers=loss_headers).status_code == 200
    loss = admin.post("/losses", headers=loss_headers, json={
        "date": TODAY, "amount": 250, "group": "Other", "category": "E2E loss",
    })
    assert loss.status_code == 200, loss.text
    assert admin.get("/losses/summary", headers=loss_headers).json()["total"] >= 250
    assert admin.put(f"/losses/{loss.json()['id']}", headers=loss_headers, json={"amount": 300}).status_code == 200
    assert admin.delete(f"/losses/{loss.json()['id']}", headers=loss_headers).status_code == 200
    diary = admin.post("/diary", headers=loss_headers, json={
        "title": "E2E private note", "date": TODAY, "body": "Private test fixture",
    })
    assert diary.status_code == 200, diary.text
    assert admin.put(f"/diary/{diary.json()['id']}", headers=loss_headers, json={"body": "Updated fixture"}).status_code == 200
    assert admin.delete(f"/diary/{diary.json()['id']}", headers=loss_headers).status_code == 200

    reminder = admin.post("/notifications/reminders", json={
        "title": "E2E test reminder", "due_date": NEXT_WEEK, "amount": 25,
    })
    assert reminder.status_code == 200, reminder.text
    reminders = admin.get("/notifications?status=ALL").json()["items"]
    reminder_row = next(row for row in reminders if row["title"] == "E2E test reminder")
    assert admin.post(f"/notifications/{reminder_row['id']}/acknowledge").json()["status"] == "ACKNOWLEDGED"

    logged = admin.post("/error-logs/client", json={
        "kind": "E2E", "message": f"local synthetic test error {uuid4().hex}", "route": "/e2e",
    })
    assert logged.status_code == 200
    assert admin.get("/error-logs/unread-count").json()["count"] > 0
    assert admin.post("/error-logs/mark-seen").status_code == 200

    import api_documents
    import api_proof
    objects = {}
    def fake_put(path, content, content_type):
        objects[path] = (content, content_type)
        return {"path": path, "size": len(content)}
    monkeypatch.setattr(api_documents, "put_object", fake_put)
    monkeypatch.setattr(api_documents, "get_object", lambda path: objects[path])
    monkeypatch.setattr(api_proof, "put_object", fake_put)
    party_login = client.post("/api/auth/login", json={
        "email": "architect@nivara.app", "password": "Architect@2026",
    })
    assert party_login.status_code == 200, party_login.text
    party_headers = {"Authorization": "Bearer " + party_login.json()["access_token"]}
    party_upload = client.post(
        "/api/documents",
        headers=party_headers,
        files={"file": ("architect-bill.pdf", b"%PDF-1.4 local E2E bill", "application/pdf")},
        data={"party_id": "another-party-id", "project_id": "another-project-id"},
    )
    assert party_upload.status_code == 200, party_upload.text
    seeded_party = client.get("/api/party-portal", headers=party_headers).json()["party"]
    assert party_upload.json()["party_id"] == seeded_party["id"]
    assert party_upload.json()["project_id"]
    assert party_upload.json()["related_entity_type"] == "party"
    party_docs = client.get("/api/documents", headers=party_headers).json()
    assert any(row["id"] == party_upload.json()["id"] for row in party_docs)
    contractor_login = client.post("/api/auth/login", json={
        "email": "contractor.a@nivara.app", "password": "Contractor@2026",
    })
    assert contractor_login.status_code == 200, contractor_login.text
    contractor_headers = {"Authorization": "Bearer " + contractor_login.json()["access_token"]}
    assert client.get("/api/documents", headers=contractor_headers).json() == []
    assert client.get(
        f"/api/documents/{party_upload.json()['id']}/download",
        headers=contractor_headers,
    ).status_code == 403
    assert any(row["id"] == party_upload.json()["id"] for row in client.get(
        "/api/party-portal", headers=party_headers
    ).json()["documents"])

    document = admin.post("/documents", files={"file": ("e2e.txt", b"Local dummy evidence", "text/plain")})
    assert document.status_code == 200, document.text
    document_id = document.json()["id"]
    assert admin.put(f"/documents/{document_id}", json={"filename": "renamed evidence"}).json()["filename"] == "renamed evidence.txt"
    downloaded = client.get(f"/api/documents/{document_id}/download", headers={"Authorization": f"Bearer {admin.token}"})
    assert downloaded.status_code == 200 and downloaded.content == b"Local dummy evidence"
    proof = admin.post("/proofs/extract", files={"file": ("e2e.pdf", b"%PDF-1.4", "application/pdf")})
    assert proof.status_code == 200 and proof.json()["review_required"] is True
    assert proof.json()["extraction"]["document_id"]
    assert admin.delete(f"/documents/{document_id}").status_code == 200

    csv_content = f"Symbol,ISIN,Quantity,Market Value\n{IMPORT_SYMBOL},{IMPORT_SYMBOL}ISIN,4,4000\n".encode()
    analyzed = admin.post("/imports/analyze", files={"file": (f"{IMPORT_SYMBOL}.csv", csv_content, "text/csv")})
    assert analyzed.status_code == 200, analyzed.text
    import_id = analyzed.json()["run_id"]
    assert analyzed.json()["candidates"][0]["kind"] == "HOLDING"
    repeated = admin.post("/imports/analyze", files={"file": (f"{IMPORT_SYMBOL}.csv", csv_content, "text/csv")})
    assert repeated.status_code == 200 and repeated.json()["status"] == "ALREADY_IMPORTED"
    committed = admin.post(f"/imports/{import_id}/commit", json={"row_numbers": [2], "owner": "Self"})
    assert committed.status_code == 200, committed.text
    assert committed.json()["summary"]["created"] == 1
    assert any(item["name"] == IMPORT_SYMBOL for item in admin.get("/investments").json())

    workbook = admin.get("/export?entity=transactions")
    assert workbook.status_code == 200 and workbook.content.startswith(b"PK")
