from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.analysis import AnalysisRequest
from app.services.analysis_service import (
    create_analysis,
    get_analysis,
    list_analyses,
    list_user_analyses,
    rerun_analysis
)

router = APIRouter(prefix="/analyses", tags=["分析"])


@router.get("", summary="获取全部分析记录")
def get_analyses(db: Session = Depends(get_db)):
    return list_analyses(db)


@router.get("/my", summary="获取当前用户的分析记录")
def get_my_analyses(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    return list_user_analyses(db, user)


@router.get("/{analysis_id}", summary="获取单条分析结果")
def get_analysis_by_id(analysis_id: str, db: Session = Depends(get_db)):
    analysis = get_analysis(db, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="未找到对应分析记录")
    return analysis


@router.post("", summary="创建新的分析任务")
def post_analysis(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        return create_analysis(db, request, user)
    except RuntimeError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc


@router.post("/{analysis_id}/rerun", summary="按最新逻辑重演分析")
def post_analysis_rerun(
    analysis_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        analysis = rerun_analysis(db, analysis_id, user)
    except RuntimeError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    if analysis is None:
        raise HTTPException(status_code=404, detail="未找到对应分析记录")
    return analysis
