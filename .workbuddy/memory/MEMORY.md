# AudioDock 项目长期记忆

## services/mi 小爱音箱管理（2026-08-28 新增）

- **存储**：`services/mi/src/db.py` 内置 sqlite3，DB 文件 `services/mi/data/xiaoai.db`，三张表 `wake_keywords` / `conversation_history`（`UNIQUE(device_id, timestamp_ms, query)` 去重）/ `cast_history`；所有 DB 操作必须 `asyncio.to_thread` 包裹防阻塞事件循环。
- **唤醒词优先级**：DB 优先。env `VOICE_KEYWORDS` 仅在 `init_db()` 首次启动且表为空时作种子；此后以 DB 为准（管理页 CRUD）。`voice_listener` 每 30s 自动 reload 唤醒词。
- **管理 API**（`web_api/management.py`，前缀 `/api`）：keywords CRUD + `GET /conversations` / `GET /casts`（page/size/device_id/start_ms/end_ms 分页）。前端统一走 `{服务器}/mi/api/*`（NestJS `/mi` 代理）。
- **埋点**：`voice_listener` 对话落库 + 语音抢答写 cast_history(source='voice')；`web_api/player.py` 的 play_by_url/play_playlist 成功后写 cast_history（失败仅 warning）。
- **登录态持久化（docker）**：`auth.json` + `.mi.token` 在 `services/mi/` 下，容器重建会丢——两个 docker-compose 都需挂载 `services/mi/auth.json`、`.mi.token`、`data/` 三个路径。
- **四端管理页**：desktop `Settings/MiSpeakerSettings.tsx`、mobile `app/mi-speaker.tsx`、mini `pages/mi-speaker/`、harmony `MiSpeakerPage.ets`（统一 4 Tab：登录/唤醒词/对话历史/投放历史）。
- **ArkTS 注意**：接口签名里不能用对象字面量类型（如 `Promise<{success:boolean}>`），必须定义显式 interface（`MiSimpleResponse`/`MiKeywordPatch` 等）；`t(key, params)` 插值参数是 `Array<[string, string|number]>` 元组；`@Entry build()` 需 if/else 包 builder 调用。
- **hvigor 构建副作用**：构建会改各模块 BuildProfile.ets 为 debug 并产生 `_tmp_*` 空文件，提交前需还原/清理。

## apps/harmony 构建环境

- **hvigor 命令行构建**：`DEVECO_SDK_HOME` 必须指向 DevEco 内置 SDK 根目录 `/Applications/DevEco-Studio.app/Contents/sdk`（包含 `default/hms`、`default/openharmony` 的上一层），**不要**指向 `default/openharmony` 或外部 `~/Library/OpenHarmony/Sdk`。
- **node**：用 DevEco 自带的 `/Applications/DevEco-Studio.app/Contents/tools/node/bin/node`，且必须 `env -u NODE_OPTIONS`（系统 NODE_OPTIONS 含 `--use-system-ca` 会让 DevEco node 拒绝启动）。
- **完整构建命令**：
  ```bash
  cd apps/harmony && env -u NODE_OPTIONS \
    DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk" \
    PATH="/Applications/DevEco-Studio.app/Contents/tools/node/bin:$PATH" \
    /Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw \
    --mode module -p product=default -p module=entry@default assembleHap --no-daemon
  ```
- **SDK 版本**：项目 target/compatible 是 API 24（HarmonyOS 6.1.1），对应 DevEco 内置 SDK（`/Applications/DevEco-Studio.app/Contents/sdk/default/sdk-pkg.json` 里 `apiVersion: 24`）。外部 `~/Library/OpenHarmony/Sdk` 下的 12/20/23 都不被 hvigor 6.24.4 识别。
- **daemon 缓存**：改 SDK 路径后如果还报 00303217，先 `hvigorw --stop-daemon` 清缓存再跑。

## apps/harmony AVSession 通知栏播控

- **媒体播控卡片显示三要素**（缺一不可）：
  1. AVSession `createAVSession` + `activate`
  2. `setAVMetadata`（title/artist/album/duration + PixelMap 封面）+ `setAVPlaybackState`（状态翻转立即下发 + 500ms 节流）
  3. AVPlayer 设 `audioRendererInfo.usage = STREAM_USAGE_MUSIC / AUDIOBOOK`（**initialized 态、首次 prepare 前**），系统靠它把发声流和 AVSession 关联
