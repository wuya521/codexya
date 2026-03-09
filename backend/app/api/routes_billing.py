from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.account import SwitchPlanRequest, SwitchPlanResponse
from app.services.account_service import get_active_subscription, list_recent_orders, switch_plan
from app.services.repository import repository

router = APIRouter(prefix="/billing", tags=["计费"])


@router.get("/orders", summary="获取当前组织订单列表")
def get_billing_orders(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    membership = repository.get_primary_membership(db, user.id)
    organization_id = membership.organization_id if membership is not None else None
    return list_recent_orders(db, organization_id, limit=50)


@router.get("/subscription", summary="获取当前订阅")
def get_billing_subscription(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    subscription = get_active_subscription(db, user)
    if subscription is None:
        raise HTTPException(status_code=404, detail="当前组织尚未开通订阅")
    return subscription


@router.post("/switch-plan", summary="切换套餐", response_model=SwitchPlanResponse)
def post_switch_plan(
    payload: SwitchPlanRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        updated_user, subscription, order = switch_plan(
            db,
            user,
            payload.plan_id,
            payload.billing_cycle
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SwitchPlanResponse(
        message=f"套餐已切换到 {updated_user.plan.name}",
        user=updated_user,
        subscription=subscription,
        order=order
    )
