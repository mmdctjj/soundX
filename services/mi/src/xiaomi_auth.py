"""小米账号扫码登录模块

基于 xiaomusic 项目的 qrcode_login.py 简化实现。
通过米家 APP 扫描二维码完成小米账号认证，获取 token 供 miservice 使用。
"""

import base64
import hashlib
import json
import logging
import os
import random
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib import parse

import requests

logger = logging.getLogger(__name__)

# 小米扫码登录相关 URL
SERVICE_LOGIN_URL = "https://account.xiaomi.com/pass/serviceLogin?_json=true&sid=mijia&_locale=zh_CN"
LOGIN_URL = "https://account.xiaomi.com/longPolling/loginUrl"


def _generate_device_id() -> str:
    """生成随机设备 ID"""
    return "".join(
        random.choices(
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-",
            k=16,
        )
    )


def _parse_service_ret(response: requests.Response) -> dict:
    """解析小米返回的 JSONP 格式响应"""
    text = response.text.replace("&&&START&&&", "")
    return json.loads(text)


class MiQRAuth:
    """小米账号二维码登录"""

    def __init__(self, auth_dir: str | None = None):
        """
        Args:
            auth_dir: 认证数据保存目录，默认是项目根目录
        """
        if auth_dir is None:
            auth_dir = os.path.join(os.path.dirname(__file__), "..")
        self.auth_dir = os.path.abspath(auth_dir)
        self.auth_path = os.path.join(self.auth_dir, "auth.json")
        self.auth_data: dict = {}

        # 加载已有认证数据
        if os.path.isfile(self.auth_path):
            try:
                with open(self.auth_path, encoding="utf-8") as f:
                    self.auth_data = json.load(f)
                logger.info(f"[MiQRAuth] 已加载已有认证数据: {self.auth_path}")
            except Exception as e:
                logger.warning(f"[MiQRAuth] 加载 auth.json 失败: {e}")

    # ------------------------------------------------------------------ #
    #  内部辅助方法
    # ------------------------------------------------------------------ #

    def _device_id(self) -> str:
        if "deviceId" not in self.auth_data:
            self.auth_data["deviceId"] = _generate_device_id()
        return self.auth_data["deviceId"]

    def _save_auth_data(self):
        """保存认证数据到 auth.json"""
        self.auth_data["saveTime"] = int(time.time() * 1000)
        os.makedirs(self.auth_dir, exist_ok=True)
        with open(self.auth_path, "w", encoding="utf-8") as f:
            json.dump(self.auth_data, f, indent=2, ensure_ascii=False)
        os.chmod(self.auth_path, 0o600)
        logger.info(f"[MiQRAuth] 认证数据已保存到: {self.auth_path}")

    def _get_location(self) -> dict:
        """调用 serviceLogin 获取登录链接参数"""
        headers = {
            "User-Agent": (
                "Android-15-11.0.701-Xiaomi-23046RP50C-OS2.0.212.0.VMYCNXM-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF12-CN-"
                "1234567890ABCDEF1234567890ABCDEF12-SmartHome-MI_APP_STORE-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF1234|"
                "1234567890ABCDEF1234567890ABCDEF12345678|1234567890abcdef-64"
            ),
            "Connection": "keep-alive",
            "Accept-Encoding": "gzip",
            "Content-Type": "application/x-www-form-urlencoded",
            "Cookie": (
                f"deviceId={self._device_id()};"
                f"pass_o={self.auth_data.get('pass_o', '')};"
                f"passToken={self.auth_data.get('passToken', '')};"
                f"userId={self.auth_data.get('userId', '')};"
                f"cUserId={self.auth_data.get('cUserId', '')};"
                f"uLocale=zh_CN;"
            ),
        }

        resp = requests.get(SERVICE_LOGIN_URL, headers=headers, timeout=30)
        if resp.status_code != 200:
            raise ValueError(f"serviceLogin 请求失败: {resp.status_code}")

        data = _parse_service_ret(resp)
        logger.debug(f"[MiQRAuth] serviceLogin 响应: {data}")

        # code == 0 且 location 非空说明已有有效 token，直接刷新
        if data.get("code") == 0 and data.get("location"):
            location = data["location"]
            session = requests.Session()
            ret = session.get(location, headers=headers, timeout=30)
            if ret.status_code == 200 and ret.text == "ok":
                cookies = session.cookies.get_dict()
                self.auth_data.update(cookies)
                self.auth_data["ssecurity"] = data.get("ssecurity", "")
                self._save_auth_data()
                return {"code": 0, "message": "刷新Token成功"}

        # 否则返回 location 中的查询参数，用于后续获取二维码
        location_data = parse.parse_qs(parse.urlparse(data.get("location", "")).query)
        return {k: v[0] for k, v in location_data.items()}

    # ------------------------------------------------------------------ #
    #  公共 API
    # ------------------------------------------------------------------ #

    def get_qrcode(self) -> dict | bool:
        """获取二维码

        Returns:
            dict: 包含 qr(二维码图片URL), loginUrl, lp(轮询URL)
            bool: False 表示已有有效 token，无需扫码
        """
        location_data = self._get_location()
        if (
            location_data.get("code", -1) == 0
            and location_data.get("message", "") == "刷新Token成功"
        ):
            logger.info("[MiQRAuth] Token 有效，无需扫码")
            return False

        # 构造获取二维码的请求
        params = {
            **location_data,
            "theme": "",
            "bizDeviceType": "",
            "_hasLogo": "false",
            "_qrsize": "240",
            "_dc": str(int(time.time() * 1000)),
        }
        url = LOGIN_URL + "?" + parse.urlencode(params)

        headers = {
            "User-Agent": (
                "Android-15-11.0.701-Xiaomi-23046RP50C-OS2.0.212.0.VMYCNXM-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF12-CN-"
                "1234567890ABCDEF1234567890ABCDEF12-SmartHome-MI_APP_STORE-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF1234|"
                "1234567890ABCDEF1234567890ABCDEF12345678|1234567890abcdef-64"
            ),
            "Accept-Encoding": "gzip",
            "Content-Type": "application/x-www-form-urlencoded",
            "Connection": "keep-alive",
        }

        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            raise ValueError(f"获取二维码失败: {resp.status_code}")

        data = _parse_service_ret(resp)
        logger.debug(f"[MiQRAuth] 二维码响应: {data}")

        if data.get("code", 0) != 0:
            raise ValueError(f"获取二维码失败: {data.get('desc', '未知错误')}")

        return {
            "qr": data.get("qr", ""),           # 二维码图片 URL
            "loginUrl": data.get("loginUrl", ""), # 登录链接（可用于本地生成二维码）
            "lp": data.get("lp", ""),             # 轮询状态 URL
        }

    def wait_for_login(self, lp_url: str, timeout: int = 120) -> dict:
        """轮询等待扫码登录完成

        Args:
            lp_url: 从 get_qrcode 返回的 lp URL
            timeout: 超时时间（秒）

        Returns:
            dict: 登录成功后的认证数据
        """
        session = requests.Session()
        headers = {
            "User-Agent": (
                "Android-15-11.0.701-Xiaomi-23046RP50C-OS2.0.212.0.VMYCNXM-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF12-CN-"
                "1234567890ABCDEF1234567890ABCDEF12-SmartHome-MI_APP_STORE-"
                "ABCDEF1234567890ABCDEF1234567890ABCDEF1234|"
                "1234567890ABCDEF1234567890ABCDEF12345678|1234567890abcdef-64"
            ),
            "Accept-Encoding": "gzip",
            "Content-Type": "application/x-www-form-urlencoded",
            "Connection": "keep-alive",
        }

        logger.info(f"[MiQRAuth] 开始轮询扫码状态，超时 {timeout}s...")
        try:
            resp = session.get(lp_url, headers=headers, timeout=timeout)
        except requests.exceptions.Timeout as e:
            raise ValueError("扫码超时，请重试") from e

        if resp.status_code != 200:
            raise ValueError(f"轮询扫码状态失败: {resp.status_code}")

        data = _parse_service_ret(resp)
        logger.debug(f"[MiQRAuth] 扫码结果: {data}")

        if data.get("code", 0) != 0:
            raise ValueError(f"扫码登录失败: {data.get('desc', '未知错误')}")

        # 提取关键认证字段
        auth_keys = [
            "psecurity", "nonce", "ssecurity",
            "passToken", "userId", "cUserId",
        ]
        for key in auth_keys:
            if key in data:
                self.auth_data[key] = data[key]

        # 访问 callback URL 获取 serviceToken（micoapi 需要）
        callback_url = data.get("location", "")
        if callback_url:
            # 计算 clientSign
            nsec = "nonce=" + str(data.get("nonce", "")) + "&" + data.get("ssecurity", "")
            client_sign = base64.b64encode(hashlib.sha1(nsec.encode()).digest()).decode()
            callback_url += "&clientSign=" + parse.quote(client_sign)

            session.get(callback_url, headers=headers, timeout=30)
            cookies = session.cookies.get_dict()
            self.auth_data.update(cookies)
            logger.info(f"[MiQRAuth] callback cookies: {list(cookies.keys())}")

        # 设置过期时间（30天）
        self.auth_data["expireTime"] = int(
            (datetime.now() + timedelta(days=30)).timestamp() * 1000
        )

        self._save_auth_data()
        logger.info("[MiQRAuth] 扫码登录成功！")
        return self.auth_data

    def get_miservice_token(self) -> dict | None:
        """获取 miservice 所需的 token 字典

        Returns:
            miservice 格式的 token dict，或 None（未登录）
        """
        required = ["userId", "passToken", "ssecurity", "deviceId"]
        if not all(k in self.auth_data for k in required):
            return None

        # miservice 的 .mi.token 格式
        return {
            "deviceId": self.auth_data["deviceId"],
            "userId": self.auth_data["userId"],
            "passToken": self.auth_data["passToken"],
            "micoapi": [
                self.auth_data["ssecurity"],
                self.auth_data.get("serviceToken", ""),
            ],
        }

    def to_mi_token_file(self, token_path: str) -> bool:
        """将当前 auth 数据写入 miservice 的 .mi.token 文件

        Args:
            token_path: .mi.token 文件路径

        Returns:
            bool: 是否成功
        """
        token = self.get_miservice_token()
        if not token:
            logger.warning("[MiQRAuth] 没有有效的认证数据，无法写入 .mi.token")
            return False

        try:
            with open(token_path, "w", encoding="utf-8") as f:
                json.dump(token, f, indent=2, ensure_ascii=False)
            os.chmod(token_path, 0o600)
            logger.info(f"[MiQRAuth] 已写入 .mi.token: {token_path}")
            return True
        except Exception as e:
            logger.error(f"[MiQRAuth] 写入 .mi.token 失败: {e}")
            return False

    def is_logged_in(self) -> bool:
        """检查是否已有有效登录状态"""
        return self.get_miservice_token() is not None

    def clear(self):
        """清除本地认证数据"""
        self.auth_data = {}
        for path in [self.auth_path]:
            if os.path.isfile(path):
                try:
                    os.remove(path)
                    logger.info(f"[MiQRAuth] 已删除: {path}")
                except Exception as e:
                    logger.warning(f"[MiQRAuth] 删除 {path} 失败: {e}")
