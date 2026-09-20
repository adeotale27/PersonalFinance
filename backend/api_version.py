"""Publicly readable release metadata for the in-product What's New panel."""
import json
from pathlib import Path
from fastapi import APIRouter, Depends
from core import require_admin

router = APIRouter(tags=["version"])
_PATH = Path(__file__).with_name("version_history.json")

def release_history():
    with _PATH.open(encoding="utf-8") as handle:
        return json.load(handle)

@router.get("/version-history")
async def version_history(user: dict = Depends(require_admin)):
    return release_history()
