from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.account import CreateMemberRequest, CreateMemberResponse
from app.services.account_service import (
    create_organization_member,
    get_account_overview,
    get_current_user as get_current_user_record,
    get_active_subscription,
    list_organization_members,
    list_plans,
    list_recent_audits,
    list_recent_orders
)
from app.services.repository import repository

router = APIRouter(tags=["账户"])


@router.get("/me", summary="获取当前账号")
def get_me(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    return get_current_user_record(db, user.id)


@router.get("/plans", summary="获取会员套餐列表")
def get_membership_plans(db: Session = Depends(get_db)):
    return list_plans(db)


@router.get("/account/overview", summary="获取当前账号工作台概览")
def get_overview(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    return get_account_overview(db, user)


@router.get("/account/members", summary="获取组织成员列表")
def get_members(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    membership = repository.get_primary_membership(db, user.id)
    organization_id = membership.organization_id if membership is not None else None
    return list_organization_members(db, organization_id)


@router.post("/account/members", summary="创建组织成员", response_model=CreateMemberResponse)
def post_member(
    payload: CreateMemberRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        member = create_organization_member(db, user, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CreateMemberResponse(message="成员已加入组织", member=member)


@router.get("/account/orders", summary="获取最近订单")
def get_orders(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    membership = repository.get_primary_membership(db, user.id)
    organization_id = membership.organization_id if membership is not None else None
    return list_recent_orders(db, organization_id)


@router.get("/account/audits", summary="获取最近审计日志")
def get_audits(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    membership = repository.get_primary_membership(db, user.id)
    organization_id = membership.organization_id if membership is not None else None
    return list_recent_audits(db, organization_id)


@router.get("/account/subscription", summary="获取当前订阅")
def get_subscription(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    subscription = get_active_subscription(db, user)
    if subscription is None:
        raise HTTPException(status_code=404, detail="当前组织尚未开通订阅")
    return subscription
