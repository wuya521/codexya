import json
from abc import ABC, abstractmethod
from json import JSONDecodeError

from app.core.config import settings
from app.schemas.analysis import AnalysisRequest, GeneratedAnalysisPayload, ModelProfile
from app.services.analysis_generation import build_mock_generated_payload
from app.services.prompt_builder import build_chat_messages, build_json_schema, build_messages


class LLMConfigurationError(RuntimeError):
    pass


class LLMProvider(ABC):
    provider_name = "unknown"
    model_name = "unknown"

    @abstractmethod
    def generate(self, request: AnalysisRequest) -> GeneratedAnalysisPayload:
        raise NotImplementedError


class MockLLMProvider(LLMProvider):
    provider_name = "mock"
    model_name = "mock-world-inference-v1"

    def generate(self, request: AnalysisRequest) -> GeneratedAnalysisPayload:
        self.model_name = "mock-world-inference-v1"
        return build_mock_generated_payload(request)


class OpenAIResponsesProvider(LLMProvider):
    provider_name = "openai"

    def __init__(self, api_key: str) -> None:
        openai_client_class = _get_openai_client_class()
        self.client = openai_client_class(
            api_key=api_key,
            timeout=settings.llm_request_timeout_seconds
        )

    def generate(self, request: AnalysisRequest) -> GeneratedAnalysisPayload:
        self.model_name = _resolve_openai_model(request.model_profile)
        response = self.client.responses.create(
            model=self.model_name,
            input=build_messages(request),
            max_output_tokens=_resolve_max_output_tokens(request.model_profile),
            text={
                "format": {
                    "type": "json_schema",
                    "name": "analysis_payload",
                    "schema": build_json_schema(),
                    "strict": True
                }
            }
        )
        payload = json.loads(response.output_text)
        return GeneratedAnalysisPayload.model_validate(
            _normalize_generated_payload(payload, request)
        )


class DeepSeekChatProvider(LLMProvider):
    provider_name = "deepseek"

    def __init__(self, api_key: str, base_url: str) -> None:
        openai_client_class = _get_openai_client_class()
        self.client = openai_client_class(
            api_key=api_key,
            base_url=base_url,
            timeout=settings.llm_request_timeout_seconds
        )

    def generate(self, request: AnalysisRequest) -> GeneratedAnalysisPayload:
        self.model_name = _resolve_deepseek_model(request.model_profile)
        request_kwargs = {
          "model": self.model_name,
          "messages": build_chat_messages(request),
          "max_tokens": _resolve_max_output_tokens(request.model_profile),
          "response_format": {"type": "json_object"}
        }
        if request.model_profile != "deep":
            request_kwargs["temperature"] = settings.llm_temperature

        response = self.client.chat.completions.create(**request_kwargs)
        content = response.choices[0].message.content or ""
        payload = _load_json_payload(content)
        if payload is None:
            repaired_content = self._repair_json(content)
            payload = _load_json_payload(repaired_content)
        if payload is None:
            raise ValueError("模型返回的 JSON 无法解析，修复后依然失败。")
        return GeneratedAnalysisPayload.model_validate(
            _normalize_generated_payload(payload, request)
        )

    def _repair_json(self, content: str) -> str:
        repair_response = self.client.chat.completions.create(
            model=settings.deepseek_chat_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "你是 JSON 修复器。"
                        "请把用户提供的内容修复成一个合法 JSON 对象。"
                        "不要解释，不要输出 Markdown，只返回 JSON。"
                    )
                },
                {
                    "role": "user",
                    "content": (
                        "请修复下面这段原本应该是 JSON 的内容，只修复语法，不要改变字段含义：\n\n"
                        f"{content}"
                    )
                }
            ],
            max_tokens=min(settings.llm_max_output_tokens, 2200),
            response_format={"type": "json_object"}
        )
        return repair_response.choices[0].message.content or ""


def preview_provider_selection(profile: ModelProfile) -> tuple[str, str]:
    provider_name = settings.llm_provider.lower()
    if provider_name == "deepseek":
        return "deepseek", _resolve_deepseek_model(profile)
    if provider_name == "openai":
        return "openai", _resolve_openai_model(profile)
    if provider_name == "mock":
        return "mock", "mock-world-inference-v1"
    return provider_name, "unknown"


def _get_openai_client_class():
    try:
        from openai import OpenAI
    except ModuleNotFoundError as exc:
        raise LLMConfigurationError(
            "The 'openai' package is required for the configured LLM provider. Install backend dependencies before starting the API."
        ) from exc
    return OpenAI


