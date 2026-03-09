from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    app_name: str = "First Principles Strategy OS API"
    app_version: str = "0.3.0"
    api_prefix: str = "/api"
    database_url: str = Field(
        default="sqlite:///./world_inference.db",
        alias="DATABASE_URL"
    )

    llm_provider: str = Field(default="deepseek", alias="LLM_PROVIDER")
    llm_fallback_to_mock: bool = Field(default=False, alias="LLM_FALLBACK_TO_MOCK")
    llm_request_timeout_seconds: int = Field(default=120, alias="LLM_REQUEST_TIMEOUT_SECONDS")
    llm_max_output_tokens: int = Field(default=1800, alias="LLM_MAX_OUTPUT_TOKENS")
    llm_reasoning_max_output_tokens: int = Field(default=2200, alias="LLM_REASONING_MAX_OUTPUT_TOKENS")
    llm_temperature: float = Field(default=0.0, alias="LLM_TEMPERATURE")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-5-mini", alias="OPENAI_MODEL")
    openai_reasoning_model: str = Field(default="gpt-5", alias="OPENAI_REASONING_MODEL")

    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    deepseek_chat_model: str = Field(default="deepseek-chat", alias="DEEPSEEK_CHAT_MODEL")
    deepseek_reasoning_model: str = Field(default="deepseek-reasoner", alias="DEEPSEEK_REASONING_MODEL")
    deepseek_base_url: str = Field(default="https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")

    default_demo_user_id: str = Field(default="demo-admin", alias="DEFAULT_DEMO_USER_ID")
    app_secret: str = Field(default="local-dev-secret", alias="APP_SECRET")
    session_expiration_hours: int = Field(default=72, alias="SESSION_EXPIRATION_HOURS")
    enable_demo_auth: bool = Field(default=False, alias="ENABLE_DEMO_AUTH")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
