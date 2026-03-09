from fastapi import Depends, Header, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.db_models import UserModel
from app.services.auth_service import get_user_by_session_token
from app.services.account_service import get_user_model


def get_current_user(
    db: Session = Depends(get_db),
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_demo_user: str | None = Header(default=None, alias="X-Demo-User"),
    access_token: str | None = Query(default=None, alias="access_token")
) -> UserModel:
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
    elif access_token:
        token = access_token.strip()

    if token:
        user = get_user_by_session_token(db, token)
        if user is not None:
            return user
        raise HTTPException(status_code=401, detail="登录状态已失效，请重新登录")

    if x_demo_user and settings.enable_demo_auth:
        try:
            return get_user_model(db, x_demo_user)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

    raise HTTPException(status_code=401, detail="请先登录后再继续。")


def require_admin(user: UserModel = Depends(get_current_user)) -> UserModel:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="当前账号无后台访问权限")
    return user
