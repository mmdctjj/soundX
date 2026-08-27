"""语音指令监听器（对齐 songloft 做法）

从 userprofile.mina.mi.com 拉取小爱音箱的完整 NLP 结果（含用户原始 query），
匹配配置的关键词后从本地音乐库匹配并推 URL 给音箱播放。

与 songloft miot 插件的差异：
- songloft 用 JS 插件 + Web UI 可视化配置关键词；这里用环境变量配置关键词
- songloft 有 AI 意图识别 (ai_analyzer.ts)；这里只做关键词匹配
- songloft 多账号多设备；这里单账号多设备
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from typing import Optional

from src.config import Config
from src.conversation_api import ConversationAPI
from src import db
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
        # 关键词从 DB 读取（start 时加载，之后每 30s 热更新）
        # keywords 参数仅用于测试注入，正常启动传 None
        self._init_keywords = keywords
        self.keywords: list[str] = []
        self.poll_interval = (
            poll_interval if poll_interval is not None else Config.PULL_ASK_INTERVAL_SEC
        )
        self._running = False
        self._task: Optional[asyncio.Task] = None
        # 每设备独立时间戳（songloft 风格），避免设备间串扰
        self._last_timestamps: dict[str, int] = {}
        # 默认设备（列表中的第一个）
        self._default_device_id: Optional[str] = None
        # 唤醒词热更新计时
        self._kw_last_reload: float = 0
        self._kw_reload_interval: float = 30.0  # 30s

    async def start(self) -> None:
        """启动监听循环（非阻塞）"""
        if self._running:
            logger.warning("VoiceCommandListener already running")
            return

        # 加载唤醒词（优先 DB，空则 env 兜底）
        await self.reload_keywords()

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

    async def reload_keywords(self) -> None:
        """从 DB 加载唤醒词（DB 优先，env 兜底），按长度降序"""
        # 测试注入的关键词直接用，不查 DB
        if self._init_keywords is not None:
            self.keywords = sorted(self._init_keywords, key=len, reverse=True)
            return

        try:
            kws = await asyncio.to_thread(db.enabled_keywords)
        except Exception as e:
            logger.warning(f"[voice] 从 DB 加载唤醒词失败: {e}，使用 env 兜底")
            kws = []

        if kws:
            self.keywords = kws  # db.enabled_keywords 已按长度降序
        else:
            # env 兜底
            self.keywords = sorted(Config.VOICE_KEYWORDS, key=len, reverse=True)

        self._kw_last_reload = time.monotonic()
        logger.debug(f"[voice] 唤醒词已加载: {self.keywords}")

    def _device_name(self, device_id: str) -> str:
        """从 player.devices 查找设备名称"""
        for d in self.player.devices:
            did = d.get("deviceID") or d.get("device_id")
            if did == device_id:
                return d.get("name", "")
        return ""

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
                # 每 30s 热更新唤醒词
                if time.monotonic() - self._kw_last_reload >= self._kw_reload_interval:
                    await self.reload_keywords()
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
            logger.warning("[voice] skip poll: auth_data build failed（无 token）")
            return

        api = ConversationAPI(auth_data, self.player._session)
        if not api.has_credentials():
            logger.warning(
                "[voice] skip poll: ConversationAPI missing credentials "
                f"(userId={api.user_id!r} token={'yes' if api.service_token else 'no'} "
                f"ua={'yes' if api.user_agent else 'fallback'})"
            )
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
        """处理一条对话记录：先落库，再关键词匹配 → 本地查歌 → 推 URL"""
        query = rec.get("query", "").strip()
        answer_text = rec.get("answer_text", "")

        # 任何拉到的小爱记录都打 INFO，方便排错"用户说了啥"
        logger.info(
            f"[voice] 收到 device={device_id} "
            f"query='{query}' "
            f"answer='{answer_text[:80]}' "
            f"req_id={rec.get('request_id', '')}"
        )

        # 落库对话历史（INSERT OR IGNORE 去重，失败不影响主流程）
        if query:
            try:
                await asyncio.to_thread(
                    db.insert_conversation,
                    device_id,
                    self._device_name(device_id),
                    query,
                    answer_text,
                    rec.get("request_id", ""),
                    rec["time"],
                )
            except Exception as e:
                logger.warning(f"[voice] 对话落库失败: {e}")

        if not query:
            return

        # 关键词匹配（取最长命中）
        matched_kw = None
        for kw in self.keywords:
            if query == kw or query.startswith(kw):
                matched_kw = kw
                break
        if not matched_kw:
            # 明确打印没命中的关键词候选，让"为什么不触发"一目了然
            logger.info(
                f"[voice] 未命中关键词: query='{query}' "
                f"candidates={self.keywords}"
            )
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

        # 投放历史埋点（语音抢答来源）
        try:
            await asyncio.to_thread(
                db.insert_cast,
                device_id,
                self._device_name(device_id),
                song["name"],
                song.get("path", ""),
                "voice",
                1,
            )
        except Exception as e:
            logger.warning(f"[voice] 投放埋点失败: {e}")

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