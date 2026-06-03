from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
import logging
import asyncio
import os

from src.xiaomi_auth import MiQRAuth

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Auth"])

# 全局扫码登录实例
qr_auth = MiQRAuth()

# 记录当前正在进行的扫码任务
_current_qr_data: dict | None = None


@router.get("/auth/qrcode")
async def get_qrcode():
    """获取小米账号扫码登录二维码

    Returns:
        - already_logged_in: true  → 已有有效 token，无需扫码
        - qrcode_url: 二维码图片 URL（可直接在 img 标签中显示）
        - status_url: 轮询状态用的 URL
        - expire_seconds: 二维码过期时间
    """
    global _current_qr_data

    # 如果已有有效登录，直接返回
    if qr_auth.is_logged_in():
        return JSONResponse(
            content={
                "success": True,
                "already_logged_in": True,
                "qrcode_url": "",
                "message": "已登录，无需扫码",
            }
        )

    try:
        # 使用线程池执行同步的 requests 调用
        qr_data = await asyncio.to_thread(qr_auth.get_qrcode)

        # 扫码登录返回 False 表示已有有效 token
        if qr_data is False:
            return JSONResponse(
                content={
                    "success": True,
                    "already_logged_in": True,
                    "qrcode_url": "",
                    "message": "已登录，无需扫码",
                }
            )

        _current_qr_data = qr_data

        return JSONResponse(
            content={
                "success": True,
                "already_logged_in": False,
                "qrcode_url": qr_data.get("qr", ""),
                "login_url": qr_data.get("loginUrl", ""),
                "status_url": qr_data.get("lp", ""),
                "expire_seconds": 120,
            }
        )

    except Exception as e:
        logger.exception("获取二维码失败: %s", e)
        return JSONResponse(
            content={"success": False, "message": str(e)},
            status_code=500,
        )


@router.get("/auth/qrcode_status")
async def get_qrcode_status(lp_url: str = Query(..., description="轮询状态 URL")):
    """查询扫码登录状态

    前端需要轮询此接口，直到返回 success 或 expired。
    扫码成功后，token 会自动写入 auth.json 和 .mi.token。

    Args:
        lp_url: 从 /auth/qrcode 返回的 status_url

    Returns:
        status: pending | success | expired | error
    """
    try:
        # 使用线程池执行同步的轮询（会阻塞等待用户扫码）
        auth_data = await asyncio.to_thread(qr_auth.wait_for_login, lp_url)

        # 登录成功，写入 .mi.token
        token_path = os.path.join(os.path.dirname(__file__), "..", "..", ".mi.token")
        token_path = os.path.abspath(token_path)
        qr_auth.to_mi_token_file(token_path)

        return JSONResponse(
            content={
                "success": True,
                "status": "success",
                "message": "扫码登录成功",
                "user_id": auth_data.get("userId", ""),
            }
        )

    except ValueError as e:
        error_msg = str(e)
        if "超时" in error_msg:
            return JSONResponse(
                content={
                    "success": False,
                    "status": "expired",
                    "message": "二维码已过期，请重新获取",
                }
            )
        return JSONResponse(
            content={
                "success": False,
                "status": "error",
                "message": error_msg,
            }
        )

    except Exception as e:
        logger.exception("扫码登录失败: %s", e)
        return JSONResponse(
            content={
                "success": False,
                "status": "error",
                "message": str(e),
            }
        )


@router.post("/auth/logout")
async def logout():
    """退出登录，清除本地 token"""
    qr_auth.clear()

    # 同时删除 .mi.token
    token_path = os.path.join(os.path.dirname(__file__), "..", "..", ".mi.token")
    token_path = os.path.abspath(token_path)
    if os.path.isfile(token_path):
        try:
            os.remove(token_path)
        except Exception as e:
            logger.warning(f"删除 .mi.token 失败: {e}")

    return JSONResponse(
        content={"success": True, "message": "已退出登录"}
    )


@router.get("/auth/status")
async def auth_status():
    """查询当前登录状态"""
    is_logged = qr_auth.is_logged_in()
    return JSONResponse(
        content={
            "success": True,
            "logged_in": is_logged,
            "message": "已登录" if is_logged else "未登录",
        }
    )
