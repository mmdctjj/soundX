from abc import ABC, abstractmethod
from typing import Dict, Any, List
import os
import re
import tempfile


class BaseTTS(ABC):
    """
    TTS 引擎抽象基类 (Adapter Pattern)
    """

    def __init__(self, config: Dict[str, Any]):
        self.config = config

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """服务商标识，如 'edge', 'volc', 'mimo', 'minimax'"""
        pass

    @property
    @abstractmethod
    def provider_label(self) -> str:
        """服务商显示名称，如 '微软 Edge', '火山引擎', '小米 MiMo', 'MiniMax'"""
        pass

    @abstractmethod
    async def check_credentials(self) -> bool:
        """
        验证 API 凭据是否有效
        """
        pass

    @abstractmethod
    async def get_voices(self) -> List[Dict[str, str]]:
        """
        获取该服务商支持的所有音色列表
        返回: [{"id": "voice_id", "name": "音色名称", "gender": "male/female", ...}]
        """
        pass

    @abstractmethod
    async def synthesize(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        """
        语音合成接口
        :param text: 待合成文本
        :param output_path: 目标音频保存路径
        :param voice: 发音人ID/角色
        :param kwargs: 各引擎额外参数（语速、音量等）
        :return: 是否成功
        """
        pass

    # ------------------------------------------------------------------
    # 长文本分段合成（默认实现，子类可覆盖）
    # ------------------------------------------------------------------

    @property
    def max_text_length(self) -> int:
        """
        单次合成最大文本长度（字符数）。
        子类可覆盖此属性以调整分段阈值。
        """
        return 500

    def split_text(self, text: str, max_chars: int = None) -> List[str]:
        """
        按语义边界切分长文本，每段不超过 max_chars。
        切分优先级：段落 > 句子 > 强制字数。
        """
        max_chars = max_chars or self.max_text_length
        if len(text) <= max_chars:
            return [text]

        segments = []
        # 先按段落切分
        paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

        current = ""
        for para in paragraphs:
            if len(para) > max_chars:
                # 段落过长，按句子切分
                sentences = re.split(r"([。！？.!?])", para)
                # sentences 形如 ["sentence1", "。", "sentence2", "！", ...]
                i = 0
                while i < len(sentences):
                    sentence = sentences[i]
                    if i + 1 < len(sentences) and sentences[i + 1] in "。！？.!?:":
                        sentence += sentences[i + 1]
                        i += 2
                    else:
                        i += 1

                    if len(sentence) > max_chars:
                        # 句子仍过长，强制按字数切分
                        for j in range(0, len(sentence), max_chars):
                            segments.append(sentence[j:j + max_chars])
                    elif len(current) + len(sentence) <= max_chars:
                        current += sentence
                    else:
                        if current:
                            segments.append(current)
                        current = sentence
            else:
                if len(current) + len(para) + 1 <= max_chars:
                    current += ("\n" if current else "") + para
                else:
                    if current:
                        segments.append(current)
                    current = para

        if current:
            segments.append(current)

        return segments

    def _merge_audio_files(self, segment_paths: List[str], output_path: str) -> bool:
        """
        使用 pydub 合并多个音频片段为单个文件。
        如果 pydub 不可用，尝试使用 ffmpeg CLI。
        """
        try:
            from pydub import AudioSegment
            combined = AudioSegment.empty()
            for path in segment_paths:
                audio = AudioSegment.from_file(path)
                combined += audio
            combined.export(output_path, format="mp3")
            return True
        except ImportError:
            pass

        # 兜底：ffmpeg concat demuxer
        try:
            import subprocess
            list_file = output_path + ".concat_list.txt"
            with open(list_file, "w", encoding="utf-8") as f:
                for path in segment_paths:
                    f.write(f"file '{os.path.abspath(path)}'\n")
            subprocess.run(
                ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", list_file, "-c", "copy", output_path],
                check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            os.remove(list_file)
            return True
        except Exception as e:
            print(f"[{self.provider_name}] Audio merge failed: {e}")
            return False

    async def synthesize_long(self, text: str, output_path: str, voice: str, **kwargs) -> bool:
        """
        长文本分段合成入口。
        如果文本长度未超过阈值，直接调用 synthesize；
        否则切分后逐段合成，最后合并音频。
        """
        max_chars = kwargs.get("max_chars", self.max_text_length)
        segments = self.split_text(text, max_chars)

        if len(segments) == 1:
            return await self.synthesize(text, output_path, voice, **kwargs)

        print(f"[{self.provider_name}] Long text detected ({len(text)} chars), splitting into {len(segments)} segments")

        temp_dir = tempfile.mkdtemp(prefix=f"{self.provider_name}_tts_")
        segment_paths = []
        all_success = True

        try:
            for idx, seg_text in enumerate(segments):
                seg_path = os.path.join(temp_dir, f"seg_{idx:04d}.mp3")
                print(f"[{self.provider_name}] Synthesizing segment {idx + 1}/{len(segments)} ({len(seg_text)} chars)")
                success = await self.synthesize(seg_text, seg_path, voice, **kwargs)
                if success:
                    segment_paths.append(seg_path)
                else:
                    print(f"[{self.provider_name}] Segment {idx + 1} failed, skipping")
                    all_success = False

            if not segment_paths:
                print(f"[{self.provider_name}] All segments failed")
                return False

            print(f"[{self.provider_name}] Merging {len(segment_paths)} segments into {output_path}")
            merged = self._merge_audio_files(segment_paths, output_path)
            if merged:
                print(f"[{self.provider_name}] Successfully merged audio")
            return merged

        finally:
            # 清理临时文件
            for p in segment_paths:
                try:
                    os.remove(p)
                except OSError:
                    pass
            try:
                os.rmdir(temp_dir)
            except OSError:
                pass
