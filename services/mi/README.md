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
| AUDIO_BOOK_DIR | 有声书目录（命名即语义：audio=有声书） | - |
| MUSIC_BASE_DIR | 音乐目录（命名即语义：music=音乐） | - |
| MUSIC_DIR | 兼容旧版单目录配置（兜底） | ~/Music |
| HTTP_HOST | HTTP 服务监听地址 | 0.0.0.0 |
| HTTP_PORT | HTTP 服务端口 | 8080 |
| COMMAND_PREFIX | 语音指令前缀 | 本地播放 |
| VOICE_KEYWORDS | 唤醒关键字（英文逗号分隔，**仅作首次种子**，DB 非空后不再生效） | 本地播放,播放声仓,声仓 |
| PULL_ASK_INTERVAL_SEC | 对话记录轮询间隔（秒） | 1 |
| LOG_LEVEL | 日志级别 | INFO |

> **唤醒关键字优先级**：服务启动时若 SQLite 表 `wake_keywords` 为空，会把 `VOICE_KEYWORDS` 环境变量作为一次性种子写入；此后以数据库为准，管理页面（`/api/keywords` CRUD）修改即时生效（语音监听每 30s 热更新一次）。

## API 说明

- `GET /` — Web 控制台页面
- `GET /music/{path}` — 音乐文件静态服务
- `GET /api/devices` — 获取绑定的小爱音箱列表
- `GET /api/play?device_id=&song_index=` — 播放指定歌曲
- `GET /api/control?device_id=&action=` — 播放控制 (stop/pause/tts)
- `GET /api/keywords` — 唤醒关键字列表
- `POST /api/keywords` — 新增唤醒关键字 `{keyword}`
- `PUT /api/keywords/{id}` — 更新唤醒关键字 `{keyword?}/{enabled?}`
- `DELETE /api/keywords/{id}` — 删除唤醒关键字
- `GET /api/conversations?page=&size=&device_id=` — 对话历史（分页）
- `GET /api/casts?page=&size=&device_id=` — 投放历史（分页）

## 数据存储

- SQLite 数据库：`data/xiaoai.db`（唤醒关键字 / 对话历史 / 投放历史三张表，自动建表）
- 登录态缓存：`auth.json`（完整认证数据）+ `.mi.token`（miservice token），扫码成功后自动写入
- **Docker 部署时**需将 `auth.json`、`.mi.token`、`data/` 挂载持久化，容器升级/重建后保持登录态与历史数据

## 注意事项

- `HTTP_HOST` 必须是音箱在局域网能访问到的 IP，不能填 `127.0.0.1`
- 首次运行会提示扫码登录小米账号，Token 自动缓存到 `.mi.token` 与 `auth.json`
- 播放前会自动调用 `player_stop()` 抢占音箱控制权
