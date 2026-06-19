from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import logging

from src.music_library import MusicLibrary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Music"])

# 全局 music_library 实例，由 main.py 初始化后注入
library: MusicLibrary | None = None


@router.get("/songs")
async def list_songs():
    """返回所有本地歌曲列表"""
    if not library:
        raise HTTPException(status_code=500, detail="Music library not initialized")
    songs = library.get_all()
    return JSONResponse(content={
        "total": len(songs),
        "songs": [
            {"index": i, "name": s["name"], "filename": s["filename"], "duration": s["duration"]}
            for i, s in enumerate(songs)
        ]
    })


@router.get("/search")
async def search_songs(q: str = Query(..., description="搜索关键词")):
    """模糊搜索本地歌曲"""
    if not library:
        raise HTTPException(status_code=500, detail="Music library not initialized")
    matches = library.search(q, top_k=10)
    return JSONResponse(content={
        "query": q,
        "results": [
            {"index": library.get_all().index(s) if s in library.get_all() else -1,
             "name": s["name"], "filename": s["filename"], "duration": s["duration"]}
            for s in matches
        ]
    })
