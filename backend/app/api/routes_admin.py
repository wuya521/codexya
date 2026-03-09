from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import require_admin
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.account import (
    AdminRedemptionCodeCreateRequest,
    AdminRedemptionCodeUpdateRequest,
    AdminPlanUpdateRequest,
    AdminUserCreateRequest,
    AdminUserUpdateRequest
)
from app.services.admin_service import (
    create_admin_redemption_codes,
    create_admin_user,
    delete_admin_redemption_code,
    delete_admin_user,
    get_admin_overview,
    list_admin_analysis_jobs,
    list_admin_audits,
    list_admin_orders,
    list_admin_organizations,
    list_admin_plans,
    list_admin_redemption_codes,
    list_admin_users,
    update_admin_redemption_code,
    update_admin_plan,
    update_admin_user
)

router = APIRouter(prefix="/admin", tags=["后台"])


@router.get("/overview", summary="获取后台总览")
def get_overview(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return get_admin_overview(db)


@router.get("/users", summary="获取后台用户列表")
def get_users(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_users(db)


@router.post("/users", summary="创建后台用户")
def post_user(
    payload: AdminUserCreateRequest,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return create_admin_user(db, admin, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/users/{user_id}", summary="更新后台用户配置")
def patch_user(
    user_id: str,
    payload: AdminUserUpdateRequest,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return update_admin_user(db, admin, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/users/{user_id}", summary="删除后台用户")
def remove_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return delete_admin_user(db, admin, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/organizations", summary="获取组织列表")
def get_organizations(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_organizations(db)


@router.get("/plans", summary="获取套餐列表")
def get_plans(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_plans(db)


@router.get("/redemption-codes", summary="获取兑换码列表")
def get_redemption_codes(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_redemption_codes(db)


@router.post("/redemption-codes", summary="创建兑换码")
def post_redemption_codes(
    payload: AdminRedemptionCodeCreateRequest,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return create_admin_redemption_codes(db, admin, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/redemption-codes/{redemption_code_id}", summary="更新兑换码")
def patch_redemption_code(
    redemption_code_id: str,
    payload: AdminRedemptionCodeUpdateRequest,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return update_admin_redemption_code(db, admin, redemption_code_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/redemption-codes/{redemption_code_id}", summary="删除兑换码")
def remove_redemption_code(
    redemption_code_id: str,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        delete_admin_redemption_code(db, admin, redemption_code_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"message": "兑换码已删除"}


@router.patch("/plans/{plan_id}", summary="更新套餐额度与配置")
def patch_plan(
    plan_id: str,
    payload: AdminPlanUpdateRequest,
    db: Session = Depends(get_db),
    admin: UserModel = Depends(require_admin)
):
    try:
        return update_admin_plan(db, admin, plan_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/jobs", summary="获取异步任务列表")
def get_jobs(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_analysis_jobs(db, limit=100)


@router.get("/orders", summary="获取订单列表")
def get_orders(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_orders(db)


@router.get("/audits", summary="获取审计日志")
def get_audits(
    db: Session = Depends(get_db),
    _: UserModel = Depends(require_admin)
):
    return list_admin_audits(db)
