import os
import logging
import asyncio
import urllib.parse
import socket
import aiohttp
from miservice import MiAccount, MiNAService

from src.config import Config

logger = logging.getLogger(__name__)


def _get_lan_ip() -> str:
    """获取本机局域网 IP（非 127.0.0.1）"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


class SpeakerPlayer:
    """音箱播放控制：封装 miservice 实现设备发现、播放、停止、TTS 等功能"""

    def __init__(self):
        self.account: MiAccount | None = None
        self.service: MiNAService | None = None
        self.devices: list[dict] = []
        self._http_base: str = ""
        self._auto_next_timer: asyncio.TimerHandle | None = None
        self._current_device_id: str | None = None
        self._session: aiohttp.ClientSession | None = None

    async def init(self) -> None:
        """初始化 miservice：创建 aiohttp session → 认证 → 发现设备"""
        # 创建 aiohttp session（MiAccount 第一个参数必须传 session）
        self._session = aiohttp.ClientSession()

        # 构建 token 缓存路径
        token_path = os.path.join(os.path.dirname(__file__), "..", ".mi.token")
        token_path = os.path.abspath(token_path)

        # 创建 MiAccount 实例（第一个参数是 session，不是用户名）
        self.account = MiAccount(
            self._session,
            Config.MI_USERNAME,
            Config.MI_PASSWORD,
            token_path,
        )

        # 登录（miservice 的 login 是 async 方法，直接 await）
        try:
            await self.account.login("micoapi")
            logger.info("MiAccount login success")
        except Exception as e:
            logger.error(f"MiAccount login failed: {e}", exc_info=True)
            raise

        # 创建 MiNAService
        self.service = MiNAService(self.account)

        # 发现设备
        await self._discover_devices()

        # 构建 HTTP 文件服务基础 URL
        host = _get_lan_ip() if Config.HTTP_HOST == "0.0.0.0" else Config.HTTP_HOST
        self._http_base = f"http://{host}:{Config.HTTP_PORT}/music"
        logger.info(f"HTTP file base URL: {self._http_base}")

    async def _discover_devices(self) -> None:
        """发现绑定的小米音箱设备"""
        try:
            result = await self.service.device_list()
            self.devices = result or []
            logger.info(f"Discovered {len(self.devices)} devices")
            for d in self.devices:
                logger.info(f"  - {d.get('name', 'Unknown')} ({d.get('deviceID', 'N/A')})")
        except Exception as e:
            logger.error(f"Device discovery failed: {e}", exc_info=True)
            self.devices = []

    def file_to_url(self, filepath: str) -> str:
        """将本地文件路径转为音箱可访问的 HTTP URL"""
        # 计算相对于音乐目录的相对路径
        music_dir = os.path.abspath(Config.MUSIC_DIR)
        filepath_abs = os.path.abspath(filepath)
        try:
            rel_path = os.path.relpath(filepath_abs, music_dir)
        except ValueError:
            rel_path = os.path.basename(filepath_abs)
        # URL 编码路径中的特殊字符
        encoded = "/".join(urllib.parse.quote(part) for part in rel_path.split(os.sep))
        return f"{self._http_base}/{encoded}"

    async def play_song(self, device_id: str, song: dict) -> bool:
        """播放指定歌曲（先 stop 再 play）"""
        if not self.service or not device_id:
            logger.warning("Service or device_id not available")
            return False

        try:
            # 先停止当前播放，强制抢占控制权
            await self.stop(device_id)
            await asyncio.sleep(0.3)

            url = self.file_to_url(song["path"])
            logger.info(f"Playing {song['name']} on {device_id} -> {url}")

            await self.service.play_by_url(device_id, url)

            self._current_device_id = device_id

            # 设置自动切歌定时器
            duration = song.get("duration", 0)
            if duration > 0:
                self._schedule_auto_next(duration, device_id)

            return True
        except Exception as e:
            logger.error(f"Failed to play song: {e}", exc_info=True)
            return False

    async def stop(self, device_id: str) -> bool:
        """停止播放"""
        if not self.service or not device_id:
            return False
        try:
            await self.service.player_stop(device_id)
            logger.info(f"Stopped playback on {device_id}")
            return True
        except Exception as e:
            logger.warning(f"Stop failed: {e}")
            return False

    async def pause(self, device_id: str) -> bool:
        """暂停播放"""
        if not self.service or not device_id:
            return False
        try:
            await self.service.player_pause(device_id)
            logger.info(f"Paused playback on {device_id}")
            return True
        except Exception as e:
            logger.warning(f"Pause failed: {e}")
            return False

    async def tts(self, device_id: str, text: str) -> bool:
        """TTS 播报文本"""
        if not self.service or not device_id:
            return False
        try:
            await self.service.text_to_speech(device_id, text)
            logger.info(f"TTS on {device_id}: {text}")
            return True
        except Exception as e:
            logger.warning(f"TTS failed: {e}")
            return False

    async def close(self) -> None:
        """关闭 aiohttp session"""
        if self._session:
            await self._session.close()
            logger.info("aiohttp session closed")

    def _schedule_auto_next(self, duration: float, device_id: str) -> None:
        """设置自动切歌定时器"""
        # 取消之前的定时器
        if self._auto_next_timer:
            self._auto_next_timer.cancel()

        # 延迟 duration + 1 秒后触发
        delay = duration + 1.0
        logger.info(f"Auto-next scheduled in {delay:.1f}s")
        # 这里仅做演示，实际自动切歌需结合 music_library 和外部回调
        # 由调用方在切歌逻辑中实现

    def cancel_auto_next(self) -> None:
        """取消自动切歌定时器"""
        if self._auto_next_timer:
            self._auto_next_timer.cancel()
            self._auto_next_timer = None
