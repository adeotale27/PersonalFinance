"""Documents: upload, list, download via Emergent object storage."""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header, Query
from fastapi.responses import Response
from core import db, serialize, oid, now_utc, require_admin, get_current_user
from storage import put_object, get_object

router = APIRouter(tags=["documents"])

ALLOWED = {"pdf", "png", "jpg", "jpeg", "webp", "gif", "doc", "docx",
           "xls", "xlsx", "csv", "txt", "ppt", "pptx", "heic"}
MAX_SIZE = 25 * 1024 * 1024


@router.get("/documents")
async def list_documents(category: str = None, related_entity_id: str = None, folder: str = None,
                         financial_year: str = None, family_member_id: str = None, project_id: str = None,
                         user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    if category: q["category"] = category
    if related_entity_id: q["related_entity_id"] = related_entity_id
    if folder: q["folder"] = folder
    if financial_year: q["financial_year"] = financial_year
    if family_member_id: q["family_member_id"] = family_member_id
    if project_id: q["project_id"] = project_id
    docs = await db.documents.find(q).sort([("created_at", -1)]).to_list(1000)
    return [serialize(d) for d in docs]


@router.get("/documents/link-options")
async def document_link_options(user: dict = Depends(require_admin)):
    """Small, stable lookup list for attaching evidence to an exact record."""
    sources = (("loans", "loans", "name"), ("insurance", "insurance", "policy_name"), ("farms", "farms", "name"), ("rental_property", "rental_properties", "name"), ("lending", "lendings", "counterparty"), ("asset", "assets", "name"))
    options = []
    for entity_type, collection, label in sources:
        for row in await db[collection].find({"deleted_at": {"$exists": False}}).to_list(1000):
            options.append({"type": entity_type, "id": str(row["_id"]), "label": row.get(label) or entity_type.replace("_", " ").title()})
    return options


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("Other"),
    folder: str = Form(None),
    official: str = Form(None),
    financial_year: str = Form(None),
    related_entity_type: str = Form(None),
    related_entity_id: str = Form(None),
    project_id: str = Form(None),
    family_member_id: str = Form(None),
    display_name: str = Form(None),
    notes: str = Form(""),
    user: dict = Depends(require_admin),
):
    # A linked document is intentionally explicit. A record ID without its type
    # is ambiguous across household ledgers and would make later integrations
    # unsafe to reconcile.
    if bool(related_entity_type) != bool(related_entity_id):
        raise HTTPException(status_code=422, detail="Choose both a related record type and record ID when linking a document")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type .{ext or '(none)'} not allowed")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    path = f"nivara/uploads/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, content, content_type)
    base = display_name or file.filename
    if display_name and ext and not display_name.lower().endswith("." + ext):
        base = f"{display_name}.{ext}"
    doc = {
        "filename": base,
        "ext": ext,
        "content_type": content_type,
        "size": result.get("size", len(content)),
        "category": category,
        "folder": folder,
        "official": (official == "true") if official is not None else None,
        "financial_year": financial_year,
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
        "project_id": project_id,
        "family_member_id": family_member_id,
        "storage_path": result["path"],
        "notes": notes,
        "uploaded_by": user["email"],
        "created_at": now_utc(),
    }
    res = await db.documents.insert_one(doc)
    return serialize(await db.documents.find_one({"_id": res.inserted_id}))


@router.put("/documents/{item_id}")
async def rename_document(item_id: str, payload: dict, user: dict = Depends(require_admin)):
    doc = await db.documents.find_one({"_id": oid(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    update = {}
    if "filename" in payload and payload["filename"]:
        name = payload["filename"]
        ext = doc.get("ext")
        if ext and "." not in name:
            name = f"{name}.{ext}"
        elif ext and not name.lower().endswith("." + ext):
            name = f"{name.rsplit('.', 1)[0]}.{ext}"
        update["filename"] = name
    for k in ("category", "folder", "notes", "financial_year", "official"):
        if k in payload:
            update[k] = payload[k]
    update["updated_at"] = now_utc()
    await db.documents.update_one({"_id": oid(item_id)}, {"$set": update})
    return serialize(await db.documents.find_one({"_id": oid(item_id)}))


@router.get("/documents/{item_id}/download")
async def download_document(item_id: str, authorization: str = Header(None), auth: str = Query(None)):
    import jwt
    from core import get_jwt_secret, JWT_ALGORITHM
    token = auth or (authorization[7:] if authorization and authorization.startswith("Bearer ") else None)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    doc = await db.documents.find_one({"_id": oid(item_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    data, content_type = get_object(doc["storage_path"])
    return Response(content=data, media_type=doc.get("content_type") or content_type)


@router.delete("/documents/{item_id}")
async def delete_document(item_id: str, user: dict = Depends(require_admin)):
    await db.documents.update_one({"_id": oid(item_id)}, {"$set": {"deleted_at": now_utc()}})
    return {"status": "deleted"}
