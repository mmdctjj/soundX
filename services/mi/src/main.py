from __future__ import annotations

import os
import sys
import logging
from pathlib import Path

from dotenv import load_dotenv

# 加载环境变量
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path=env_path)
print(f"[main] Loaded .env from: {os.path.abspath(env_path)}")
print(f"[main] MI_USERNAME present: {bool(os.getenv('MI_USERNAME'))}")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from src.config import Config
from src.music_library import MusicLibrary
from src.speaker_player import SpeakerPlayer
from src.voice_listener import VoiceCommandListener
from src.web_api import music, player as player_api, auth

# 全局共享实例
library: MusicLibrary | None = None
player: SpeakerPlayer | None = None
listener: VoiceCommandListener | None = None

logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="XiaoAi-Music", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 初始化共享实例
@app.on_event("startup")
async def startup_event():
    global library, player, listener

    # 初始化音乐库（不依赖登录）
    library = MusicLibrary()
    music.library = library
    player_api.library = library

    # 初始化音箱播放器
    player = SpeakerPlayer()
    try:
        await player.init()
    except Exception as e:
        logger.error(f"SpeakerPlayer init error: {e}", exc_info=True)
        # 即使初始化失败也继续运行，前端会提示扫码登录

    music.player = player
    player_api.player = player

    # 启动语音监听（只在登录成功且有设备时启动）
    if player and player.is_logged_in() and player.devices:
        listener = VoiceCommandListener(player, library)
        await listener.start()
        logger.info("Voice listener started")
    else:
        logger.warning(
            "Voice listener not started: "
            f"logged_in={player.is_logged_in() if player else False}, "
            f"devices={len(player.devices) if player else 0}"
        )


@app.on_event("shutdown")
async def shutdown_event():
    if listener:
        listener.stop()
    if player:
        player.cancel_auto_next()
        await player.close()
    logger.info("Shutdown complete")


# 注册 API 路由
app.include_router(music.router, prefix="/api")
app.include_router(player_api.router, prefix="/api")
app.include_router(auth.router, prefix="/api")


# 音乐文件静态服务
@app.get("/music/{path:path}")
async def serve_music(path: str):
    """提供音乐文件静态服务，音箱通过 HTTP 拉取音频

    支持多个扫描根（AUDIO_BOOK_DIR / MUSIC_BASE_DIR/music / MUSIC_DIR）。
    按 URL 路径前缀与各根的相对路径尝试解析，命中后返回文件。
    """
    for root in Config.scan_roots():
        candidate = os.path.normpath(os.path.join(root, path))
        try:
            if os.path.commonpath([candidate, root]) != root:
                continue
        except ValueError:
            continue
        if os.path.isfile(candidate):
            return FileResponse(candidate)
    return HTMLResponse("Not Found", status_code=404)


@app.get("/api/proxy")
async def proxy_audio(url: str):
    """代理外部音频流：把 desktop 等不可被音箱直接访问的 URL 转为 mi 自身可访问的地址。

    小爱音箱在 LAN 中无法把 desktop 的 localhost/127.0.0.1 解析到正确主机。
    此端点让 mi 服务从原 URL 拉流，再以流式响应转发给音箱。
    """
    if not player or not player._session:
        return HTMLResponse("Service not initialized", status_code=503)

    if not url or not url.startswith(("http://", "https://")):
        return HTMLResponse("Invalid url", status_code=400)

    import aiohttp
    from fastapi.responses import StreamingResponse

    session: aiohttp.ClientSession = player._session
    req_headers = {
        "User-Agent": "MiHome/6.0.103",
    }

    async def stream():
        async with session.get(url, headers=req_headers, allow_redirects=True) as upstream:
            if upstream.status != 200:
                logger.warning(f"proxy upstream {upstream.status} for {url}")
                return
            async for chunk in upstream.content.iter_chunked(64 * 1024):
                yield chunk

    return StreamingResponse(
        stream(),
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )


