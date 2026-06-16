"""小爱音箱对话记录 API 客户端

对齐 songloft-org/songloft 的 miot 插件做法：从 userprofile.mina.mi.com 拉完整 NLP 结果，
而不是用 ubus nlp_result_get（后者 query 经常被压缩成简写）。

需要 serviceToken 是 micoapi sid 的（来自 MiAccount.login('micoapi')）。
Cookie 格式：userId + serviceToken + channel=MI_APP_STORE + deviceId。
"""

import asyncio
import json
import logging
import time
from typing import Any

import aiohttp

logger = logging.getLogger(__name__)

LATEST_ASK_API = (
    "https://userprofile.mina.mi.com/device_profile/v2/conversation"
    "?source=dialogu&hardware={hardware}&timestamp={timestamp}&limit={limit}"
)


class ConversationAPI:
    """userprofile 对话记录 API 客户端

    Usage:
        api = ConversationAPI(auth_data, session)
        records = await api.get_latest(device_id="xxx", hardware="LX06", since_ms=0, limit=2)
    """

    def __init__(self, auth_data: dict, session: aiohttp.ClientSession):
        self._auth = auth_data
        self._session = session

    @property
    def user_agent(self) -> str:
        return self._auth.get("ua", "")

    @property
    def user_id(self) -> str:
        return self._auth.get("userId", "")

    @property
    def service_token(self) -> str:
        """取 micoapi sid 下的 serviceToken（由 MiAccount.login('micoapi') 写入）"""
        m = self._auth.get("micoapi")
        if isinstance(m, (list, tuple)) and len(m) >= 2 and m[1]:
            return m[1]
        # 兜底：扫码直接写的顶层 serviceToken（来自 callback URL）
        return self._auth.get("serviceToken", "")

    def has_credentials(self) -> bool:
        return bool(self.user_id and self.service_token and self.user_agent)

    def _build_headers(self, device_id: str) -> dict:
        return {
            "User-Agent": self.user_agent,
            "Cookie": (
                f"userId={self.user_id};"
                f"serviceToken={self.service_token};"
                f"channel=MI_APP_STORE;"
                f"deviceId={device_id}"
            ),
        }

    async def get_latest(
        self,
        device_id: str,
        hardware: str,
        since_ms: int = 0,
        limit: int = 2,
        timeout_sec: float = 10.0,
        max_retries: int = 3,
    ) -> list[dict]:
        """拉取指定设备的最新对话记录

        Returns:
            list[{time, query, answer_text, request_id}, ...]，按 time 降序
            401 时返回空列表；其他错误也返回空列表（不抛异常）
        """
        if not self.has_credentials():
            logger.warning("[ConversationAPI] 缺少凭证（userId/serviceToken/ua）")
            return []

        timestamp = int(time.time() * 1000)
        url = LATEST_ASK_API.format(hardware=hardware, timestamp=timestamp, limit=limit)
        headers = self._build_headers(device_id)

        last_err = None
        for attempt in range(max_retries):
            try:
                async with asyncio.timeout(timeout_sec):
                    async with self._session.get(url, headers=headers) as resp:
                        if resp.status == 401:
                            logger.warning(
                                f"[ConversationAPI] 401 unauthorized "
                                f"(serviceToken 失效？device={device_id})"
                            )
                            return []
                        if resp.status != 200:
                            text = await resp.text()
                            logger.warning(
                                f"[ConversationAPI] HTTP {resp.status}: {text[:200]}"
                            )
                            return []
                        body = await resp.text()
                        return self._parse_response(body, since_ms)
            except (asyncio.TimeoutError, aiohttp.ClientError) as e:
                last_err = e
                logger.debug(
                    f"[ConversationAPI] 第 {attempt+1}/{max_retries} 次失败: {e}"
                )
                continue

        logger.warning(f"[ConversationAPI] 全部 {max_retries} 次请求失败: {last_err}")
        return []

    @staticmethod
    def _parse_response(body: str, since_ms: int) -> list[dict]:
        """解析 userprofile API 响应

        响应结构：
            {"code": 0, "message": "Success", "data": "<JSON string>"}
        其中 data 字段是 JSON 字符串，解码后：
            {"records": [{"time": 毫秒, "query": "用户原始 query",
                          "answers": [{"type": "TTS", "tts": {"text": "..."}}],
                          "requestId": "..."}]}
        """
        try:
            outer = json.loads(body)
        except json.JSONDecodeError:
            logger.warning(f"[ConversationAPI] 响应非 JSON: {body[:200]}")
            return []

        if outer.get("code") != 0:
            logger.warning(f"[ConversationAPI] 业务错误: {outer}")
            return []

        data_str = outer.get("data")
        if not data_str:
            return []

        try:
            data = json.loads(data_str)
        except json.JSONDecodeError:
            logger.warning(f"[ConversationAPI] data 字段非 JSON: {data_str[:200]}")
            return []

        records = data.get("records") or []
        out: list[dict] = []
        for r in records:
            t = int(r.get("time") or 0)
            if t <= since_ms:
                continue
            answers = r.get("answers") or []
            tts = next((a for a in answers if a.get("type") == "TTS"), None)
            answer_text = (tts or {}).get("tts", {}).get("text", "") if tts else ""
            out.append(
                {
                    "time": t,
                    "query": r.get("query", "") or "",
                    "answer": answer_text,
                    "request_id": r.get("requestId", ""),
                }
            )

        # 按时间升序返回（先旧后新，方便处理）
        out.sort(key=lambda x: x["time"])
        return out