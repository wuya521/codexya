from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.db_models import UserModel
from app.schemas.analysis import AnalysisRequest
from app.services.analysis_job_service import (
    enqueue_analysis_job,
    enqueue_rerun_job,
    get_analysis_job_for_user,
    list_user_analysis_jobs,
    stream_analysis_job_events
)

router = APIRouter(prefix="/analysis-jobs", tags=["异步任务"])


@router.post("", summary="创建新的异步推演任务")
def post_analysis_job(
    request: AnalysisRequest,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        return enqueue_analysis_job(db, user, request)
    except RuntimeError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/rerun/{analysis_id}", summary="创建重演任务")
def post_rerun_job(
    analysis_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        return enqueue_rerun_job(db, user, analysis_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/my", summary="获取当前用户的任务列表")
def get_my_jobs(
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    return list_user_analysis_jobs(db, user)


@router.get("/{job_id}", summary="获取任务详情")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    try:
        job = get_analysis_job_for_user(db, user, job_id)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if job is None:
        raise HTTPException(status_code=404, detail="未找到对应任务。")
    return job


@router.get("/{job_id}/events", summary="订阅任务实时事件")
def get_job_events(
    job_id: str,
    user: UserModel = Depends(get_current_user)
):
    stream = stream_analysis_job_events(
        job_id=job_id,
        user_id=user.id,
        is_admin=user.role == "admin"
    )
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
