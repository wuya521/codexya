from collections.abc import Iterator
from datetime import datetime, timezone
from queue import Empty, Queue
from threading import Event, Lock, Thread
from time import sleep
from uuid import uuid4

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.db_models import AnalysisJobModel, AuditLogModel, UserModel
from app.schemas.analysis import AnalysisJobEvent, AnalysisJobRecord, AnalysisRequest
from app.services.account_service import ensure_analysis_quota
from app.services.analysis_service import create_analysis
from app.services.llm_provider import preview_provider_selection
from app.services.model_profile_service import get_allowed_model_profiles, get_max_concurrent_jobs
from app.services.repository import repository


_job_queue: Queue[str] = Queue()
_worker_started = False
_worker_lock = Lock()
_shutdown_event = Event()


def start_analysis_job_worker() -> None:
    global _worker_started
    with _worker_lock:
        if _worker_started:
            return
        thread = Thread(target=_worker_loop, name="analysis-job-worker", daemon=True)
        thread.start()
        _worker_started = True


def stop_analysis_job_worker() -> None:
    _shutdown_event.set()


def enqueue_analysis_job(
    db: Session,
    user: UserModel,
    request: AnalysisRequest,
    source_analysis_id: str | None = None
) -> AnalysisJobRecord:
    _ensure_job_capacity(db, user, request)
    membership = repository.get_primary_membership(db, user.id)
    provider_name, selected_model = preview_provider_selection(request.model_profile)
    job = repository.create_analysis_job(
        db,
        AnalysisJobModel(
            id=f"job-{uuid4().hex[:10]}",
            user_id=user.id,
            organization_id=membership.organization_id if membership is not None else None,
            source_analysis_id=source_analysis_id,
            mode=request.mode,
            title=request.title.strip() or request.prompt.strip()[:80],
            model_profile=request.model_profile,
            provider=provider_name,
            selected_model=selected_model,
            status="queued",
            progress=5,
            step="已进入队列",
            request_payload=request.model_dump(mode="json"),
            events_payload=[
                _build_event_payload(
                    status="queued",
                    progress=5,
                    step="已进入队列",
                    message="任务已创建，等待后台工作线程领取。"
                )
            ]
        )
    )
    repository.create_audit_log(
        db,
        AuditLogModel(
            id=f"audit-{uuid4().hex[:10]}",
            actor_user_id=user.id,
            organization_id=job.organization_id or "",
            action="analysis.job_created",
            entity_type="analysis_job",
            entity_id=job.id,
            summary=f"{user.name} 创建了新的推演任务 {job.title}",
            metadata_payload={"model_profile": request.model_profile, "source_analysis_id": source_analysis_id}
        )
    )
    _job_queue.put(job.id)
    return serialize_analysis_job(db, job)


def enqueue_rerun_job(
    db: Session,
    user: UserModel,
    analysis_id: str
) -> AnalysisJobRecord:
    source_request = repository.get_analysis_request(db, analysis_id)
    source_analysis = repository.get_analysis(db, analysis_id)
    if source_request is None or source_analysis is None:
        raise ValueError("未找到要重演的原始推演记录。")

    request = source_request.model_copy(deep=True)
    request.title = _sanitize_title(request.title)
    return enqueue_analysis_job(db, user, request, source_analysis_id=analysis_id)


def get_analysis_job_for_user(
    db: Session,
    user: UserModel,
    job_id: str
) -> AnalysisJobRecord | None:
    job = repository.get_analysis_job(db, job_id)
    if job is None:
        return None
    if user.role != "admin" and job.user_id != user.id:
        raise ValueError("当前账号无权访问这个任务。")
    return serialize_analysis_job(db, job)


def list_user_analysis_jobs(
    db: Session,
    user: UserModel,
    limit: int = 20
) -> list[AnalysisJobRecord]:
    jobs = repository.list_analysis_jobs(db, user_id=user.id, limit=limit)
    return [serialize_analysis_job(db, job) for job in jobs]


def list_admin_analysis_jobs(db: Session, limit: int = 100) -> list[AnalysisJobRecord]:
    jobs = repository.list_analysis_jobs(db, limit=limit)
    return [serialize_analysis_job(db, job) for job in jobs]


def stream_analysis_job_events(
    job_id: str,
    user_id: str,
    is_admin: bool = False
) -> Iterator[str]:
    last_event_count = 0

    while True:
        with SessionLocal() as db:
            job = repository.get_analysis_job(db, job_id)
            if job is None:
                yield "event: error\ndata: {\"message\":\"任务不存在。\"}\n\n"
                return
            if not is_admin and job.user_id != user_id:
                yield "event: error\ndata: {\"message\":\"无权访问当前任务。\"}\n\n"
                return

            record = serialize_analysis_job(db, job)
            if len(record.events) > last_event_count:
                for event in record.events[last_event_count:]:
                    yield f"data: {event.model_dump_json()}\n\n"
                last_event_count = len(record.events)

            if record.status in {"completed", "failed"}:
                yield "event: done\ndata: {\"status\":\"finished\"}\n\n"
                return

        sleep(1)


