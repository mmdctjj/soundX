from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from src.core.settings_manager import (
    get_provider_config,
    save_provider_config,
    delete_provider_config,
    list_providers_config,
)
from src.engines.registry import EngineFactory

router = APIRouter()


@router.get("/providers")
async def list_supported_providers():
    return {"providers": EngineFactory.get_providers()}


@router.get("/configs")
async def list_configs():
    """
    列出所有已持久化的服务商配置 (value 字段对前端展示时建议隐藏/掩码)。
    """
    return {"configs": list_providers_config()}


@router.get("/configs/{provider}")
async def get_config(provider: str):
    return {"provider": provider, "config": get_provider_config(provider)}


@router.post("/configs/{provider}")
async def save_config(provider: str, payload: Dict[str, Any] = Body(default={})):
    if provider not in EngineFactory.ENGINE_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    config = (payload or {}).get("config") or {}
    if not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="config must be an object")
    saved = save_provider_config(provider, config)
    return {"provider": provider, "config": saved}


@router.delete("/configs/{provider}")
async def delete_config(provider: str):
    delete_provider_config(provider)
    return {"provider": provider, "ok": True}
