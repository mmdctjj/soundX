import json
import aiohttp
import traceback
from typing import Dict, Any, List
from .base import BaseTTS


class MiniMaxTTS(BaseTTS):
    """MiniMax TTS 引擎适配器"""

    API_URL = "https://api.minimaxi.com/v1/t2a_v2"

    @property
    def provider_name(self) -> str:
        return "minimax"

    @property
    def provider_label(self) -> str:
        return "MiniMax"

    async def check_credentials(self) -> bool:
        api_key = self.config.get("api_key")
        print(f"[MiniMax] check_credentials: api_key present={bool(api_key)}, config={self.config}")
        return bool(api_key)

    async def get_voices(self) -> List[Dict[str, str]]:
        """MiniMax 音色列表"""
        return [
            {"id": "male-qn-qingse", "name": "清澈男声", "gender": "male"},
            {"id": "male-qn-jingying", "name": "精英男声", "gender": "male"},
            {"id": "male-qn-badao", "name": "霸道总裁", "gender": "male"},
            {"id": "male-qn-daxuesheng", "name": "青年大学生", "gender": "male"},
            {"id": "female-shaonv", "name": "少女", "gender": "female"},
            {"id": "female-yujie", "name": "御姐", "gender": "female"},
            {"id": "female-chengshu", "name": "成熟女性", "gender": "female"},
            {"id": "female-tianmei", "name": "甜美少女", "gender": "female"},
        ]

    async def synthesize(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        print(f"[MiniMax] synthesize called: voice={voice}, output={output_path}, config={self.config}")

        api_key = self.config.get("api_key")

        if not api_key:
            print(f"[MiniMax] ERROR: Missing api_key in config: {self.config}")
            return False

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": kwargs.get("model", self.config.get("model", "speech-01-turbo")),
            "text": text,
            "stream": False,
            "voice_setting": {
                "voice_id": voice,
                "speed": kwargs.get("speed", 1.0),
                "vol": kwargs.get("vol", 1.0),
                "pitch": kwargs.get("pitch", 0),
            },
            "audio_setting": {
                "sample_rate": kwargs.get("sample_rate", 32000),
                "bitrate": kwargs.get("bitrate", 128000),
                "format": kwargs.get("format", "mp3"),
                "channel": 1,
            },
            "subtitle_enable": False,
        }

        print(f"[MiniMax] Request: URL={self.API_URL}, model={payload['model']}, voice={voice}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.API_URL,
                    headers=headers,
                    json=payload
                ) as response:
                    print(f"[MiniMax] Response status: {response.status}")
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"[MiniMax] HTTP error {response.status}: {error_text[:500]}")
                        return False

                    data = await response.json()
                    print(f"[MiniMax] Response data keys: {list(data.keys())}")

                    # 检查错误响应
                    if "base_resp" in data:
                        base_resp = data["base_resp"]
                        print(f"[MiniMax] API base_resp: {base_resp}")
                        if base_resp.get("status_code") != 0:
                            return False

                    # 同步接口直接返回完整音频 hex
                    if "data" in data and "audio" in data["data"]:
                        audio_hex = data["data"]["audio"]
                        print(f"[MiniMax] Got audio hex, length: {len(audio_hex)}")

                        audio_bytes = bytes.fromhex(audio_hex)
                        print(f"[MiniMax] Decoded audio size: {len(audio_bytes)} bytes")
                        with open(output_path, "wb") as f:
                            f.write(audio_bytes)
                        print(f"[MiniMax] Saved to: {output_path}")
                        return True
                    else:
                        print(f"[MiniMax] ERROR: No audio in response. data={data.get('data')}")
                        return False

        except Exception as e:
            print(f"[MiniMax] Exception: {type(e).__name__}: {e}")
            traceback.print_exc()
            return False
