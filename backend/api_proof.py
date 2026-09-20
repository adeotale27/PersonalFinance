"""Payment-proof upload and safe, review-first extraction."""
import re
import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from core import db, serialize, now_utc, require_admin
from storage import put_object

router = APIRouter(tags=["proof"])

def extract_payment_fields(text: str) -> dict:
    amount_match = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)", text, re.I)
    ref_match = re.search(r"(?:utr|ref(?:erence)?|txn|transaction)\s*(?:id|no)?\s*[:#-]?\s*([A-Z0-9-]{6,})", text, re.I)
    date_match = re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b", text)
    method = "UPI" if re.search(r"\bupi\b", text, re.I) else "NEFT" if re.search(r"\bneft\b", text, re.I) else "IMPS" if re.search(r"\bimps\b", text, re.I) else "BANK_TRANSFER"
    return {"amount": float(amount_match.group(1).replace(",", "")) if amount_match else None, "date_raw": date_match.group(1) if date_match else None, "transaction_reference": ref_match.group(1) if ref_match else None, "payment_mode": method, "confidence": 85 if amount_match else 35}

@router.post("/proofs/extract")
async def extract_proof(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in {"png", "jpg", "jpeg", "webp", "pdf"}: raise HTTPException(status_code=400, detail="Upload a payment image or PDF")
    content = await file.read()
    if len(content) > 25 * 1024 * 1024: raise HTTPException(status_code=400, detail="File too large (max 25MB)")
    path = f"nivara/proofs/{uuid.uuid4().hex}.{ext}"
    result = put_object(path, content, file.content_type or "application/octet-stream")
    text = ""
    if ext != "pdf":
        try:
            import pytesseract
            from PIL import Image
            from io import BytesIO
            text = pytesseract.image_to_string(Image.open(BytesIO(content)))
        except Exception:
            pass
    fields = extract_payment_fields(text)
    doc = {"filename": file.filename or "payment-proof", "ext": ext, "content_type": file.content_type, "size": result.get("size", len(content)), "category": "Payment Proof", "storage_path": result["path"], "ocr_text": text[:5000], "extraction": fields, "uploaded_by": user["email"], "created_at": now_utc()}
    created = await db.documents.insert_one(doc)
    fields["document_id"] = str(created.inserted_id)
    return {"extraction": fields, "review_required": True}
