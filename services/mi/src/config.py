import os
import logging
from dotenv import load_dotenv

# 加载 .env 环境变量
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger(__name__)
logger.info(f"Loaded .env from: {os.path.abspath(env_path)}")


class Config:
    """配置读取类，所有配置项从环境变量获取"""

    # 小米账号
    MI_USERNAME: str = os.getenv("MI_USERNAME", "")
    MI_PASSWORD: str = os.getenv("MI_PASSWORD", "")

    # 本地音乐目录（兼容旧版单目录配置；未显式设置时为空，避免无意中扫描默认目录）
    MUSIC_DIR: str = os.path.expanduser(os.getenv("MUSIC_DIR", ""))

    # 有声书目录（与 desktop 后端的 AUDIO_BOOK_DIR 对齐）
    AUDIO_BOOK_DIR: str = os.getenv("AUDIO_BOOK_DIR", "")

    # 音乐基础目录（与 desktop 后端的 MUSIC_BASE_DIR 对齐），实际音乐在 MUSIC_BASE_DIR/music
    MUSIC_BASE_DIR: str = os.getenv("MUSIC_BASE_DIR", "")

    # HTTP 服务配置
    HTTP_HOST: str = os.getenv("HTTP_HOST", "0.0.0.0")
    HTTP_PORT: int = int(os.getenv("HTTP_PORT", "8080"))

    # 语音指令前缀（兼容旧版单前缀模式，保留作为默认触发词之一）
    COMMAND_PREFIX: str = os.getenv("COMMAND_PREFIX", "本地播放")

    # 语音抢答关键词列表（命中后从本地音乐库匹配并推 URL 给音箱）
    # 多个关键词用英文逗号分隔，按最长匹配优先
    VOICE_KEYWORDS: list[str] = [
        kw.strip() for kw in os.getenv("VOICE_KEYWORDS", "本地播放,播放声仓,声仓").split(",")
        if kw.strip()
    ]

    # 对话记录轮询间隔（秒）。userprofile API 频率限制较宽松，1s 即可
    PULL_ASK_INTERVAL_SEC: float = float(os.getenv("PULL_ASK_INTERVAL_SEC", "1"))

    # 日志级别
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # 音乐文件扩展名
    SUPPORTED_EXTS: tuple = (".mp3", ".flac", ".wav", ".m4a", ".ogg")

    @classmethod
    def scan_roots(cls) -> list[str]:
        """返回实际需要扫描的根目录列表。

        直接使用 AUDIO_BOOK_DIR 和 MUSIC_BASE_DIR 作为扫描根（命名即语义：
        audio 目录是有声书，music 目录是音乐）。MUSIC_DIR 留作兜底。
        子目录与父目录都存在时只保留子目录，避免重复扫描。
        """
        candidates: list[str] = []
        if cls.AUDIO_BOOK_DIR:
            candidates.append(cls.AUDIO_BOOK_DIR)
        if cls.MUSIC_BASE_DIR:
            candidates.append(cls.MUSIC_BASE_DIR)
        if cls.MUSIC_DIR:
            candidates.append(cls.MUSIC_DIR)

        existing = sorted(
            {os.path.abspath(r) for r in candidates if r and os.path.isdir(r)}
        )

        # 若一个根是另一个根的祖先，仅保留最深的那个
        result: list[str] = []
        for r in existing:
            if any(
                r != other and os.path.commonpath([r, other]) == other
                for other in existing
            ):
                continue
            result.append(r)
        return result

    @classmethod
    def validate(cls) -> list[str]:
        """验证必填配置，返回缺失的配置项列表

        注意：MI_USERNAME/MI_PASSWORD 不再是必填项，因为支持扫码登录。
        如果未配置账号密码，用户可以通过 Web 控制台扫码登录。
        """
        missing = []
        if not cls.MI_USERNAME and not cls.MI_PASSWORD:
            logger.info("未配置小米账号密码，将使用扫码登录方式")
        roots = cls.scan_roots()
        if not roots:
            logger.warning(
                "No valid scan roots: set MUSIC_BASE_DIR / AUDIO_BOOK_DIR / MUSIC_DIR"
            )
        return missing


# 初始化时打印关键配置（隐藏密码）
logger.info(f"MI_USERNAME present: {bool(Config.MI_USERNAME)}")
logger.info(f"MUSIC_DIR: {Config.MUSIC_DIR}")
logger.info(f"AUDIO_BOOK_DIR: {Config.AUDIO_BOOK_DIR}")
logger.info(f"MUSIC_BASE_DIR: {Config.MUSIC_BASE_DIR}")
logger.info(f"Scan roots: {Config.scan_roots()}")
logger.info(f"HTTP_HOST: {Config.HTTP_HOST}:{Config.HTTP_PORT}")
logger.info(f"COMMAND_PREFIX: {Config.COMMAND_PREFIX}")
logger.info(f"VOICE_KEYWORDS: {Config.VOICE_KEYWORDS}")
logger.info(f"PULL_ASK_INTERVAL_SEC: {Config.PULL_ASK_INTERVAL_SEC}")
