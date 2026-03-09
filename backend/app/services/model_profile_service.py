from app.models.db_models import PlanModel
from app.schemas.analysis import ModelProfile


def get_allowed_model_profiles(plan: PlanModel) -> list[ModelProfile]:
    profiles: list[ModelProfile] = ["fast", "balanced"]
    if plan.advanced_models:
        profiles.append("deep")
    return profiles


def get_max_concurrent_jobs(plan: PlanModel) -> int:
    return max(1, min(plan.team_seats, 5))


def get_model_profile_label(profile: ModelProfile) -> str:
    labels = {
        "fast": "极速",
        "balanced": "平衡",
        "deep": "深度推理"
    }
    return labels.get(profile, profile)
