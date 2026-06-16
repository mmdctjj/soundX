"""语音指令监听器（对齐 songloft 做法）

从 userprofile.mina.mi.com 拉取小爱音箱的完整 NLP 结果（含用户原始 query），
匹配配置的关键词后从本地音乐库匹配并推 URL 给音箱播放。

与 songloft miot 插件的差异：
- songloft 用 JS 插件 + Web UI 可视化配置关键词；这里用环境变量配置关键词
- songloft 有 AI 意图识别 (ai_analyzer.ts)；这里只做关键词匹配
- songloft 多账号多设备；这里单账号多设备
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional

from src.config import Config
from src.conversation_api import ConversationAPI
from src.music_library import MusicLibrary
from src.speaker_player import SpeakerPlayer

logger = logging.getLogger(__name__)


class VoiceCommandListener:
    """语音抢答监听器

    启动后并发轮询所有 managed 设备的对话记录：
      1. 命中关键词 → 提取歌名 → 本地匹配 → stop + play_by_url 抢答
      2. 未命中 → 跳过，让小爱云端正常响应
    """

    def __init__(
        self,
        player: SpeakerPlayer,
        library: MusicLibrary,
        keywords: list[str] | None = None,
        poll_interval: float | None = None,
    ):
        self.player = player
        self.library = library
        # 关键词按字符串长度降序排列：长关键词优先匹配（songloft 风格）
        self.keywords = sorted(
            keywords if keywords is not None else Config.VOICE_KEYWORDS,
            key=len,
            reverse=True,
        )
        self.poll_interval = (
            poll_interval if poll_interval is not None else Config.PULL_ASK_INTERVAL_SEC
        )
        self._running = False
        self._task: Optional[asyncio.Task] = None
        # 每设备独立时间戳（songloft 风格），避免设备间串扰
        self._last_timestamps: dict[str, int] = {}
        # 默认设备（列表中的第一个）
        self._default_device_id: Optional[str] = None

    async def start(self) -> None:
        """启动监听循环（非阻塞）"""
        if self._running:
            logger.warning("VoiceCommandListener already running")
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info(
            f"VoiceCommandListener started, keywords={self.keywords}, "
            f"interval={self.poll_interval}s"
        )

    def stop(self) -> None:
        """停止监听"""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
        logger.info("VoiceCommandListener stopped")

    async def _run_loop(self) -> None:
        """主循环"""
        # 等设备列表就绪
        while self._running and not self.player.devices:
            await asyncio.sleep(0.5)

        if not self._running:
            return

        # 初始化默认设备 + 各设备时间戳
        # 用"现在"作为初始时间戳，避免启动时处理历史对话
        now_ms = int(time.time() * 1000)
        for d in self.player.devices:
            did = d.get("deviceID") or d.get("device_id")
            if did:
                self._last_timestamps[did] = now_ms
        self._default_device_id = (
            self.player.devices[0].get("deviceID")
            or self.player.devices[0].get("device_id")
        )
        logger.info(
            f"Voice listener init: {len(self.player.devices)} devices, "
            f"default={self._default_device_id}"
        )

        # 主循环
        while self._running:
            try:
                await self._poll_once()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Voice listener loop error: {e}", exc_info=True)
            await asyncio.sleep(self.poll_interval)

    async def _poll_once(self) -> None:
        """单次轮询所有设备"""
        if not self.player.service or not self.player.account:
            logger.debug("[voice] skip poll: service/account not ready")
            return

        auth_data = self._build_auth_data()
        if not auth_data:
            logger.debug("[voice] skip poll: auth_data build failed")
            return

        api = ConversationAPI(auth_data, self.player._session)
        if not api.has_credentials():
            logger.debug("[voice] skip poll: ConversationAPI missing credentials")
            return

        logger.debug(
            f"[voice] polling {len(self.player.devices)} devices, "
            f"timestamps={self._last_timestamps}"
        )

        # 并发拉取所有设备
        tasks = []
        for d in self.player.devices:
            did = d.get("deviceID") or d.get("device_id")
            hardware = d.get("hardware", "")
            if not did or not hardware:
                continue
            since_ms = self._last_timestamps.get(did, 0)
            tasks.append(self._poll_one_device(api, did, hardware, since_ms))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _poll_one_device(
        self, api: ConversationAPI, device_id: str, hardware: str, since_ms: int
    ) -> None:
        """拉取并处理单设备对话"""
        records = await api.get_latest(
            device_id=device_id, hardware=hardware, since_ms=since_ms, limit=2
        )
        if not records:
            return

        for rec in records:
            # 推进时间戳
            self._last_timestamps[device_id] = max(
                self._last_timestamps.get(device_id, 0), rec["time"]
            )
            await self._handle_record(device_id, rec)

    async def _handle_record(self, device_id: str, rec: dict) -> None:
        """处理一条对话记录：关键词匹配 → 本地查歌 → 推 URL"""
        query = rec.get("query", "").strip()
        if not query:
            return

        # 关键词匹配（取最长命中）
        matched_kw = None
        for kw in self.keywords:
            if query == kw or query.startswith(kw):
                matched_kw = kw
                break
        if not matched_kw:
            logger.debug(f"[voice] skip: '{query[:60]}'")
            return

        song_name = query[len(matched_kw):].strip()
        if not song_name:
            logger.info(f"[voice] 命中关键词 '{matched_kw}' 但歌名为空: '{query}'")
            return

        logger.info(
            f"[voice] 抢答: query='{query}' → song='{song_name}' device={device_id}"
        )

        # 本地匹配
        matches = self.library.search(song_name, top_k=1)
        if not matches:
            logger.info(f"[voice] 本地无匹配: '{song_name}'")
            return

        song = matches[0]
        logger.info(
            f"[voice] 本地命中: '{song['name']}' -> {song['path']}"
        )

        # 抢答：先 stop 音箱，再推 URL
        await self.player.play_song(device_id, song)

    def _build_auth_data(self) -> dict | None:
        """从 player.account.token + auth.json 构造 ConversationAPI 需要的 auth_data"""
        # 优先用 account.token 里的最新值（serviceToken 可能已被刷新）
        token = self.player.account.token if self.player.account else None
        if not token:
            return None

        # 从 auth.json 读 ua / deviceId（这些不在 token 里）
        auth_path = os.path.join(os.path.dirname(__file__), "..", "auth.json")
        auth_path = os.path.abspath(auth_path)
        ua = ""
        device_id_fallback = ""
        if os.path.isfile(auth_path):
            try:
                with open(auth_path, encoding="utf-8") as f:
                    full = json.load(f)
                ua = full.get("ua", "")
                device_id_fallback = full.get("deviceId", "")
            except Exception as e:
                logger.debug(f"读取 auth.json 失败: {e}")

        # 拼成 ConversationAPI 期待的格式
        auth_data = {
            "userId": token.get("userId", ""),
            "deviceId": token.get("deviceId", device_id_fallback),
            "ua": ua,
        }
        # serviceToken: 优先 token["micoapi"][1]
        micoapi = token.get("micoapi")
        if isinstance(micoapi, (list, tuple)) and len(micoapi) >= 2:
            auth_data["micoapi"] = [micoapi[0], micoapi[1]]
        # 兜底：顶层 serviceToken（扫码 callback 写入的）
        if "serviceToken" in token:
            auth_data["serviceToken"] = token["serviceToken"]

        if not auth_data.get("userId") or not (
            auth_data.get("micoapi", [None, None])[1] or auth_data.get("serviceToken")
        ):
            return None
        return auth_data