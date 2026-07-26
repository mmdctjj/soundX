import edge_tts
from typing import Dict, Any, List
from .base import BaseTTS


class EdgeTTS(BaseTTS):
    """
    Microsoft Edge TTS 适配器实现 (免费且高质量)
    """

    @property
    def provider_name(self) -> str:
        return "edge"

    @property
    def provider_label(self) -> str:
        return "微软 Edge"

    async def check_credentials(self) -> bool:
        """
        Edge TTS 不需要 API Key，直接返回 True
        """
        return True

    async def get_voices(self) -> List[Dict[str, str]]:
        """返回 Edge TTS 支持的常用音色列表"""
        return [
            {"id": "zh-CN-XiaoxiaoNeural", "name": "晓晓", "gender": "female"},
            {"id": "zh-CN-XiaoyiNeural", "name": "晓依", "gender": "female"},
            {"id": "zh-CN-YunxiNeural", "name": "云希", "gender": "male"},
            {"id": "zh-CN-YunyangNeural", "name": "云扬", "gender": "male"},
            {"id": "zh-CN-YunjianNeural", "name": "云健", "gender": "male"},
            {"id": "zh-CN-YunxiaNeural", "name": "云夏", "gender": "male"},
            {"id": "zh-CN-liaoning-XiaobeiNeural", "name": "东北小蓓", "gender": "female"},
            {"id": "zh-CN-shaanxi-XiaoniNeural", "name": "陕西小妮", "gender": "female"},
        ]

    async def synthesize(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        """
        调用 edge-tts 库进行合成
        """
        try:
            # 过滤掉过短的文本（避免某些解析错误导致只有标点）
            if not text or len(text.strip()) < 1:
                return False

            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(output_path)
            return True
        except Exception as e:
            print(f"Edge TTS Synthesis ERROR [Voice: {voice}]: {e}")
            return False
