import os
import difflib
import logging
from pathlib import Path
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.wave import WAVE
from mutagen.mp4 import MP4
from mutagen.oggvorbis import OggVorbis

from src.config import Config

logger = logging.getLogger(__name__)


class MusicLibrary:
    """本地音乐库扫描与模糊搜索"""

    def __init__(self, music_dir: str = None):
        self.music_dir = music_dir or Config.MUSIC_DIR
        self.songs: list[dict] = []
        self._scan()

    def _scan(self) -> None:
        """扫描音乐目录，收集所有支持的音频文件"""
        self.songs = []
        if not os.path.isdir(self.music_dir):
            logger.warning(f"Music directory not found: {self.music_dir}")
            return

        for root, _, files in os.walk(self.music_dir):
            for filename in files:
                if filename.lower().endswith(Config.SUPPORTED_EXTS):
                    filepath = os.path.join(root, filename)
                    name = os.path.splitext(filename)[0]
                    duration = self._get_duration(filepath)
                    self.songs.append({
                        "name": name,
                        "filename": filename,
                        "path": filepath,
                        "duration": duration,
                    })

        self.songs.sort(key=lambda s: s["name"])
        logger.info(f"Scanned {len(self.songs)} songs from {self.music_dir}")

    def _get_duration(self, filepath: str) -> float:
        """获取音频文件时长（秒）"""
        try:
            ext = os.path.splitext(filepath)[1].lower()
            if ext == ".mp3":
                audio = MP3(filepath)
            elif ext == ".flac":
                audio = FLAC(filepath)
            elif ext == ".wav":
                audio = WAVE(filepath)
            elif ext == ".m4a":
                audio = MP4(filepath)
            elif ext == ".ogg":
                audio = OggVorbis(filepath)
            else:
                return 0.0
            return audio.info.length
        except Exception as e:
            logger.warning(f"Failed to get duration for {filepath}: {e}")
            return 0.0

    def search(self, query: str, top_k: int = 5) -> list[dict]:
        """使用 difflib 模糊搜索歌曲"""
        if not query or not self.songs:
            return []

        # 对每个歌曲名计算相似度
        matches = []
        for song in self.songs:
            ratio = difflib.SequenceMatcher(None, query.lower(), song["name"].lower()).ratio()
            matches.append((ratio, song))

        matches.sort(key=lambda x: x[0], reverse=True)
        return [song for ratio, song in matches[:top_k] if ratio > 0.1]

    def get_all(self) -> list[dict]:
        """返回所有歌曲列表"""
        return self.songs

    def get_by_index(self, index: int) -> dict | None:
        """根据索引获取歌曲"""
        if 0 <= index < len(self.songs):
            return self.songs[index]
        return None

    def refresh(self) -> None:
        """重新扫描音乐目录"""
        self._scan()
