from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import JSONResponse
import logging

from src.speaker_player import SpeakerPlayer
from src.music_library import MusicLibrary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Player"])

# 全局实例，由 main.py 初始化后注入
player: SpeakerPlayer | None = None
library: MusicLibrary | None = None


@router.get("/devices")
async def list_devices():
    """获取绑定的小爱音箱设备列表"""
    if not player:
        raise HTTPException(status_code=500, detail="Player not initialized")
    return JSONResponse(content={
        "devices": [
            {
                "device_id": d.get("deviceID", ""),
                "name": d.get("name", "Unknown"),
                "model": d.get("model", ""),
            }
            for d in player.devices
        ]
    })


@router.get("/play")
async def play_song(
    device_id: str = Query(..., description="音箱设备 ID"),
    song_index: int = Query(..., description="歌曲索引"),
):
    """播放指定歌曲"""
    if not player or not library:
        raise HTTPException(status_code=500, detail="Service not initialized")
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    song = library.get_by_index(song_index)
    if not song:
        raise HTTPException(status_code=404, detail=f"Song index {song_index} not found")

    success = await player.play_song(device_id, song)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to play song")
    return JSONResponse(content={"success": True, "song": song["name"]})


@router.post("/play_by_url")
async def play_by_url(
    request: Request,
    device_id: str = Query(..., description="音箱设备 ID"),
    url: str = Query(..., description="音箱可访问的音频 HTTP URL"),
    title: str = Query(None, description="歌曲名称（用于日志）"),
):
    """通过 URL 直接推送音频到音箱

    适用于 desktop 等外部客户端：把当前播放的 track 流地址转发给小爱音箱。
    允许传入相对路径（如 `/api/track/stream/123`），会自动用当前请求的 origin 补全。
    """
    if not player:
        raise HTTPException(status_code=500, detail="Player not initialized")
    if not device_id or not url:
        raise HTTPException(status_code=400, detail="device_id and url are required")

    # 补全相对路径：用当前请求的 scheme + host 拼成绝对 URL
    if not url.startswith(("http://", "https://")):
        scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
        host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if not host:
            raise HTTPException(status_code=400, detail="url must be http(s) or a relative path with a valid Host header")
        url = f"{scheme}://{host}{url if url.startswith('/') else '/' + url}"

    success = await player.play_by_url(device_id, url, title or url)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to play by url")
    return JSONResponse(content={"success": True, "title": title or url})


@router.get("/control")
async def control_player(
    device_id: str = Query(..., description="音箱设备 ID"),
    action: str = Query(..., description="操作: stop | pause | tts"),
    text: str = Query(None, description="TTS 文本（action=tts 时必填）"),
):
    """播放控制"""
    if not player:
        raise HTTPException(status_code=500, detail="Player not initialized")
    if not device_id:
        raise HTTPException(status_code=400, detail="device_id is required")

    action = action.lower().strip()
    if action == "stop":
        success = await player.stop(device_id)
    elif action == "pause":
        success = await player.pause(device_id)
    elif action == "tts":
        if not text:
            raise HTTPException(status_code=400, detail="text is required for tts action")
        success = await player.tts(device_id, text)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to execute {action}")
    return JSONResponse(content={"success": True, "action": action})
