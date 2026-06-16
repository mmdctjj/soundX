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
        """初始化 miservice：尝试 token 登录 → 标记为未登录"""
        self._session = aiohttp.ClientSession()
        token_path = os.path.join(os.path.dirname(__file__), "..", ".mi.token")
        token_path = os.path.abspath(token_path)

        # 1. 优先尝试从 .mi.token / auth.json 加载已有 token
        if await self._try_token_login(token_path):
            logger.info("SpeakerPlayer init: 使用已有 token 登录成功")
            return

        # 2. 没有有效 token → 不再尝试密码登录（小米接口需要二次验证/扫码）
        #    用户必须通过 Web 控制台扫码登录
        logger.info("SpeakerPlayer init: 无有效 token，请访问 Web 控制台扫码登录")

        # 3. 都失败了，标记为未登录，但不抛异常（让服务继续运行，前端提示扫码）
        self._login_ok = False
        logger.warning(
            "SpeakerPlayer init: 未登录。请访问 Web 控制台进行扫码登录。"
        )

    async def _try_token_login(self, token_path: str) -> bool:
        """尝试从 .mi.token 或 auth.json 加载 token 登录

        对齐 xiaomusic auth.py login_miboy：
        1) 注入 {passToken, userId, deviceId} 到 MiAccount
        2) 显式调用 login('micoapi') 触发 serviceLogin + _securityTokenService
           → 这一步会刷新 micoapi 数组（ssecurity, serviceToken）
        3) 创建 MiNAService，调 device_list() 验证
        """
        token = None

        # 1) 先尝试 .mi.token（miservice 格式）
        if os.path.isfile(token_path):
            try:
                with open(token_path, encoding="utf-8") as f:
                    token = json.load(f)
                logger.info(f"加载 .mi.token: keys={list(token.keys()) if token else None}")
            except Exception as e:
                logger.warning(f"读取 .mi.token 失败: {e}")
                token = None

        # 2) 再尝试 auth.json（扫码登录保存的格式）作为兜底
        auth_path = os.path.join(os.path.dirname(__file__), "..", "auth.json")
        auth_path = os.path.abspath(auth_path)
        qr_auth = MiQRAuth()
        if (not token or "userId" not in token or "passToken" not in token) and qr_auth.is_logged_in():
            token = qr_auth.get_miservice_token()
            if token:
                qr_auth.to_mi_token_file(token_path)

        if not token or "userId" not in token or "passToken" not in token:
            return False

        # 3) 注入 token 走 miservice（仅传 passToken/userId/deviceId，micoapi 留给 login 刷新）
        self.account = MiAccount(
            self._session,
            Config.MI_USERNAME or token.get("userId", ""),
            Config.MI_PASSWORD or "",
            token_path,
        )
        self.account.token = {
            "passToken": token["passToken"],
            "userId": token["userId"],
            "deviceId": token.get("deviceId", ""),
        }

        # 4) 显式 login('micoapi') → 走 serviceLogin 拿 ssecurity → _securityTokenService 拿 serviceToken
        #    失败时不抛，miservice 内部已记录日志
        try:
            login_ok = await self.account.login("micoapi")
        except Exception as e:
            logger.warning(f"login(micoapi) 抛异常: {e}")
            login_ok = False

        if not login_ok:
            # 区分 70016（需扫码）与临时网络失败
            error_str = str(self.account.token) if self.account else ""
            logger.warning(f"login(micoapi) 失败；token={list(self.account.token.keys()) if self.account and self.account.token else None}")
            self.account = None
            return False

        logger.info(f"MiAccount login(micoapi) 成功，token keys={list(self.account.token.keys())}")

        # 5) 创建 MiNAService 并发现设备
        self.service = MiNAService(self.account)
        try:
            result = await self.service.device_list()
            self.devices = result or []
            self._login_ok = True
            await self._setup_http_base()
            logger.info(f"Token 登录成功，发现 {len(self.devices)} 个设备")
            return True
        except Exception as e:
            logger.warning(f"device_list 失败: {e}")
            self.service = None
            self.account = None
            self._login_ok = False
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
        # 关闭旧的 session，避免泄漏
        if self._session:
            try:
                await self._session.close()
            except Exception:
                pass
            self._session = None
        # 重置状态
        self.account = None
        self.service = None
        self.devices = []
        self._login_ok = False
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
        """播放指定歌曲（先 stop 再 play）"""
        if not self.service or not device_id:
            logger.warning("Service or device_id not available")
            return False

        try:
            await self.stop(device_id)
            await asyncio.sleep(0.3)

            url = self.file_to_url(song["path"])
            logger.info(f"Playing {song['name']} on {device_id} -> {url}")

            await self.service.play_by_url(device_id, url)

            self._current_device_id = device_id

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
        if self._auto_next_timer:
            self._auto_next_timer.cancel()

        delay = duration + 1.0
        logger.info(f"Auto-next scheduled in {delay:.1f}s")

    def cancel_auto_next(self) -> None:
        """取消自动切歌定时器"""
        if self._auto_next_timer:
            self._auto_next_timer.cancel()
            self._auto_next_timer = None
