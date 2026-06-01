# 小爱音箱本地音乐服务 (services/mi)

通过小米云服务轮询语音指令，解析后匹配本地音乐并通过 ubus 推送到小爱音箱播放。同时提供 Web App 页面供手动选择音箱和歌曲播放。

## 功能

- **语音指令播放**：对小爱音箱说"本地播放 周杰伦"，自动搜索本地音乐并播放
- **Web 控制台**：浏览器访问服务地址，手动选择音箱和歌曲播放
- **自动切歌**：通过 mutagen 获取音频时长，播放完毕后自动切换下一首

## 快速开始

```bash
cd services/mi
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# 编辑 .env 填入小米账号和音乐目录

python src/main.py
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MI_USERNAME | 小米账号 | - |
| MI_PASSWORD | 小米密码 | - |
| MUSIC_DIR | 本地音乐目录 | ~/Music |
| HTTP_HOST | HTTP 服务监听地址 | 0.0.0.0 |
| HTTP_PORT | HTTP 服务端口 | 8080 |
| COMMAND_PREFIX | 语音指令前缀 | 本地播放 |

## API 说明

- `GET /` — Web 控制台页面
- `GET /music/{path}` — 音乐文件静态服务
- `GET /api/devices` — 获取绑定的小爱音箱列表
- `GET /api/play?device_id=&song_index=` — 播放指定歌曲
- `GET /api/control?device_id=&action=` — 播放控制 (stop/pause/tts)

## 注意事项

- `HTTP_HOST` 必须是音箱在局域网能访问到的 IP，不能填 `127.0.0.1`
- 首次运行会提示扫码登录小米账号，Token 自动缓存到 `.mi.token`
- 播放前会自动调用 `player_stop()` 抢占音箱控制权
