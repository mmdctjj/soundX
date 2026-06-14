#!/usr/bin/env python3
"""命令行扫码登录工具

直接在终端生成二维码并等待扫码，扫码成功后自动保存 token。
"""

import os
import sys
import time

# 添加 src 到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from src.xiaomi_auth import MiQRAuth


def main():
    auth = MiQRAuth()

    # 检查是否已登录
    if auth.is_logged_in():
        print("✅ 已登录，无需重复扫码")
        token = auth.get_miservice_token()
        if token and token.get("micoapi", ["", ""])[1]:
            print("✅ micoapi token 有效")
            return 0
        print("⚠️  token 可能不完整，建议重新扫码")

    print("\n" + "=" * 60)
    print("🔐 小米账号扫码登录")
    print("=" * 60)
    print()

    # 获取二维码
    try:
        qr = auth.get_qrcode()
    except Exception as e:
        print(f"❌ 获取二维码失败: {e}")
        return 1

    if qr is False:
        print("✅ 已登录，无需扫码")
        return 0

    qr_url = qr.get("qr", "")
    lp_url = qr.get("lp", "")
    login_url = qr.get("loginUrl", "")

    print("请用米家 APP 扫描下方二维码:")
    print()

    # 尝试在终端打印 ASCII 二维码
    try:
        import qrcode
        qr_obj = qrcode.QRCode(border=1, box_size=1)
        qr_obj.add_data(login_url or qr_url)
        qr_obj.print_ascii(invert=True)
        print()
    except Exception:
        pass

    print(f"或复制链接到浏览器打开: {qr_url}")
    print()
    print("=" * 60)
    print("等待扫码中... (二维码 60 秒内有效)")
    print("=" * 60)

    # 等待扫码
    try:
        result = auth.wait_for_login(lp_url, timeout=60)
    except Exception as e:
        print(f"\n❌ 扫码失败: {e}")
        return 1

    print(f"\n✅ 扫码成功！userId: {result.get('userId')}")

    # 验证 micoapi token
    token = auth.get_miservice_token()
    if token and token.get("micoapi", ["", ""])[1]:
        print("✅ micoapi serviceToken 获取成功")
    else:
        print("⚠️  警告: micoapi serviceToken 未获取到，可能需要重新扫码")

    # 保存 token
    token_path = os.path.abspath(".mi.token")
    if auth.to_mi_token_file(token_path):
        print(f"✅ Token 已保存到: {token_path}")
    else:
        print("❌ Token 保存失败")
        return 1

    print("\n🎉 登录完成！现在可以启动服务了:")
    print("   python -m src.main")
    return 0


if __name__ == "__main__":
    sys.exit(main())
