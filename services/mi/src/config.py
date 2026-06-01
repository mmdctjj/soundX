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

    # 本地音乐目录
    MUSIC_DIR: str = os.path.expanduser(os.getenv("MUSIC_DIR", "~/Music"))

    # HTTP 服务配置
    HTTP_HOST: str = os.getenv("HTTP_HOST", "0.0.0.0")
    HTTP_PORT: int = int(os.getenv("HTTP_PORT", "8080"))

    # 语音指令前缀
    COMMAND_PREFIX: str = os.getenv("COMMAND_PREFIX", "本地播放")

    # 日志级别
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # 音乐文件扩展名
    SUPPORTED_EXTS: tuple = (".mp3", ".flac", ".wav", ".m4a", ".ogg")

    @classmethod
    def validate(cls) -> list[str]:
        """验证必填配置，返回缺失的配置项列表"""
        missing = []
        if not cls.MI_USERNAME:
            missing.append("MI_USERNAME")
        if not cls.MI_PASSWORD:
            missing.append("MI_PASSWORD")
        if not os.path.isdir(cls.MUSIC_DIR):
            logger.warning(f"MUSIC_DIR does not exist: {cls.MUSIC_DIR}")
        return missing


# 初始化时打印关键配置（隐藏密码）
logger.info(f"MI_USERNAME present: {bool(Config.MI_USERNAME)}")
logger.info(f"MUSIC_DIR: {Config.MUSIC_DIR}")
logger.info(f"HTTP_HOST: {Config.HTTP_HOST}:{Config.HTTP_PORT}")
logger.info(f"COMMAND_PREFIX: {Config.COMMAND_PREFIX}")