# 内嵌 HTML 前端页面
HTML_PAGE = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小爱音箱音乐控制台</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f5f5f5; color: #333; max-width: 800px; margin: 0 auto; padding: 16px;
  }
  h1 { font-size: 1.5rem; color: #ff6700; margin-bottom: 12px; text-align: center; }
  .panel {
    background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .panel-title { font-size: 1rem; font-weight: 600; margin-bottom: 10px; color: #666; }
  .device-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .device-btn {
    padding: 8px 14px; border: 2px solid #ddd; border-radius: 20px; background: #fff;
    cursor: pointer; font-size: 0.9rem; transition: all 0.2s;
  }
  .device-btn:hover { border-color: #ff6700; }
  .device-btn.active { border-color: #ff6700; background: #fff0e6; color: #ff6700; font-weight: 600; }
  .song-list { max-height: 320px; overflow-y: auto; }
  .song-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 0; border-bottom: 1px solid #f0f0f0;
  }
  .song-item:last-child { border-bottom: none; }
  .song-name { font-size: 0.95rem; flex: 1; }
  .song-duration { font-size: 0.8rem; color: #999; margin-right: 10px; }
  .play-btn {
    padding: 5px 12px; border: none; border-radius: 14px; background: #ff6700;
    color: #fff; font-size: 0.85rem; cursor: pointer;
  }
  .play-btn:hover { background: #e65c00; }
  .controls { display: flex; gap: 10px; justify-content: center; }
  .ctrl-btn {
    padding: 10px 20px; border: none; border-radius: 20px; background: #eee;
    color: #333; font-size: 0.95rem; cursor: pointer;
  }
  .ctrl-btn:hover { background: #ddd; }
  .ctrl-btn.primary { background: #ff6700; color: #fff; }
  .ctrl-btn.primary:hover { background: #e65c00; }
  .status { text-align: center; font-size: 0.85rem; color: #999; margin-top: 8px; }
  #search-box {
    width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 20px;
    font-size: 0.95rem; margin-bottom: 10px;
  }
  /* 登录面板样式 */
  .login-panel { text-align: center; padding: 20px; }
  .login-panel img { max-width: 200px; margin: 10px auto; display: block; }
  .login-panel .login-status { color: #666; margin: 10px 0; }
  .login-panel .login-btn {
    padding: 10px 24px; border: none; border-radius: 20px; background: #ff6700;
    color: #fff; font-size: 1rem; cursor: pointer; margin: 5px;
  }
  .login-panel .login-btn:hover { background: #e65c00; }
  .login-panel .login-btn.secondary { background: #999; }
  .login-panel .login-btn.secondary:hover { background: #777; }
  .hidden { display: none; }
</style>
</head>
<body>
<h1>🎵 小爱音箱音乐控制台</h1>

<!-- 登录面板 -->
<div class="panel" id="login-panel">
  <div class="panel-title">🔐 小米账号登录</div>
  <div class="login-panel" id="login-content">
    <div id="login-status" class="login-status">检查登录状态...</div>
    <img id="qrcode-img" class="hidden" src="" alt="扫码登录">
    <div id="login-actions">
      <button class="login-btn hidden" id="btn-get-qr" onclick="getQRCode()">获取二维码</button>
      <button class="login-btn secondary hidden" id="btn-logout" onclick="doLogout()">退出登录</button>
    </div>
  </div>
</div>

<!-- 设备面板（登录后显示） -->
<div class="panel hidden" id="device-panel">
  <div class="panel-title">📻 选择音箱</div>
  <div class="device-list" id="devices"></div>
</div>

<!-- 歌曲面板 -->
<div class="panel">
  <div class="panel-title">🎶 歌曲列表</div>
  <input type="text" id="search-box" placeholder="搜索歌曲..." oninput="filterSongs()">
  <div class="song-list" id="songs"></div>
</div>

<!-- 控制面板 -->
<div class="panel hidden" id="control-panel">
  <div class="panel-title">⏯️ 播放控制</div>
  <div class="controls">
    <button class="ctrl-btn" onclick="doControl('stop')">⏹ 停止</button>
    <button class="ctrl-btn" onclick="doControl('pause')">⏸ 暂停</button>
    <button class="ctrl-btn primary" onclick="doControl('tts')">🔊 TTS 测试</button>
  </div>
  <div class="status" id="status">请选择设备</div>
</div>

<script>
let devices = [];
let songs = [];
let selectedDevice = null;
let isLoggedIn = false;

// 页面加载时检查登录状态
async function checkLoginStatus() {
  const res = await fetch('/api/auth/status');
  const data = await res.json();
  isLoggedIn = data.logged_in;
  updateLoginUI();
  if (isLoggedIn) {
    loadDevices();
  }
  loadSongs();
}

function updateLoginUI() {
  const statusEl = document.getElementById('login-status');
  const qrImg = document.getElementById('qrcode-img');
  const btnGetQr = document.getElementById('btn-get-qr');
  const btnLogout = document.getElementById('btn-logout');
  const devicePanel = document.getElementById('device-panel');
  const controlPanel = document.getElementById('control-panel');

  if (isLoggedIn) {
    statusEl.textContent = '✅ 已登录';
    qrImg.classList.add('hidden');
    btnGetQr.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    devicePanel.classList.remove('hidden');
    controlPanel.classList.remove('hidden');
  } else {
    statusEl.textContent = '❌ 未登录，请使用米家 APP 扫码登录';
    btnGetQr.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    devicePanel.classList.add('hidden');
    controlPanel.classList.add('hidden');
  }
}

async function getQRCode() {
  const statusEl = document.getElementById('login-status');
  const qrImg = document.getElementById('qrcode-img');
  const btnGetQr = document.getElementById('btn-get-qr');

  statusEl.textContent = '正在获取二维码...';
  btnGetQr.disabled = true;

  try {
    const res = await fetch('/api/auth/qrcode');
    const data = await res.json();

    if (data.already_logged_in) {
      isLoggedIn = true;
      updateLoginUI();
      loadDevices();
      return;
    }

    if (data.success && data.qrcode_url) {
      qrImg.src = data.qrcode_url;
      qrImg.classList.remove('hidden');
      statusEl.textContent = '请使用米家 APP 扫描上方二维码';

      // 开始轮询扫码状态
      pollQRStatus(data.status_url);
    } else {
      statusEl.textContent = '获取二维码失败: ' + (data.message || 'unknown');
      btnGetQr.disabled = false;
    }
  } catch (e) {
    statusEl.textContent = '获取二维码出错: ' + e.message;
    btnGetQr.disabled = false;
  }
}

async function pollQRStatus(lpUrl) {
  const statusEl = document.getElementById('login-status');
  const btnGetQr = document.getElementById('btn-get-qr');

  try {
    const res = await fetch('/api/auth/qrcode_status?lp_url=' + encodeURIComponent(lpUrl));
    const data = await res.json();

    if (data.status === 'success') {
      isLoggedIn = true;
      statusEl.textContent = '✅ 扫码登录成功！正在刷新...';
      updateLoginUI();
      loadDevices();
      // 刷新页面以重新加载后端状态
      setTimeout(() => location.reload(), 1500);
    } else if (data.status === 'expired') {
      statusEl.textContent = '⏱ 二维码已过期，请重新获取';
      btnGetQr.disabled = false;
    } else {
      statusEl.textContent = '扫码登录失败: ' + (data.message || 'unknown');
      btnGetQr.disabled = false;
    }
  } catch (e) {
    statusEl.textContent = '轮询出错: ' + e.message;
    btnGetQr.disabled = false;
  }
}

async function doLogout() {
  if (!confirm('确定要退出登录吗？')) return;
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  const data = await res.json();
  if (data.success) {
    isLoggedIn = false;
    updateLoginUI();
    location.reload();
  }
}

async function loadDevices() {
  const res = await fetch('/api/devices');
  const data = await res.json();
  devices = data.devices || [];
  const container = document.getElementById('devices');
  container.innerHTML = '';
  if (devices.length === 0) {
    container.innerHTML = '<span style="color:#999">未发现设备</span>';
    return;
  }
  devices.forEach((d, idx) => {
    const btn = document.createElement('button');
    btn.className = 'device-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = d.name || d.device_id;
    btn.onclick = () => selectDevice(d.device_id, btn);
    container.appendChild(btn);
  });
  selectedDevice = devices[0].device_id;
  updateStatus();
}

function selectDevice(id, btn) {
  selectedDevice = id;
  document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updateStatus();
}

async function loadSongs() {
  const res = await fetch('/api/songs');
  const data = await res.json();
  songs = data.songs || [];
  renderSongs(songs);
}

function renderSongs(list) {
  const container = document.getElementById('songs');
  container.innerHTML = '';
  if (list.length === 0) {
    container.innerHTML = '<div style="color:#999;text-align:center;padding:20px">暂无歌曲</div>';
    return;
  }
  list.forEach(s => {
    const item = document.createElement('div');
    item.className = 'song-item';
    const dur = s.duration ? Math.round(s.duration) + 's' : '';
    item.innerHTML = `
      <span class="song-name">${s.name}</span>
      <span class="song-duration">${dur}</span>
      <button class="play-btn" onclick="playSong(${s.index})">▶ 播放</button>
    `;
    container.appendChild(item);
  });
}

function filterSongs() {
  const q = document.getElementById('search-box').value.trim().toLowerCase();
  if (!q) { renderSongs(songs); return; }
  const filtered = songs.filter(s => s.name.toLowerCase().includes(q));
  renderSongs(filtered);
}

async function playSong(index) {
  if (!selectedDevice) { alert('请先选择音箱'); return; }
  const res = await fetch(`/api/play?device_id=${selectedDevice}&song_index=${index}`);
  const data = await res.json();
  if (res.ok) {
    updateStatus('正在播放: ' + data.song);
  } else {
    updateStatus('播放失败: ' + (data.detail || 'unknown'));
  }
}

async function doControl(action) {
  if (!selectedDevice) { alert('请先选择音箱'); return; }
  let url = `/api/control?device_id=${selectedDevice}&action=${action}`;
  if (action === 'tts') {
    const text = prompt('请输入 TTS 文本:', '你好，这是测试');
    if (!text) return;
    url += '&text=' + encodeURIComponent(text);
  }
  const res = await fetch(url);
  const data = await res.json();
  if (res.ok) {
    updateStatus('操作成功: ' + action);
  } else {
    updateStatus('操作失败: ' + (data.detail || 'unknown'));
  }
}

function updateStatus(msg) {
  const dev = devices.find(d => d.device_id === selectedDevice);
  const devName = dev ? dev.name : '未选择';
  document.getElementById('status').textContent = (msg || '就绪') + ' | 设备: ' + devName;
}

// 初始化
checkLoginStatus();
</script>
</body>
</html>
"""

@app.get("/")
async def index():
    """主页面"""
    return HTMLResponse(content=HTML_PAGE)


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "logged_in": player.is_logged_in() if player else False,
        "devices": len(player.devices) if player else 0,
        "songs": len(library.get_all()) if library else 0,
    }


if __name__ == "__main__":
    import uvicorn
    try:
        logger.info(f"Starting Mi Music Service on {Config.HTTP_HOST}:{Config.HTTP_PORT}...")
        uvicorn.run(app, host=Config.HTTP_HOST, port=Config.HTTP_PORT)
    except Exception as e:
        logger.error(f"❌ Mi Music Service failed to start: {e}", exc_info=True)
        sys.exit(1)
