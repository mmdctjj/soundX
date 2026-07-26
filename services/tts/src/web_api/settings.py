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


@router.post("/configs/{provider}/test")
async def test_config(provider: str, payload: Dict[str, Any] = Body(default={})):
    """
    测试当前请求体中的 config 是否能成功调用 provider 凭据校验。
    - body 可选 {config: {...}};若省略,使用 DB 中已保存的配置。
    - 不修改 DB,不回写 os.environ,纯只读探测。
    """
    if provider not in EngineFactory.ENGINE_REGISTRY:
        raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")
    incoming = (payload or {}).get("config")
    if incoming is None:
        cfg = get_provider_config(provider)
    elif isinstance(incoming, dict):
        cfg = {k: ("" if v is None else str(v)) for k, v in incoming.items() if v is not None}
    else:
        raise HTTPException(status_code=400, detail="config must be an object")
    try:
        engine = EngineFactory.create(provider, cfg)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to init engine: {e}")
    try:
        ok = await engine.check_credentials()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Credential check failed: {e}")
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    return {"provider": provider, "ok": True}


@router.delete("/configs/{provider}")
async def delete_config(provider: str):
    delete_provider_config(provider)
    return {"provider": provider, "ok": True}
