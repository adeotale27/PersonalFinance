"""Authentication routes."""
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from core import (
    db, serialize, now_utc, hash_password, verify_password,
    create_access_token, get_current_user, log_audit,
)

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_ATTEMPTS = 5
LOCK_MINUTES = 15


def _set_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=7 * 24 * 3600, path="/",
    )


@router.post("/login")
async def login(payload: dict, response: Response, request: Request):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    ip = request.client.host if request.client else "unknown"
    ident = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": ident})
    if attempt and attempt.get("count", 0) >= MAX_ATTEMPTS:
        locked_until = attempt.get("locked_until")
        if locked_until and locked_until > now_utc():
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("password_hash", "")):
        from datetime import timedelta
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"locked_until": now_utc() + timedelta(minutes=LOCK_MINUTES)}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is inactive")

    await db.login_attempts.delete_one({"identifier": ident})
    token = create_access_token(str(user["_id"]), user["email"])
    _set_cookie(response, token)
    await log_audit(user, "login", "auth", str(user["_id"]))
    return {"user": serialize(user), "access_token": token, "token_type": "bearer"}


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    return {"status": "ok"}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize(user)
