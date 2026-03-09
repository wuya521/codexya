from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_account import router as account_router
from app.api.routes_admin import router as admin_router
from app.api.routes_analyses import router as analyses_router
from app.api.routes_analysis_jobs import router as analysis_jobs_router
from app.api.routes_auth import router as auth_router
from app.api.routes_billing import router as billing_router
from app.api.routes_system import router as system_router
from app.api.routes_templates import router as templates_router
from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.models.db_models import Base
from app.services.analysis_job_service import start_analysis_job_worker, stop_analysis_job_worker
from app.services.analysis_service import bootstrap_data


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        bootstrap_data(session)
    start_analysis_job_worker()
    yield
    stop_analysis_job_worker()


app = FastAPI(
    title=settings.app_name,
    description="用于走向预测、最佳路径规划与结构化决策推演的后端服务。",
    version=settings.app_version,
    openapi_tags=[
        {"name": "系统", "description": "服务健康检查与基础元信息。"},
        {"name": "鉴权", "description": "注册、登录、会话管理与演示账号。"},
        {"name": "分析", "description": "创建、查询与重演结构化推演结果。"},
        {"name": "异步任务", "description": "异步排队、轮询与实时订阅推演任务。"},
        {"name": "模板", "description": "获取内置分析模板与起始场景。"},
        {"name": "账户", "description": "账户、组织、成员与工作台信息。"},
        {"name": "计费", "description": "套餐、订阅与订单能力。"},
        {"name": "后台", "description": "运营、订单、组织与审计视图。"}
    ],
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.get("/health", tags=["系统"], summary="健康检查")
def health():
    return {"status": "ok", "service": settings.app_name}


app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(system_router, prefix=settings.api_prefix)
app.include_router(analyses_router, prefix=settings.api_prefix)
app.include_router(analysis_jobs_router, prefix=settings.api_prefix)
app.include_router(templates_router, prefix=settings.api_prefix)
app.include_router(account_router, prefix=settings.api_prefix)
app.include_router(billing_router, prefix=settings.api_prefix)
app.include_router(admin_router, prefix=settings.api_prefix)
