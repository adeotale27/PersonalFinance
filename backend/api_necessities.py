"""Personal necessities deliberately excluded from assets and liabilities."""
from fastapi import APIRouter
from crud import make_crud_router

router = APIRouter(tags=["necessities"])
crud, coll = make_crud_router("necessities", "necessities")
router.include_router(crud)
