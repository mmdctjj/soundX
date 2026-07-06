"""
TTS 服务配置管理：从 tts_user_config 表读取/保存 provider 凭据，
并把当前生效的值回写到 os.environ，让现有 engine 层 (基于 os.environ) 无感使用。
"""

import json
import os
from typing import Any, Dict, List, Tuple
from sqlmodel import Session, select
from src.database.models import engine, UserConfig


def _provider_to_env_prefix(provider: str) -> str:
    return f"TTS_{provider.upper()}"


def _camel_to_snake(name: str) -> str:
    """apiKey / api_key / api-key -> api_key"""
    return name.replace("-", "_").lower()


def list_providers_config() -> Dict[str, Dict[str, Any]]:
    """
    读取所有已保存的 provider 配置。
    返回 { provider: { key: value, ... } }。
    """
    with Session(engine) as session:
        rows = session.exec(select(UserConfig)).all()
    return {row.engine_name: _parse(row.config_json) for row in rows}


def get_provider_config(provider: str) -> Dict[str, Any]:
    with Session(engine) as session:
        row = session.get(UserConfig, provider)
    if not row:
        return {}
    return _parse(row.config_json)


def save_provider_config(provider: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    持久化 provider 配置并刷新到 os.environ。
    """
    sanitized = {k: ("" if v is None else str(v)) for k, v in config.items() if v is not None}
    payload = json.dumps(sanitized, ensure_ascii=False)
    with Session(engine) as session:
        row = session.get(UserConfig, provider)
        if row:
            row.config_json = payload
        else:
            row = UserConfig(engine_name=provider, config_json=payload)
            session.add(row)
        session.commit()
        session.refresh(row)
    _apply_to_env(provider, sanitized)
    return sanitized


def delete_provider_config(provider: str) -> None:
    with Session(engine) as session:
        row = session.get(UserConfig, provider)
        if row:
            session.delete(row)
            session.commit()
    _clear_env(provider)


def hydrate_from_db() -> None:
    """
    启动时先做一次向后兼容迁移：
    - 若 DB 中没有该 provider 但 env 中有 TTS_<PROVIDER>_*，把 env 整段写库；
    - 再把 DB 中所有 provider 配置回写到 os.environ，让现有 engine 无感使用。
    """
    migrate_from_env()
    for provider, config in list_providers_config().items():
        _apply_to_env(provider, config)


def migrate_from_env() -> None:
    """
    扫 env 中所有 TTS_<PROVIDER>_* 变量：
      - 找到已注册引擎的 provider 若其 DB 记录为空，自动把 env 整段写入 DB，
        让设置页面直接展示这些历史配置，不需要老用户手工搬运。
    """
    from src.engines.registry import ENGINE_REGISTRY

    candidates: Dict[str, Dict[str, str]] = {}
    for key, value in os.environ.items():
        if not key.startswith("TTS_"):
            continue
        rest = key[len("TTS_"):]
        if "_" not in rest:
            continue
        provider, _, field = rest.partition("_")
        if provider not in ENGINE_REGISTRY or not value:
            continue
        candidates.setdefault(provider, {})[field.lower()] = value

    for provider, config in candidates.items():
        existing = get_provider_config(provider)
        if existing:
            continue
        save_provider_config(provider, config)


def _apply_to_env(provider: str, config: Dict[str, Any]) -> None:
    prefix = _provider_to_env_prefix(provider)
    for key, value in config.items():
        if not value:
            continue
        os.environ[f"{prefix}_{key.upper()}"] = value


def _clear_env(provider: str) -> None:
    prefix = _provider_to_env_prefix(provider)
    for key in list(os.environ.keys()):
        if key.startswith(f"{prefix}_"):
            os.environ.pop(key, None)


def _parse(raw: str) -> Dict[str, Any]:
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}
