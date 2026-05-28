from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseTTS(ABC):
    """
    TTS 引擎抽象基类 (Adapter Pattern)
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """服务商标识，如 'edge', 'volc', 'mimo', 'minimax'"""
        pass

    @property
    @abstractmethod
    def provider_label(self) -> str:
        """服务商显示名称，如 '微软 Edge', '火山引擎', '小米 MiMo', 'MiniMax'"""
        pass

    @abstractmethod
    async def check_credentials(self) -> bool:
        """
        验证 API 凭据是否有效
        """
        pass

    @abstractmethod
    async def get_voices(self) -> List[Dict[str, str]]:
        """
        获取该服务商支持的所有音色列表
        返回: [{"id": "voice_id", "name": "音色名称", "gender": "male/female", ...}]
        """
        pass

    @abstractmethod
    async def synthesize(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        """
        语音合成接口
        :param text: 待合成文本
        :param output_path: 目标音频保存路径
        :param voice: 发音人ID/角色
        :param kwargs: 各引擎额外参数（语速、音量等）
        :return: 是否成功
        """
        pass
