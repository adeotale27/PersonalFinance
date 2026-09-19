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
async def list_documents(category: str = None, related_entity_id: str = None, user: dict = Depends(require_admin)):
    q = {"deleted_at": {"$exists": False}}
    if category:
        q["category"] = category
    if related_entity_id:
        q["related_entity_id"] = related_entity_id
    docs = await db.documents.find(q).sort([("created_at", -1)]).to_list(1000)
    return [serialize(d) for d in docs]


@router.post("/documents")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("Other"),
    related_entity_type: str = Form(None),
    related_entity_id: str = Form(None),
    project_id: str = Form(None),
    notes: str = Form(""),
    user: dict = Depends(require_admin),
):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else ""
    if ext not in ALLOWED:
        raise HTTPException(status_code=400, detail=f"File type .{ext or '(none)'} not allowed")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    path = f"nivara/uploads/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "application/octet-stream"
    result = put_object(path, content, content_type)
    doc = {
        "filename": file.filename,
        "content_type": content_type,
        "size": result.get("size", len(content)),
        "category": category,
        "related_entity_type": related_entity_type,
        "related_entity_id": related_entity_id,
        "project_id": project_id,
        "storage_path": result["path"],
        "notes": notes,
        "uploaded_by": user["email"],
        "created_at": now_utc(),
    }
    res = await db.documents.insert_one(doc)
    return serialize(await db.documents.find_one({"_id": res.inserted_id}))


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
