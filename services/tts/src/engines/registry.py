from typing import Type, Dict, Any, List
from .base import BaseTTS
from .edge import EdgeTTS
from .volc import VolcTTS
from .mimo import MimoTTS
from .minimax import MiniMaxTTS

ENGINE_REGISTRY: Dict[str, Type[BaseTTS]] = {
    "edge": EdgeTTS,
    "volc": VolcTTS,
    "mimo": MimoTTS,
    "minimax": MiniMaxTTS,
}


class EngineFactory:
    """TTS 引擎工厂，根据 provider 名称创建对应引擎实例"""

    @classmethod
    def create(cls, provider: str, config: Dict[str, Any] = None) -> BaseTTS:
        if provider not in ENGINE_REGISTRY:
            raise ValueError(
                f"Unknown TTS provider: {provider}. "
                f"Available: {list(ENGINE_REGISTRY.keys())}"
            )
        engine_class = ENGINE_REGISTRY[provider]
        return engine_class(config=config or {})

    @classmethod
    def get_providers(cls) -> List[Dict[str, str]]:
        """获取所有注册的服务商列表（用于 /providers 接口）"""
        providers = []
        for key, engine_class in ENGINE_REGISTRY.items():
            # 实例化一个临时对象获取 label（无需配置）
            temp = engine_class(config={})
            providers.append({
                "id": temp.provider_name,
                "name": temp.provider_label,
            })
        return providers

    @classmethod
    def register(cls, name: str, engine_class: Type[BaseTTS]):
        """注册新的引擎（支持运行时扩展）"""
        ENGINE_REGISTRY[name] = engine_class
