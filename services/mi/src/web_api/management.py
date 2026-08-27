"""小爱音箱管理 API：唤醒词 CRUD + 对话历史 + 投放历史"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src import db

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Management"])


# ===================== 唤醒关键字 =====================


class KeywordCreate(BaseModel):
    keyword: str


class KeywordUpdate(BaseModel):
    keyword: str | None = None
    enabled: bool | None = None


@router.get("/keywords")
async def list_keywords():
    """获取唤醒关键字列表"""
    keywords = await asyncio.to_thread(db.list_keywords)
    return {"keywords": keywords}


@router.post("/keywords", status_code=201)
async def add_keyword(body: KeywordCreate):
    """新增唤醒关键字"""
    result = await asyncio.to_thread(db.add_keyword, body.keyword)
    if result is None:
        raise HTTPException(status_code=409, detail="关键字已存在或为空")
    return {"keyword": result}


@router.put("/keywords/{kw_id}")
async def update_keyword(kw_id: int, body: KeywordUpdate):
    """更新唤醒关键字（改词或启用/禁用）"""
    ok = await asyncio.to_thread(db.update_keyword, kw_id, body.keyword, body.enabled)
    if not ok:
        raise HTTPException(status_code=404, detail="关键字不存在")
    return {"success": True}


@router.delete("/keywords/{kw_id}")
async def delete_keyword(kw_id: int):
    """删除唤醒关键字"""
    ok = await asyncio.to_thread(db.delete_keyword, kw_id)
    if not ok:
        raise HTTPException(status_code=404, detail="关键字不存在")
    return {"success": True}


# ===================== 对话历史 =====================


@router.get("/conversations")
async def list_conversations(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    device_id: str | None = Query(None),
    start_ms: int | None = Query(None),
    end_ms: int | None = Query(None),
):
    """分页查询对话历史"""
    items, total = await asyncio.to_thread(
        db.list_conversations, page, size, device_id, start_ms, end_ms
    )
    return {"items": items, "total": total, "page": page, "size": size}


# ===================== 投放历史 =====================


@router.get("/casts")
async def list_casts(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    device_id: str | None = Query(None),
    start_ms: int | None = Query(None),
    end_ms: int | None = Query(None),
):
    """分页查询投放历史"""
    items, total = await asyncio.to_thread(
        db.list_casts, page, size, device_id, start_ms, end_ms
    )
    return {"items": items, "total": total, "page": page, "size": size}
