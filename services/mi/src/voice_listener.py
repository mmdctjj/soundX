import asyncio
import logging
import time
from src.config import Config
from src.music_library import MusicLibrary
from src.speaker_player import SpeakerPlayer

logger = logging.getLogger(__name__)


class VoiceCommandListener:
    """语音指令监听器：轮询小米云端对话记录，解析指令并播放本地音乐"""

    def __init__(self, player: SpeakerPlayer, library: MusicLibrary, prefix: str = None):
        self.player = player
        self.library = library
        self.prefix = prefix or Config.COMMAND_PREFIX
        self._running = False
        self._last_timestamp = int(time.time() * 1000)  # 毫秒时间戳，避免启动时处理历史对话
        self._default_device_id: str | None = None

    async def start(self) -> None:
        """启动监听循环"""
        self._running = True
        logger.info("VoiceCommandListener started")

        # 等待设备列表加载，获取第一个设备作为默认设备
        while self._running and not self.player.devices:
            await asyncio.sleep(1)
        if self.player.devices:
            self._default_device_id = self.player.devices[0]["deviceID"]
            logger.info(f"Default device: {self._default_device_id}")

        while self._running:
            try:
                await self._poll_once()
            except Exception as e:
                logger.error(f"Error polling voice commands: {e}", exc_info=True)
            await asyncio.sleep(1)

    def stop(self) -> None:
        """停止监听"""
        self._running = False
        logger.info("VoiceCommandListener stopped")

    async def _poll_once(self) -> None:
        """单次轮询：获取最新对话并处理"""
        if not self.player.service:
            return

        try:
            result = await self.player.service.get_latest_ask(self._default_device_id)
        except Exception as e:
            logger.warning(f"get_latest_ask failed: {e}")
            return

        if not result or not isinstance(result, list):
            return

        for record in result:
            # 提取时间戳和查询文本（miservice 返回结构）
            record_time = record.get("timestamp_ms", 0)
            if record_time <= self._last_timestamp:
                continue
            self._last_timestamp = record_time

            # 提取用户说的话：record['response']['answer'][0]['question']
            query = ""
            try:
                response = record.get("response", {})
                answer = response.get("answer", [])
                if answer and isinstance(answer, list):
                    query = answer[0].get("question", "")
            except (KeyError, IndexError, TypeError):
                query = ""

            if not query:
                continue

            logger.info(f"New voice query: {query}")
            await self._handle_query(query)

    async def _handle_query(self, query: str) -> None:
        """解析语音指令并播放匹配的歌曲"""
        # 前缀过滤
        if not query.startswith(self.prefix):
            logger.debug(f"Query ignored (no prefix '{self.prefix}'): {query}")
            return

        # 提取歌曲名（去除前缀和空白）
        song_name = query[len(self.prefix):].strip()
        if not song_name:
            logger.info("Empty song name after prefix removal")
            return

        logger.info(f"Searching for: {song_name}")
        matches = self.library.search(song_name, top_k=1)

        if not matches:
            logger.info(f"No match found for: {song_name}")
            await self.player.tts(self._default_device_id, f"未找到歌曲 {song_name}")
            return

        song = matches[0]
        logger.info(f"Match found: {song['name']} -> {song['path']}")
        await self.player.play_song(self._default_device_id, song)
