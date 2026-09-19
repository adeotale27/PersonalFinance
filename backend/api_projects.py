"""Projects & Parties + project finance."""
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException
from core import db, serialize, oid, now_utc, require_admin, round2

router = APIRouter(tags=["projects"])


@router.get("/projects")
async def list_projects(user: dict = Depends(require_admin)):
    docs = await db.projects.find({"deleted_at": {"$exists": False}}).sort([("created_at", -1)]).to_list(500)
    out = []
    for p in docs:
        pid = str(p["_id"])
        txns = await db.transactions.find({"project_id": pid, "deleted_at": {"$exists": False}}).to_list(20000)
        spent = round2(sum(round2(t.get("amount", 0)) for t in txns if t.get("type") == "EXPENSE"))
        received = round2(sum(round2(t.get("amount", 0)) for t in txns if t.get("type") == "INCOME"))
        d = serialize(p)
        d["spent"] = spent
        d["received"] = received
        d["remaining"] = round2(round2(d.get("budget", 0)) - spent)
        out.append(d)
    return out


@router.post("/projects")
async def create_project(payload: dict, user: dict = Depends(require_admin)):
    payload["budget"] = round2(payload.get("budget", 0))
    payload.setdefault("status", "PLANNING")
    payload.setdefault("currency", "INR")
    payload.setdefault("progress", 0)
    payload["created_at"] = now_utc()
    res = await db.projects.insert_one(payload)
    return serialize(await db.projects.find_one({"_id": res.inserted_id}))


@router.get("/projects/{item_id}")
async def get_project(item_id: str, user: dict = Depends(require_admin)):
    p = await db.projects.find_one({"_id": oid(item_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return serialize(p)


@router.put("/projects/{item_id}")
async def update_project(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    payload.pop("spent", None); payload.pop("received", None); payload.pop("remaining", None)
    if "budget" in payload:
        payload["budget"] = round2(payload["budget"])
    payload["updated_at"] = now_utc()
    await db.projects.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.projects.find_one({"_id": oid(item_id)}))


@router.delete("/projects/{item_id}")
async def delete_project(item_id: str, user: dict = Depends(require_admin)):
    await db.projects.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


@router.get("/projects/{item_id}/finance")
async def project_finance(item_id: str, user: dict = Depends(require_admin)):
    p = await db.projects.find_one({"_id": oid(item_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    budget = round2(p.get("budget", 0))
    txns = await db.transactions.find({"project_id": item_id, "deleted_at": {"$exists": False}}).to_list(20000)
    spent = round2(sum(round2(t.get("amount", 0)) for t in txns if t.get("type") == "EXPENSE"))
    received = round2(sum(round2(t.get("amount", 0)) for t in txns if t.get("type") == "INCOME"))
    parties = await db.parties.find({"project_id": item_id, "deleted_at": {"$exists": False}}).to_list(500)
    committed = round2(sum(round2(pt.get("contract_value", 0)) for pt in parties))
    by_category = defaultdict(float)
    by_party = defaultdict(float)
    monthly = defaultdict(lambda: {"in": 0.0, "out": 0.0})
    for t in txns:
        amt = round2(t.get("amount", 0))
        mk = (t.get("date") or "")[:7]
        if t.get("type") == "EXPENSE":
            by_category[t.get("category") or "Miscellaneous"] += amt
            by_party[t.get("party") or "Direct"] += amt
            if mk:
                monthly[mk]["out"] += amt
        elif t.get("type") == "INCOME" and mk:
            monthly[mk]["in"] += amt
    return {
        "budget": budget,
        "received": received,
        "spent": spent,
        "committed": committed,
        "outstanding": round2(committed - spent) if committed > spent else 0,
        "available": round2(received - spent),
        "remaining_budget": round2(budget - spent),
        "variance": round2(budget - spent),
        "utilization": round2((spent / budget * 100) if budget > 0 else 0),
        "cost_by_category": [{"name": k, "value": round2(v)} for k, v in sorted(by_category.items(), key=lambda x: -x[1])],
        "cost_by_party": [{"name": k, "value": round2(v)} for k, v in sorted(by_party.items(), key=lambda x: -x[1])],
        "monthly": [{"month": k, "in": round2(v["in"]), "out": round2(v["out"])} for k, v in sorted(monthly.items())],
    }


# ---------------- parties ----------------
@router.get("/parties")
async def list_parties(project_id: str = None, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    if project_id:
        q["project_id"] = project_id
    docs = await db.parties.find(q).sort([("created_at", -1)]).to_list(1000)
    out = []
    for pt in docs:
        d = serialize(pt)
        txns = await db.transactions.find({"party": d.get("name"), "project_id": d.get("project_id"), "type": "EXPENSE", "deleted_at": {"$exists": False}}).to_list(5000)
        d["paid"] = round2(sum(round2(t.get("amount", 0)) for t in txns))
        d["outstanding"] = round2(round2(d.get("contract_value", 0)) - d["paid"])
        out.append(d)
    return out


@router.post("/parties")
async def create_party(payload: dict, user: dict = Depends(require_admin)):
    payload["contract_value"] = round2(payload.get("contract_value", 0))
    payload["created_at"] = now_utc()
    res = await db.parties.insert_one(payload)
    return serialize(await db.parties.find_one({"_id": res.inserted_id}))


@router.put("/parties/{item_id}")
async def update_party(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    payload.pop("paid", None); payload.pop("outstanding", None)
    if "contract_value" in payload:
        payload["contract_value"] = round2(payload["contract_value"])
    payload["updated_at"] = now_utc()
    await db.parties.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.parties.find_one({"_id": oid(item_id)}))


@router.delete("/parties/{item_id}")
async def delete_party(item_id: str, user: dict = Depends(require_admin)):
    await db.parties.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}


# ---------------- work logs ----------------
@router.get("/work-logs")
async def list_work_logs(project_id: str = None, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    if project_id:
        q["project_id"] = project_id
    docs = await db.work_logs.find(q).sort([("date", -1)]).to_list(2000)
    return [serialize(d) for d in docs]


@router.post("/work-logs")
async def create_work_log(payload: dict, user: dict = Depends(require_admin)):
    payload.setdefault("status", "IN_PROGRESS")
    payload.setdefault("photos", [])
    payload.setdefault("date", now_utc().date().isoformat())
    payload["created_at"] = now_utc()
    res = await db.work_logs.insert_one(payload)
    return serialize(await db.work_logs.find_one({"_id": res.inserted_id}))


@router.put("/work-logs/{item_id}")
async def update_work_log(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    payload.pop("id", None); payload.pop("_id", None)
    payload["updated_at"] = now_utc()
    await db.work_logs.update_one({"_id": oid(item_id)}, {"$set": payload})
    return serialize(await db.work_logs.find_one({"_id": oid(item_id)}))


@router.delete("/work-logs/{item_id}")
async def delete_work_log(item_id: str, user: dict = Depends(require_admin)):
    await db.work_logs.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}