def get_llm_provider() -> LLMProvider:
    provider_name = settings.llm_provider.lower()

    if provider_name == "deepseek":
        if not settings.deepseek_api_key:
            raise LLMConfigurationError("DeepSeek API Key 未配置，无法执行真实推演。")
        return DeepSeekChatProvider(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url
        )

    if provider_name == "openai":
        if not settings.openai_api_key:
            raise LLMConfigurationError("OpenAI API Key 未配置，无法执行真实推演。")
        return OpenAIResponsesProvider(api_key=settings.openai_api_key)

    if provider_name == "mock":
        return MockLLMProvider()

    raise LLMConfigurationError(f"不支持的模型提供方：{settings.llm_provider}")


def _resolve_deepseek_model(profile: ModelProfile) -> str:
    if profile == "deep":
        return settings.deepseek_reasoning_model
    return settings.deepseek_chat_model


def _resolve_openai_model(profile: ModelProfile) -> str:
    if profile == "deep":
        return settings.openai_reasoning_model
    return settings.openai_model


def _resolve_max_output_tokens(profile: ModelProfile) -> int:
    if profile == "fast":
        return max(1000, settings.llm_max_output_tokens - 500)
    if profile == "deep":
        return max(settings.llm_max_output_tokens, settings.llm_reasoning_max_output_tokens)
    return settings.llm_max_output_tokens


def _extract_json_object(content: str) -> str:
    text = content.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            text = "\n".join(lines[1:-1]).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("模型没有返回可解析的 JSON 对象。")
    return text[start : end + 1]


def _load_json_payload(content: str) -> dict | None:
    try:
        return json.loads(_extract_json_object(content))
    except (JSONDecodeError, ValueError):
        return None


def _normalize_generated_payload(payload: dict, request: AnalysisRequest) -> dict:
    normalized = dict(payload)

    alias_map = {
        "watch": "watch_signals",
        "watchSignals": "watch_signals",
        "signals_to_watch": "watch_signals",
        "next_steps": "next_actions",
        "nextSteps": "next_actions",
        "actions": "next_actions"
    }

    for alias, canonical in alias_map.items():
        if canonical not in normalized and alias in normalized:
            normalized[canonical] = normalized.pop(alias)

    normalized.setdefault("mode", request.mode)
    normalized.setdefault("title", request.title or request.prompt[:20])
    normalized.setdefault("summary", request.user_hypothesis or request.prompt[:80])

    if "problem_definition" not in normalized or not isinstance(normalized["problem_definition"], dict):
        normalized["problem_definition"] = {
            "objective": request.prompt,
            "time_horizon": request.time_horizon,
            "success_criteria": [
                request.target_outcome or "形成一版可执行结果",
                "识别关键变量和主要风险"
            ]
        }
    else:
        normalized["problem_definition"].setdefault("objective", request.prompt)
        normalized["problem_definition"].setdefault("time_horizon", request.time_horizon)
        normalized["problem_definition"].setdefault(
            "success_criteria",
            [request.target_outcome or "形成一版可执行结果"]
        )

    if "current_state" not in normalized or not isinstance(normalized["current_state"], dict):
        normalized["current_state"] = {
            "facts": request.facts,
            "constraints": request.constraints,
            "unknowns": request.unknowns
        }
    else:
        normalized["current_state"].setdefault("facts", request.facts)
        normalized["current_state"].setdefault("constraints", request.constraints)
        normalized["current_state"].setdefault("unknowns", request.unknowns)

    normalized.setdefault("variables", [])
    normalized.setdefault("causal_edges", [])
    normalized.setdefault("scenarios", [])
    normalized.setdefault("risks", [])
    normalized.setdefault(
        "watch_signals",
        [
            {
                "signal": "关键变量变化",
                "why_it_matters": "它决定当前判断是否还成立。",
                "what_change_means": "如果变化超预期，需要重演并校准结论。"
            },
            {
                "signal": "执行节奏偏离",
                "why_it_matters": "它反映路径推进是否卡住。",
                "what_change_means": "若节奏持续变慢，说明路径设计需要调整。"
            }
        ]
    )
    normalized.setdefault(
        "next_actions",
        [
            {
                "horizon": "now",
                "action": "确认当前最关键变量",
                "expected_outcome": "让后续动作聚焦在真正影响结果的部分。"
            },
            {
                "horizon": "7d",
                "action": "执行一轮低成本验证",
                "expected_outcome": "更快确认当前判断是否成立。"
            },
            {
                "horizon": "30d",
                "action": "基于新信号重演一次",
                "expected_outcome": "及时修正路径并更新概率判断。"
            }
        ]
    )

    return normalized