def serialize_analysis_job(db: Session, job: AnalysisJobModel) -> AnalysisJobRecord:
    result = repository.get_analysis(db, job.result_analysis_id) if job.result_analysis_id else None
    events = [AnalysisJobEvent.model_validate(item) for item in (job.events_payload or [])]
    return AnalysisJobRecord(
        id=job.id,
        user_id=job.user_id,
        organization_id=job.organization_id,
        source_analysis_id=job.source_analysis_id,
        result_analysis_id=job.result_analysis_id,
        mode=job.mode,
        title=job.title,
        model_profile=job.model_profile,
        provider=job.provider,
        selected_model=job.selected_model,
        status=job.status,
        progress=job.progress,
        step=job.step,
        queue_position=_get_queue_position(db, job),
        error_message=job.error_message,
        created_at=job.created_at,
        updated_at=job.updated_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
        events=events,
        result=result
    )


def _worker_loop() -> None:
    while not _shutdown_event.is_set():
        try:
            job_id = _job_queue.get(timeout=0.5)
        except Empty:
            continue

        try:
            _process_job(job_id)
        finally:
            _job_queue.task_done()


def _process_job(job_id: str) -> None:
    with SessionLocal() as db:
        job = repository.get_analysis_job(db, job_id)
        if job is None or job.status != "queued":
            return

        _mark_job(
            db,
            job,
            status="running",
            progress=15,
            step="校验额度与权限",
            message="开始校验套餐额度、模型档位和组织归属。"
        )

        user = repository.get_user(db, job.user_id)
        if user is None:
            _fail_job(db, job, "任务所属用户不存在，无法继续执行。")
            return

        request = AnalysisRequest.model_validate(job.request_payload)

        try:
            _ensure_job_capacity(db, user, request, check_active_jobs=False)
            _mark_job(
                db,
                job,
                status="running",
                progress=35,
                step="调用模型",
                message=f"正在使用 {job.selected_model} 生成结构化推演。"
            )

            source_analysis = (
                repository.get_analysis(db, job.source_analysis_id)
                if job.source_analysis_id
                else None
            )
            analysis = create_analysis(db, request, user, source_analysis=source_analysis)
            job.result_analysis_id = analysis.id
            job.provider = analysis.generation.provider
            job.selected_model = analysis.generation.model
            _mark_job(
                db,
                job,
                status="completed",
                progress=100,
                step="任务完成",
                message="新版本结果已经生成并保存。"
            )
        except Exception as exc:
            _fail_job(db, job, str(exc))


def _ensure_job_capacity(
    db: Session,
    user: UserModel,
    request: AnalysisRequest,
    *,
    check_active_jobs: bool = True
) -> None:
    plan = repository.get_plan(db, user.plan_id)
    if plan is None:
        raise RuntimeError("当前账号套餐不存在，无法执行推演。")

    ensure_analysis_quota(db, user)

    allowed_profiles = get_allowed_model_profiles(plan)
    if request.model_profile not in allowed_profiles:
        raise RuntimeError("当前套餐不支持所选模型档位，请升级到支持高级模型的套餐。")

    if check_active_jobs:
        active_jobs = repository.count_analysis_jobs(
            db,
            user_id=user.id,
            statuses={"queued", "running"}
        )
        if active_jobs >= get_max_concurrent_jobs(plan):
            raise RuntimeError("当前排队任务已达到套餐并发上限，请等待已有任务完成后再试。")


def _mark_job(
    db: Session,
    job: AnalysisJobModel,
    *,
    status: str,
    progress: int,
    step: str,
    message: str
) -> AnalysisJobModel:
    now = datetime.now(timezone.utc)
    if job.started_at is None and status == "running":
        job.started_at = now
    if status in {"completed", "failed"}:
        job.completed_at = now
    job.status = status
    job.progress = progress
    job.step = step
    job.updated_at = now
    events = list(job.events_payload or [])
    events.append(
        _build_event_payload(
            status=status,
            progress=progress,
            step=step,
            message=message,
            at=now
        )
    )
    job.events_payload = events
    return repository.save_analysis_job(db, job)


def _fail_job(db: Session, job: AnalysisJobModel, message: str) -> AnalysisJobModel:
    job.error_message = message
    return _mark_job(
        db,
        job,
        status="failed",
        progress=100,
        step="任务失败",
        message=message
    )


def _build_event_payload(
    *,
    status: str,
    progress: int,
    step: str,
    message: str,
    at: datetime | None = None
) -> dict:
    return {
        "at": (at or datetime.now(timezone.utc)).isoformat(),
        "status": status,
        "progress": progress,
        "step": step,
        "message": message
    }


def _get_queue_position(db: Session, job: AnalysisJobModel) -> int:
    if job.status != "queued":
        return 0
    queued_jobs = sorted(
        repository.list_analysis_jobs(db, statuses={"queued"}, limit=None),
        key=lambda item: item.created_at
    )
    for index, queued_job in enumerate(queued_jobs, start=1):
        if queued_job.id == job.id:
            return index
    return 0


def _sanitize_title(title: str) -> str:
    cleaned = title.replace("（重演）", "").strip()
    return cleaned or title.strip()
