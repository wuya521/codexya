from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.account import (
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthSessionRecord,
    LogoutResponse
)
from app.services.account_service import get_current_user as get_current_user_record
from app.services.auth_service import (
    list_demo_logins,
    login_user,
    logout_user,
    register_user
)

router = APIRouter(prefix="/auth", tags=["鉴权"])


@router.get("/demo-users", summary="列出本地演示登录账号")
def get_demo_users(db: Session = Depends(get_db)):
    return list_demo_logins(db)


@router.post("/register", summary="注册账号", response_model=AuthSessionRecord)
def post_register(payload: AuthRegisterRequest, db: Session = Depends(get_db)):
    try:
        user, session = register_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return AuthSessionRecord(
        access_token=session.id,
        expires_at=session.expires_at,
        user=get_current_user_record(db, user.id)
    )


@router.post("/login", summary="密码登录", response_model=AuthSessionRecord)
def post_login(payload: AuthLoginRequest, db: Session = Depends(get_db)):
    try:
        user, session = login_user(db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    return AuthSessionRecord(
        access_token=session.id,
        expires_at=session.expires_at,
        user=get_current_user_record(db, user.id)
    )


@router.get("/session", summary="获取当前登录会话")
def get_session(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    return get_current_user_record(db, user.id)


@router.post("/logout", summary="退出登录", response_model=LogoutResponse)
def post_logout(
    authorization: str | None = Header(default=None, alias="Authorization"),
    _: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if authorization and authorization.lower().startswith("bearer "):
        logout_user(db, authorization.split(" ", 1)[1].strip())
    return LogoutResponse(message="已退出登录")
