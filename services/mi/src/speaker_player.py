import os
import logging
import asyncio
import urllib.parse
import socket
import json
import aiohttp
from miservice import MiAccount, MiNAService

from src.config import Config
from src.xiaomi_auth import MiQRAuth

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
        self._login_ok: bool = False

    async def init(self) -> None:
        """初始化 miservice：尝试 token 登录 → 密码登录 → 标记为未登录"""
        self._session = aiohttp.ClientSession()
        token_path = os.path.join(os.path.dirname(__file__), "..", ".mi.token")
        token_path = os.path.abspath(token_path)

        # 1. 优先尝试从 .mi.token 加载已有 token
        if await self._try_token_login(token_path):
            logger.info("SpeakerPlayer init: 使用已有 token 登录成功")
            return

        # 2. 尝试密码登录（如果配置了用户名密码）
        if Config.MI_USERNAME and Config.MI_PASSWORD:
            if await self._try_password_login(token_path):
                logger.info("SpeakerPlayer init: 密码登录成功")
                return
            logger.warning("SpeakerPlayer init: 密码登录失败，可能需要扫码登录")
        else:
            logger.info("SpeakerPlayer init: 未配置用户名密码，跳过密码登录")

        # 3. 都失败了，标记为未登录，但不抛异常（让服务继续运行，前端提示扫码）
        self._login_ok = False
        logger.warning(
            "SpeakerPlayer init: 未登录。请访问 Web 控制台进行扫码登录。"
        )

    async def _try_token_login(self, token_path: str) -> bool:
        """尝试从 .mi.token 加载 token 登录"""
        if not os.path.isfile(token_path):
            return False

        try:
            with open(token_path, encoding="utf-8") as f:
                token = json.load(f)

            if not token or "userId" not in token or "passToken" not in token:
                return False

            # 检查 micoapi serviceToken 是否存在
            micoapi = token.get("micoapi", ["", ""])
            if not micoapi or len(micoapi) < 2 or not micoapi[1]:
                logger.warning("Token 缺少 micoapi serviceToken，需要重新登录")
                return False

            # 创建 MiAccount 并注入 token
            self.account = MiAccount(
                self._session,
                token.get("userId", ""),
                "",
                token_path,
            )
            self.account.token = token
            self.service = MiNAService(self.account)

            # 验证 token 是否有效（调用 device_list）
            try:
                result = await self.service.device_list()
                self.devices = result or []
                self._login_ok = True
                await self._setup_http_base()
                logger.info(
                    f"Token 登录成功，发现 {len(self.devices)} 个设备"
                )
                return True
            except Exception as e:
                logger.warning(f"Token 验证失败: {e}")
                self.service = None
                self.account = None
                return False

        except Exception as e:
            logger.warning(f"读取 .mi.token 失败: {e}")
            return False

    async def _try_password_login(self, token_path: str) -> bool:
        """尝试用户名密码登录"""
        self.account = MiAccount(
            self._session,
            Config.MI_USERNAME,
            Config.MI_PASSWORD,
            token_path,
        )

        try:
            login_result = await self.account.login("micoapi")
            if not login_result:
                logger.error("MiAccount login 返回 False")
                return False

            logger.info("MiAccount 密码登录成功")
            self.service = MiNAService(self.account)
            await self._discover_devices()
            await self._setup_http_base()
            self._login_ok = True
            return True

        except Exception as e:
            error_str = str(e)
            if "securityStatus" in error_str:
                logger.error(
                    f"密码登录需要二次验证（securityStatus）: {e}"
                )
            elif "70016" in error_str or "登录验证失败" in error_str:
                logger.error(f"密码登录验证失败（70016）: {e}")
            else:
                logger.error(f"密码登录失败: {e}")
            return False

    async def _setup_http_base(self) -> None:
        """构建 HTTP 文件服务基础 URL"""
        host = _get_lan_ip() if Config.HTTP_HOST == "0.0.0.0" else Config.HTTP_HOST
        self._http_base = f"http://{host}:{Config.HTTP_PORT}/music"
        logger.info(f"HTTP file base URL: {self._http_base}")

    async def _discover_devices(self) -> None:
        """发现绑定的小米音箱设备"""
        if not self.service:
            return
        try:
            result = await self.service.device_list()
            self.devices = result or []
            logger.info(f"Discovered {len(self.devices)} devices")
            for d in self.devices:
                logger.info(
                    f"  - {d.get('name', 'Unknown')} ({d.get('deviceID', 'N/A')})"
                )
        except Exception as e:
            logger.error(f"Device discovery failed: {e}", exc_info=True)
            self.devices = []

    def is_logged_in(self) -> bool:
        """是否已登录"""
        return self._login_ok

    async def reload_after_login(self) -> bool:
        """扫码登录成功后重新初始化"""
        if self._login_ok:
            return True
        await self.init()
        return self._login_ok

    def file_to_url(self, filepath: str) -> str:
        """将本地文件路径转为音箱可访问的 HTTP URL"""
        music_dir = os.path.abspath(Config.MUSIC_DIR)
        filepath_abs = os.path.abspath(filepath)
        try:
            rel_path = os.path.relpath(filepath_abs, music_dir)
        except ValueError:
            rel_path = os.path.basename(filepath_abs)
        encoded = "/".join(urllib.parse.quote(part) for part in rel_path.split(os.sep))
        return f"{self._http_base}/{encoded}"

    async def play_song(self, device_id: str, song: dict) -> bool:
        """播放指定歌曲（先 stop 再 play）

        通过 ubus 调用 mediaplayer 的 play 方法推送 URL 到音箱
        """
        if not self.service or not device_id:
            logger.warning("Service or device_id not available")
            return False

        try:
            # 先停止当前播放
            await self.stop(device_id)
            await asyncio.sleep(0.3)

            url = self.file_to_url(song["path"])
            logger.info(f"Playing {song['name']} on {device_id} -> {url}")

            # 使用 miservice-fork 的 play_by_url 方法
            await self.service.play_by_url(device_id, url)

            self._current_device_id = device_id
            duration = song.get("duration", 0)
            if duration > 0:
                self._schedule_auto_next(duration, device_id)
            logger.info(f"Playback started: {song['name']}")
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
        if self._auto_next_timer:
            self._auto_next_timer.cancel()

        delay = duration + 1.0
        logger.info(f"Auto-next scheduled in {delay:.1f}s")

    def cancel_auto_next(self) -> None:
        """取消自动切歌定时器"""
        if self._auto_next_timer:
            self._auto_next_timer.cancel()
            self._auto_next_timer = None
