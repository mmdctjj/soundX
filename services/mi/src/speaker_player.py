from __future__ import annotations

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

# 需要使用 player_play_music API 的硬件型号列表
# 这些型号不支持 player_play_url，必须使用 player_play_music
_USE_PLAY_MUSIC_API = [
    "LX04", "LX05", "L05B", "L05C", "L06", "L06A", "LX06",
    "X08A", "X10A", "X08C", "X08E", "X8F", "X4B",
    "OH2", "OH2P", "X6A",
]


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
        1) 使用 MiTokenStore 包装 token 文件路径
        2) 创建 MiAccount 并显式调用 login('micoapi') 触发 serviceLogin + _securityTokenService
           → 这一步会刷新 micoapi 数组（ssecurity, serviceToken）
        3) 创建 MiNAService，调 device_list() 验证
        """
        from miservice import MiTokenStore

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

        # 3) 使用 MiTokenStore 创建 MiAccount，让 miservice 自动管理 token 持久化
        token_store = MiTokenStore(token_path)
        self.account = MiAccount(
            self._session,
            str(token.get("userId", "")),
            "",
            token_store,
        )

        # 4) 显式 login('micoapi') → 走 serviceLogin 拿 ssecurity → _securityTokenService 拿 serviceToken
        #    失败时不抛，miservice 内部已记录日志
        try:
            login_ok = await self.account.login("micoapi")
        except Exception as e:
            logger.warning(f"login(micoapi) 抛异常: {e}", exc_info=True)
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
            logger.warning(f"device_list 失败: {e}", exc_info=True)
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
        """将本地文件路径转为音箱可访问的 HTTP URL

        路径策略：取所有扫描根中最长的公共前缀作为 base，使 URL 与
        `/music/{path:path}` 路由的实际挂载根一致。
        """
        filepath_abs = os.path.abspath(filepath)
        roots = [os.path.abspath(r) for r in Config.scan_roots()]

        rel_path = os.path.basename(filepath_abs)
        best_root: str | None = None
        for r in roots:
            try:
                candidate = os.path.relpath(filepath_abs, r)
            except ValueError:
                continue
            if candidate.startswith(".."):
                continue
            if best_root is None or len(r) > len(best_root):
                best_root = r
                rel_path = candidate

        if best_root is None:
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

            await self.play_by_url(device_id, url, song.get("name", ""))

            self._current_device_id = device_id

            duration = song.get("duration", 0)
            if duration > 0:
                self._schedule_auto_next(duration, device_id)

            return True
        except Exception as e:
            logger.error(f"Failed to play song: {e}", exc_info=True)
            return False

    async def play_by_url(self, device_id: str, url: str, title: str = "") -> bool:
        """通过 URL 直接推送到音箱播放（不依赖本地 MusicLibrary）

        适用于 desktop 等外部客户端把当前 track 的 stream URL 转发给小爱音箱。
        若 URL 不可被音箱直接访问（典型场景：URL 含 localhost / 内网 IP），
        会先用 mi 自己的 HTTP 服务代理为对音箱可达的地址再推送。

        根据硬件型号选择播放 API：
        - LX04, LX05, L05B, L05C, L06, L06A, X08A, X10A, X08C, X08E, X8F, X4B, OH2, OH2P, X6A
          等型号需要使用 player_play_music API
        - 其他型号使用 player_play_url
        """
        if not self.service or not device_id or not url:
            logger.warning("Service/device_id/url not available")
            return False

        try:
            await self.stop(device_id)
            await asyncio.sleep(0.3)

            proxied_url = await self._proxy_url_if_needed(url)
            logger.info(f"Play-by-url on {device_id}: {title or url} -> {proxied_url}")
            
            # 获取设备硬件型号
            hardware = self._get_device_hardware(device_id)
            
            # 根据硬件型号选择播放 API
            if hardware in _USE_PLAY_MUSIC_API:
                result = await self._play_by_music_url(device_id, proxied_url)
            else:
                result = await self.service.ubus_request(
                    device_id,
                    "player_play_url",
                    "mediaplayer",
                    {"url": proxied_url, "type": 1, "media": "app_ios"}
                )
            
            if not result:
                logger.warning(f"play failed for {device_id} (hardware={hardware})")
                return False
                
            self._current_device_id = device_id
            return True
        except Exception as e:
            logger.error(f"play_by_url failed: {e}", exc_info=True)
            return False

    def _get_device_hardware(self, device_id: str) -> str:
        """从设备列表中获取硬件型号"""
        for d in self.devices:
            if d.get("deviceID") == device_id:
                return d.get("hardware", "")
        return ""

    async def _play_by_music_url(self, device_id: str, url: str, audio_id: str = "1582971365183456177") -> bool:
        """使用 player_play_music API 播放（适配需要此 API 的硬件型号）"""
        import json
        music = {
            "payload": {
                "audio_type": "MUSIC",
                "audio_items": [
                    {
                        "item_id": {
                            "audio_id": audio_id,
                            "cp": {
                                "album_id": "-1",
                                "episode_index": 0,
                                "id": "355454500",
                                "name": "xiaowei",
                            },
                        },
                        "stream": {"url": url},
                    }
                ],
                "list_params": {
                    "listId": "-1",
                    "loadmore_offset": 0,
                    "origin": "xiaowei",
                    "type": "MUSIC",
                },
            },
            "play_behavior": "REPLACE_ALL",
        }
        return await self.service.ubus_request(
            device_id,
            "player_play_music",
            "mediaplayer",
            {"startaudioid": audio_id, "music": json.dumps(music)}
        )

    async def _proxy_url_if_needed(self, url: str) -> str:
        """若 URL 指向 localhost/127.0.0.1，则改为走 mi 自身的 HTTP 服务代理。

        小爱音箱在局域网内无法把 desktop 的 localhost 解析到正确主机，
        通过代理让 mi 服务去 desktop 拉流，再用自己的 IP 暴露给音箱。
        """
        try:
            parsed = urllib.parse.urlparse(url)
            host = (parsed.hostname or "").lower()
            if host not in ("localhost", "127.0.0.1", "::1"):
                return url
            if not self._http_base:
                await self._setup_http_base()
            base = self._http_base[: -len("/music")] if self._http_base.endswith("/music") else self._http_base
            proxy_path = f"/api/proxy?url={urllib.parse.quote(url, safe='')}"
            return f"{base}{proxy_path}"
        except Exception as e:
            logger.warning(f"proxy_url_if_needed fallback to original: {e}")
            return url

    async def stop(self, device_id: str) -> bool:
        """停止播放"""
        if not self.service or not device_id:
            return False
        try:
            result = await self.service.ubus_request(
                device_id,
                "player_play_operation",
                "mediaplayer",
                {"action": "stop", "media": "app_ios"}
            )
            if result:
                logger.info(f"Stopped playback on {device_id}")
            return bool(result)
        except Exception as e:
            logger.warning(f"Stop failed: {e}")
            return False

    async def pause(self, device_id: str) -> bool:
        """暂停播放"""
        if not self.service or not device_id:
            return False
        try:
            result = await self.service.ubus_request(
                device_id,
                "player_play_operation",
                "mediaplayer",
                {"action": "pause", "media": "app_ios"}
            )
            if result:
                logger.info(f"Paused playback on {device_id}")
            return bool(result)
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
