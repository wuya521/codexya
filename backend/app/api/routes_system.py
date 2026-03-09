from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/system", tags=["系统"])


@router.get("/runtime", summary="获取当前运行时配置摘要")
def get_runtime():
    database_mode = "postgresql" if settings.database_url.startswith("postgresql") else "sqlite"
    provider_model = {
        "mock": "mock",
        "openai": settings.openai_model,
        "deepseek": settings.deepseek_chat_model
    }.get(settings.llm_provider.lower(), settings.llm_provider)

    return {
        "app_name": settings.app_name,
        "app_version": settings.app_version,
        "llm_provider": settings.llm_provider,
        "active_model": provider_model,
        "database_mode": database_mode,
        "fallback_to_mock": settings.llm_fallback_to_mock,
        "demo_auth_enabled": settings.enable_demo_auth,
        "capabilities": [
            "structured-analysis",
            "real-api-only",
            "versioned-rerun",
            "organization-membership",
            "subscriptions",
            "orders",
            "admin-console",
            "audit-logs",
            "async-analysis-jobs",
            "polling-and-sse",
            "plan-quota-controls",
            "model-profile-selection"
        ]
    }
