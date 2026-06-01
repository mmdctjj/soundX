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
from src.web_api import music, player as player_api

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

    # 验证配置
    missing = Config.validate()
    if missing:
        logger.error(f"Missing required config: {missing}")
        raise RuntimeError(f"Missing config: {missing}")

    # 初始化音乐库
    library = MusicLibrary()
    music.library = library
    player_api.library = library

    # 初始化音箱播放器
    player = SpeakerPlayer()
    await player.init()
    music.player = player  # 如果需要的话
    player_api.player = player

    # 启动语音监听（后台任务）
    if player.devices:
        listener = VoiceCommandListener(player, library)
        import asyncio
        asyncio.create_task(listener.start())
        logger.info("Voice listener started")
    else:
        logger.warning("No Mi devices found, voice listener not started")


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


# 音乐文件静态服务
@app.get("/music/{path:path}")
async def serve_music(path: str):
    """提供音乐文件静态服务，音箱通过 HTTP 拉取音频"""
    music_dir = os.path.abspath(Config.MUSIC_DIR)
    target = os.path.normpath(os.path.join(music_dir, path))
    # 安全检查：确保不越界访问
    if not target.startswith(music_dir + os.sep) and target != music_dir:
        return HTMLResponse("Forbidden", status_code=403)
    if not os.path.isfile(target):
        return HTMLResponse("Not Found", status_code=404)
    return FileResponse(target)


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
</style>
</head>
<body>
<h1>🎵 小爱音箱音乐控制台</h1>

<div class="panel">
  <div class="panel-title">📻 选择音箱</div>
  <div class="device-list" id="devices"></div>
</div>

<div class="panel">
  <div class="panel-title">🎶 歌曲列表</div>
  <input type="text" id="search-box" placeholder="搜索歌曲..." oninput="filterSongs()">
  <div class="song-list" id="songs"></div>
</div>

<div class="panel">
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

loadDevices();
loadSongs();
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
    return {"status": "ok", "devices": len(player.devices) if player else 0, "songs": len(library.get_all()) if library else 0}


if __name__ == "__main__":
    import uvicorn
    try:
        logger.info(f"Starting Mi Music Service on {Config.HTTP_HOST}:{Config.HTTP_PORT}...")
        uvicorn.run(app, host=Config.HTTP_HOST, port=Config.HTTP_PORT)
    except Exception as e:
        logger.error(f"❌ Mi Music Service failed to start: {e}", exc_info=True)
        sys.exit(1)
