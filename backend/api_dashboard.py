"""Dashboard aggregation: overview & cash flow."""
from collections import defaultdict
from fastapi import APIRouter, Depends
from core import db, serialize, now_utc, require_admin, round2
from api_wealth import networth_data

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/overview")
async def overview(user: dict = Depends(require_admin)):
    nw = await networth_data()
    now = now_utc()
    this_month = now.strftime("%Y-%m")

    txns = await db.transactions.find({"deleted_at": {"$exists": False}}).to_list(50000)
    month_income = month_expense = 0.0
    income_by_cat = defaultdict(float)
    expense_by_cat = defaultdict(float)
    monthly = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    project_spend = 0.0
    for t in txns:
        amt = round2(t.get("amount", 0))
        mk = (t.get("date") or "")[:7]
        if t.get("type") == "INCOME":
            if mk:
                monthly[mk]["in"] += amt
            if mk == this_month:
                month_income += amt
            income_by_cat[t.get("source") or "Other"] += amt
        elif t.get("type") == "EXPENSE":
            if mk:
                monthly[mk]["out"] += amt
            if mk == this_month:
                month_expense += amt
            expense_by_cat[t.get("category") or "Other"] += amt
            if t.get("project_id"):
                project_spend += amt

    # lending / borrowing outstanding
    def outstanding(direction):
        total = 0.0
        return total
    lends = await db.lendings.find({"deleted_at": {"$exists": False}}).to_list(2000)
    lend_out = borrow_out = 0.0
    overdue_lend = 0.0
    today = now.date().isoformat()
    for l in lends:
        principal = round2(l.get("amount", 0))
        paid = round2(sum(round2(r.get("amount", 0)) for r in l.get("repayments", []) or []))
        out = max(principal - paid, 0)
        if l.get("direction") == "LENT":
            lend_out += out
            if out > 0 and l.get("due_date") and l.get("due_date") < today:
                overdue_lend += out
        else:
            borrow_out += out

    # rental outstanding
    rent_payments = await db.rent_payments.find({"deleted_at": {"$exists": False}}).to_list(5000)
    unpaid_rent = round2(sum(max(round2(p.get("amount_due", 0)) - round2(p.get("amount_received", 0)), 0)
                             for p in rent_payments if p.get("status") != "COLLECTED"))
    month_rent_collected = round2(sum(round2(p.get("amount_received", 0)) for p in rent_payments if p.get("period") == this_month))

    # projects
    projects = await db.projects.find({"deleted_at": {"$exists": False}}).to_list(500)
    active_projects = len([p for p in projects if p.get("status") == "ACTIVE"])
    total_budget = round2(sum(round2(p.get("budget", 0)) for p in projects))

    # attention items
    attention = []
    if overdue_lend > 0:
        attention.append({"type": "overdue_lending", "label": "Overdue money lent", "value": round2(overdue_lend), "path": "/lending"})
    if unpaid_rent > 0:
        attention.append({"type": "unpaid_rent", "label": "Outstanding rent to collect", "value": unpaid_rent, "path": "/rental"})
    if borrow_out > 0:
        attention.append({"type": "borrowing", "label": "Outstanding borrowings", "value": round2(borrow_out), "path": "/lending?tab=borrowing"})
    for p in projects:
        spent = round2(sum(round2(t.get("amount", 0)) for t in txns if t.get("project_id") == str(p["_id"]) and t.get("type") == "EXPENSE"))
        if p.get("budget", 0) and spent > round2(p.get("budget", 0)):
            attention.append({"type": "budget_overrun", "label": f"Budget overrun: {p.get('name')}", "value": round2(spent - p.get("budget", 0)), "path": "/projects"})

    # recent activity
    audits = await db.audit_events.find({}).sort([("timestamp", -1)]).to_list(12)
    recent = [serialize(a) for a in audits]

    from datetime import date as _date
    ins = await db.insurance.find({"deleted_at": {"$exists": False}}).to_list(500)
    for pol in ins:
        rd = pol.get("renewal_date")
        if rd:
            try:
                y, m, dd = [int(x) for x in rd[:10].split("-")]
                days = (_date(y, m, dd) - now.date()).days
                if 0 <= days <= 60:
                    attention.append({"type": "insurance_renewal", "label": f"{pol.get('policy_name')} renewal in {days}d", "value": round2(pol.get("premium", 0)), "path": "/insurance"})
            except Exception:
                pass

    return {
        "net_worth": nw["net_worth"],
        "total_assets": nw["total_assets"],
        "total_liabilities": nw["total_liabilities"],
        "cash": nw["breakdown"]["cash"],
        "bank": nw["breakdown"]["bank"],
        "savings": nw["breakdown"]["savings"],
        "pf_ppf": nw["breakdown"]["pf_ppf"],
        "investments": nw["breakdown"]["investments"],
        "lending_outstanding": round2(lend_out),
        "borrowing_outstanding": round2(borrow_out),
        "month_income": round2(month_income),
        "month_expense": round2(month_expense),
        "month_savings": round2(month_income - month_expense),
        "month_rent_collected": month_rent_collected,
        "project_spend": round2(project_spend),
        "active_projects": active_projects,
        "total_projects": len(projects),
        "total_budget": total_budget,
        "cash_flow": [{"month": k, "in": round2(v["in"]), "out": round2(v["out"]),
                       "net": round2(v["in"] - v["out"])} for k, v in sorted(monthly.items())][-12:],
        "income_breakdown": [{"name": k, "value": round2(v)} for k, v in sorted(income_by_cat.items(), key=lambda x: -x[1])[:8]],
        "expense_breakdown": [{"name": k, "value": round2(v)} for k, v in sorted(expense_by_cat.items(), key=lambda x: -x[1])[:8]],
        "allocation": nw["allocation"],
        "attention": attention,
        "recent_activity": recent,
    }


@router.get("/dashboard/cashflow")
async def cashflow(period: str = "monthly", user: dict = Depends(require_admin)):
    txns = await db.transactions.find({"deleted_at": {"$exists": False}}).to_list(50000)

    def bucket(date_str):
        if not date_str:
            return None
        if period == "yearly":
            return date_str[:4]
        if period == "quarterly":
            y = date_str[:4]
            m = int(date_str[5:7] or 1)
            return f"{y}-Q{(m - 1) // 3 + 1}"
        return date_str[:7]

    series = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    total_in = total_out = 0.0
    for t in txns:
        b = bucket(t.get("date"))
        if not b:
            continue
        amt = round2(t.get("amount", 0))
        if t.get("type") == "INCOME":
            series[b]["in"] += amt
            total_in += amt
        elif t.get("type") == "EXPENSE":
            series[b]["out"] += amt
            total_out += amt
    return {
        "total_in": round2(total_in),
        "total_out": round2(total_out),
        "net": round2(total_in - total_out),
        "series": [{"period": k, "in": round2(v["in"]), "out": round2(v["out"]),
                    "net": round2(v["in"] - v["out"])} for k, v in sorted(series.items())],
    }