- 缺第 3 条时通知栏只显示 `startBackgroundRunning` 挂的"正在运行"普通通知，不出现媒体播控卡片。
- `startBackgroundRunning` 在 `@kit.BackgroundTasksKit` 的 `backgroundTaskManager` 上，**不在** `UIAbilityContext` 上。
- 长时任务需要 `module.json5` 申请 `ohos.permission.KEEP_BACKGROUND_RUNNING` + `backgroundModes: ["audioPlayback"]`。
- **`KEEP_BACKGROUND_RUNNING` 是 ACL 受限开放权限**（不是普通敏感权限）。光在 `module.json5` 声明没用，**必须经 AGC 审核通过**才能调 `startBackgroundRunning`，否则系统拒绝 → 通知栏只有普通"正在运行"通知、不出现媒体播控卡片。允许申请的场景：运动健康、音乐播放、导航、即时通讯（声仓属音乐播放符合）。调试白名单：发邮件到 `agconnect@huawei.com`（APP ID + 权限名 + 场景说明），1 工作日回复，通过后重生成 Profile（p7b）替换 + DevEco 重指定签名。正式上架走 AGC → 我的应用 → 权限与隐私 → 受限开放权限申请表单。
- **`startBackgroundRunning` 当前用法**（API 18+ 形式，`avSessionService.ets:280`）：`backgroundTaskManager.startBackgroundRunning(context, ['audioPlayback'], wantAgent)`，返回 `ContinuousTaskNotification`（含 `notificationId` / `slotType` / `contentType`）。不要照论坛帖写 `continuousTask` 命名空间——**`@kit.BackgroundTasksKit` 实际只导出 `backgroundTaskManager`**（来自官方 `.d.ts`），`continuousTask` 是假 API。
- **AVSession 控制事件名**（官方）：`'play'` / `'pause'` / `'playNext'` / `'playPrevious'` / `'seek'` / `'setSpeed'`。论坛贴写的 `'next'` / `'previous'` 是错的，照抄会编译失败。

### 真机日志暴露的隐性坑（hdc hilog 抓到）

- **`isReportOverSize,checkFail`**：`setAVPlaybackState` 每 500ms 一次会被系统限频直接拒绝。**进度不要持续上报**，只在状态翻转/seek/倍速变化时下发，进度由系统根据 `position.elapsedTime + (now - updateTime) * speed` 自己推算。
- **`CheckIfSendCapsule]not audio broker`**：系统不认会话是音频代理，实况胶囊/播控卡片不发送。根因是 `audioRendererInfo.usage` 没生效（被 try/catch 静默吞了），需要在设置后打日志确认。
- **`activate` 时机**：启动时 activate 的会话系统不认（空激活），必须在**首次真正播放**时 activate。activate 后立刻补发 `setAVMetadata`（未激活时发的可能被丢弃）+ `setBackgroundPlayMode(ENABLE_BACKGROUND_PLAY)`（API 24+，实况胶囊/锁屏大卡片听命于此标志位）。
- **抓日志命令**：`hdc shell "hilog | grep -iE 'avsession|AVSession'"`（设备需先 `hdc list targets` 确认连接）。
- **官方 AudioCast 实战经验**（`gitcode.com/HarmonyOS_Samples/AudioCast` 抓取）：每个 `play()` / `setPlaying()` 入口都要再调一次 `startBackgroundRunning`（不只是首次启动时申请一次）。后台长时任务超过系统回收阈值后会失效，需要每次进入播放再申请一次。官方 `wantAgent` 用 `context.abilityInfo.bundleName/name` 而不是 `applicationInfo.name` + 硬编码 abilityName，更稳。

## 封面/头像分级加载（2026-08-29 落地）

- **后端**：`GET /image/optimize?src=&w=&q=&fmt=`（`services/api`，`@Public`，sharp resize + 磁盘缓存 `${CACHE_DIR}/.optimized/<sha256>`）。**只放行 `/covers/`**——`/music/` 虽在白名单但 `resolveLocalSource` 返回 null 会 404。`preGenerate` 档位 `[300,600,900,1200]`。
- **统一规则（四端一致）**：档位 `[96,128,300,600,900,1200]`，`width` = **目标设备像素宽**（非 CSS，按显示尺寸×2）；`q=72`、`fmt=webp`。**≤300 恒压缩不分内外网**（列表瓶颈是解码内存：50 张 3000×3000 原图=1.8GB 位图必 OOM）；**>300 才分内外网**（内网原图直连/外网 optimize）。
- **同步约束**：`getImageUrl` 必须保持同步纯函数（mobile 40+/harmony 30+ 调用点）。网络判定走「模块级内存变量 + 异步刷新」：desktop `localStorage`/mini `getStorageSync` 同步读，mobile/harmony 用模块变量，在「服务器切换」钩子（AuthContext/AuthStore/EntryAbility）异步 `refreshNetworkMode()`。初始值 `false`（按外网=压缩，安全方向）。
- **关键坑**：① mv 页 `getImageUrl(path)` 拼**视频地址**是历史误用（mini/harmony/mobile 均已改回 `${baseURL}${path}`）；② `resolveArtworkUriForPlayer`/`downloadManager` 等会**落盘缓存**的路径必须限 ≤300 档，否则内网会把 5MB 原图写进缓存/ID3；③ 小程序 iOS<14 需 `<Image webp>` 属性；④ 不要用 `git stash` 做基线对比（会误 pop 旧 stash，用 git worktree）。

## @soundx/services workspace 包（2026-09-01 新增）

- **构建机制**：father 构建，入口指向 `dist/cjs/index.js`（main）/ `dist/esm/index.js`（module），**改 `src/` 后必须 `cd packages/services && pnpm build`**，否则引用端（mini/mobile/desktop）拿到的还是旧 dist，报 `xxx is not a function`。
- **mini 会员支付**：`plusWechatMpSession(code)` → `POST /auth/wechat-mp/session` 换 openid（缓存 `plus_open_id`）；下单 `clientType: 'miniprogram'` + `openId`，返回 `wechatPay` 直接喂给 `Taro.requestPayment`（timeStamp/nonceStr/package/signType=RSA/paySign=sign）。VIP 价格用 `plusGetVipCurrentLowestPrice()`（`GET /vip/current-lowest-price`），失败回落写死值。
