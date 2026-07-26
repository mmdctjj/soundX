import json
import base64
import traceback
from typing import Dict, Any, List
from .base import BaseTTS

try:
    import aiohttp
except ImportError:
    aiohttp = None


class MimoTTS(BaseTTS):
    """小米 MiMo TTS 引擎适配器 (OpenAI Compatible API)"""

    API_URL = "https://api.xiaomimimo.com/v1/chat/completions"

    @property
    def provider_name(self) -> str:
        return "mimo"

    @property
    def provider_label(self) -> str:
        return "小米 MiMo"

    async def check_credentials(self) -> bool:
        api_key = self.config.get("api_key") or self.config.get("api_token")
        print(f"[MiMo] check_credentials: api_key present={bool(api_key)}, config={self.config}")
        return bool(api_key)

    async def get_voices(self) -> List[Dict[str, str]]:
        """返回 MiMo 支持的音色列表（V2.5 内置音色）"""
        return [
            {"id": "mimo_default", "name": "MiMo 默认", "gender": "female"},
            {"id": "冰糖", "name": "冰糖", "gender": "female"},
            {"id": "茉莉", "name": "茉莉", "gender": "female"},
            {"id": "苏打", "name": "苏打", "gender": "male"},
            {"id": "白桦", "name": "白桦", "gender": "male"},
            {"id": "Mia", "name": "Mia", "gender": "female"},
            {"id": "Chloe", "name": "Chloe", "gender": "female"},
            {"id": "Milo", "name": "Milo", "gender": "male"},
            {"id": "Dean", "name": "Dean", "gender": "male"},
        ]

    async def synthesize(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        print(f"[MiMo] synthesize called: voice={voice}, output={output_path}, config={self.config}")

        if aiohttp is None:
            print("[MiMo] ERROR: aiohttp package is not installed")
            return False

        api_key = self.config.get("api_key") or self.config.get("api_token")
        if not api_key:
            print(f"[MiMo] ERROR: Missing api_key or api_token in config: {self.config}")
            return False

        model = self.config.get("model", "mimo-v2.5-tts")

        headers = {
            "api-key": api_key,
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "assistant",
                    "content": text,
                }
            ],
            "audio": {
                "format": kwargs.get("format", "mp3"),
                "voice": voice,
            },
        }

        print(f"[MiMo] Request: URL={self.API_URL}, model={model}, voice={voice}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.API_URL,
                    headers=headers,
                    json=payload,
                ) as response:
                    print(f"[MiMo] Response status: {response.status}")
                    if response.status != 200:
                        error_text = await response.text()
                        print(f"[MiMo] HTTP error {response.status}: {error_text[:500]}")
                        return False

                    data = await response.json()
                    print(f"[MiMo] Response keys: {list(data.keys())}")

                    if "error" in data:
                        print(f"[MiMo] API error: {data['error']}")
                        return False

                    # 提取音频数据
                    choices = data.get("choices", [])
                    if not choices:
                        print("[MiMo] ERROR: No choices in response")
                        return False

                    message = choices[0].get("message", {})
                    audio = message.get("audio")

                    if not audio:
                        print(f"[MiMo] ERROR: No audio in message. Message keys: {list(message.keys())}")
                        return False
                    if "data" not in audio:
                        print(f"[MiMo] ERROR: No 'data' key in audio. Audio keys: {list(audio.keys())}")
                        return False

                    audio_data = base64.b64decode(audio["data"])
                    print(f"[MiMo] Decoded audio size: {len(audio_data)} bytes")
                    with open(output_path, "wb") as f:
                        f.write(audio_data)
                    print(f"[MiMo] Saved to: {output_path}")
                    return True

        except Exception as e:
            print(f"[MiMo] Exception: {type(e).__name__}: {e}")
            traceback.print_exc()
            return False
