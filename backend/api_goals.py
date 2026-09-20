"""Savings and life goals, intentionally kept independent of asset/liability totals."""
from fastapi import APIRouter
from crud import make_crud_router

router = APIRouter(tags=["goals"])
crud, coll = make_crud_router("goals", "goals")
router.include_router(crud)
