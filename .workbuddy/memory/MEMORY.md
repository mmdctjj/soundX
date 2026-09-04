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

## hm 桌面小部件（2026-09-01 新增，对齐 iOS 4 种 widget）

- **架构**：`EntryFormAbility`（`products/entry/src/main/ets/formability/`，1 个 Ability 管 4 种卡片）+ 4 个 ArkTS 卡片组件（`widgets/AudioDockPlayerCard/PlaylistCard/PlayerHistoryCard/LatestCard.ets`）。`WidgetBridge`（`services/WidgetBridge.ets`）主 App→卡片数据推送；`WidgetCommandHandler`（`services/WidgetCommandHandler.ets`）卡片→主 App 指令。
- **数据共享**：主 App 和卡片进程共享 preferences（同 HAP + 同 STORE_NAME `audiodock_kv`），formName→formId 映射走 `widget_form_ids_${formName}` 索引（API 24 FormInfo 无 formId 字段，必须由 EntryFormAbility.onAddForm 主动注册）。`onAddForm` 同步返回空骨架 → 异步 fire-and-forget 加载真实数据 + updateForm。
- **postCardAction 是全局函数**（不需 import），调用 `postCardAction(this, { action: 'message', params: { message: 'play_track:trackId' } })`；message 紧凑 `action:id` 格式（EntryFormAbility.onFormEvent 用 `:` 拆解）。
- **FormExtensionAbility import 路径（API 24）**：`from '@ohos.app.form.FormExtensionAbility'`（**不是 `@kit.AbilityKit`/`@kit.FormKit`**），formBindingData/formProvider/formInfo 都走同 prefix。
- **form_config.json 必填**：supportDimensions 允许值仅 `'1*2','2*2','2*4','4*4','1*1','6*4','2*3','3*3'`（**没有 4*2**！）；scheduledUpdateTime 必须 HH:MM 单点（如 "00:00"）；defaultDimension 字符串 "2*2"，运行时 FormInfo.defaultDimension 是 number 枚举（2=2*2, 4=4*4）。
- **⚠️ onAddForm 读 want.parameters 三个 key 名（最容易踩的坑）**：用 `import formInfo from '@ohos.app.form.formInfo'`，三个常量是
  - `formInfo.FormParam.IDENTITY_KEY = "ohos.extra.param.key.form_identity"`（**不是 `form_id`**，代码误用 `form_id` 会拿到空字符串 → `updateForm('')` 报 "The formId is invalid" → 卡片永远停在首屏骨架）
  - `formInfo.FormParam.NAME_KEY = "ohos.extra.param.key.form_name"`
  - `formInfo.FormParam.DIMENSION_KEY = "ohos.extra.param.key.form_dimension"`（值是数字枚举 `Dimension_2_2=2 / Dimension_4_4=4`，**必须归一化**成 `"2*2"` / `"4*4"`，否则卡片 `formDimension === '4*4'` 判断恒假，所有尺寸全走 2x2 布局）
  - `EntryFormAbility.readFormId / normalizeDimension` 已封装，多 key 兜底 + 枚举映射 1→'1*2' / 2→'2*2' / 3→'2*4' / 4→'4*4' / 5→'2*1'。
- **⚠️ preferences 是每进程一份内存缓存实例**（卡片始终 "未在播放" 的真正根因之一）：主 App 进程和卡片进程各持一份 `Preferences` 实例，一方 `flush()` 写磁盘后，另一进程仍返回旧的内存缓存值 → 主 App 读不到卡片注册的 formId、卡片读不到主 App 写的 `widget_now_playing`。修复：`PreferencesStore.pull()` = `removePreferencesFromCache(ctx, STORE_NAME)` + 重新 `getPreferences`，已封装 `getFresh` / `getJSONFresh`。**任何读「会被对方进程写入」的数据都走 fresh 系列**。
- **⚠️ 持久化的脏 formId 注册表**：旧版误用 key 把 `[""]` 写进 `widget_form_ids_${formName}`，preferences 持久化下来重装 App 不会清。`WidgetBridge.getFormIdsForKind` 检测到空 formId 会重写注册表 + 警告日志；上线后第一次冷启动会触发一次清洗，之后正常。
- **ArkTS 严格模式（额外坑）**：禁用 `as const`（改 class + static readonly）/ 对象字面量当类型（Record 也不行，先两步赋值）/ `Row().fill()`（改 backgroundColor）/ indexed access field（改 if/switch）/ `NowPlayingSnapshot['field']` indexed access type（先 typedef）；FontWeight 仅 Lighter/Regular/Normal/Medium/Bolder/Bold（**无 SemiBold**）；@Builder 函数体内不能有 const/if（UI 组件直接堆叠）；`formBindingData` 用 default import 不带花括号。
- **FormExtensionAbility 回调必须同步**：onAddForm 同步返回 formBindingData.FormBindingData；onUpdateForm/onFormEvent 同步 void。async 逻辑 fire-and-forget。
- **PreferencesStore.init**：从 `common.UIAbilityContext` 改为 `common.Context`（基类），让 FormExtensionAbility 也能复用（getApplicationContext 不是 UIAbilityContext）。
- **postCardAction router 拉主 App**：`{ action: 'router', abilityName: 'EntryAbility', params: { url: 'audiodock://player' } }`。EntryAbility.handleWidgetDeepLink 解析 uri 并 router.pushUrl 到目标页（已加 audiodock scheme 到 skills.uris）。
- **构建命令**：`cd apps/harmony && env -u NODE_OPTIONS DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk" PATH="/Applications/DevEco-Studio.app/Contents/tools/node/bin:$PATH" /Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw --mode module -p product=default -p module=entry@default assembleHap --no-daemon`（已验证 BUILD SUCCESSFUL）。
- **VIP 门控**：`EntryFormAbility.readIsLocked()` 读 kvStore `widget_vip`，未命中回落 `plusApi.getVipStatus(plus_user_id)`（需 `ensureKvAndHttpReady` 同步设 plusToken）；`loadSnapshotForKind` 写入 `out['isLocked'] = true` 时 short-circuit 返回；4 张卡片组件 `@LocalStorageProp('isLocked')` + `if (isLocked) LockedCard()`。LockedCard 点击 `postCardAction('router', 'audiodock://member-benefits')` 拉起主 App 会员页。
- **卡片封面走 `getImageUrl(path, 300)`**：`WidgetCover.ets` 已统一走 `/image/optimize?src=/covers/...&w=300&q=72&fmt=webp`（背景 `WidgetBackground` 共享同一 URL，HTTP/ArkImage 缓存合并去重，无需额外优化）。
- **hvigor 构建副作用（widget 流程新增）**：每次 `assembleHap` 完必须 `git checkout -- apps/harmony/build-profile.json5 apps/harmony/{common,features/{i18n,network,player,socket,storage,ui}}/BuildProfile.ets`，否则 `compatibleSdkVersion` 会被降级为 `6.0.0(0)`、`BUILD_MODE_NAME` 会被改成 `'debug'`/`DEBUG=true`。
- **跨进程单例 store 必须在进程启动时显式 loadFromStorage**（卡片进程最常见踩坑）：卡片进程 FormExtensionAbility / 主进程 EntryAbility 是独立 process，单例 store（AuthStore / httpClient 等）的内存状态完全不可见，**不能假设"主进程已经写过 KV"**。EntryAbility.initialize 末尾 + EntryFormAbility.ensureKvAndHttpReady 里都要 `await authStore.loadFromStorage()`，否则 authStore.state_.user.id 永远为 null。
- **VIP 判定 ID 用 plus_user_id 不是 user.id**：mobile `apps/mobile/app/_layout.tsx syncVipState` 用 `AsyncStorage.getItem('plus_user_id')`，不是 user.id；hm `WidgetBridge.syncVip` 必须对齐。未登录 plus 会员系统时**不要写 `widget_vip` KV**（让 readIsLocked 走「无缓存 → 不锁定」分支），避免登录态恢复前把 isVip=false 当"已同步结果"缓存。
- **WidgetBackground 磨砂玻璃**：`Image.alt(cover).blur(20)` 对齐 iOS `.blur(radius: 18)`；HarmonyOS Image.blur 支持任意 number，不是枚举档位。
- **play_history / play_latest 是播列表不是单曲**（对齐 mobile）：mobile `apps/mobile/app/_layout.tsx:169-224` 这两个 action 拉 50 条 history/latest → 定位目标曲目索引 → `playTrackList(list, index)`，保留 next/prev 上下文。早期 hm 端复用 `handlePlayTrack`（单曲播放）是 bug。
- **scripts/harmony-cleanup.sh**：每次 `assembleHap` 完跑 `bash scripts/harmony-cleanup.sh` 一键还原 build-profile.json5 SDK 降级 + 7 个 BuildProfile.ets debug 改写 + _tmp_* 临时文件。
- **docs/harmony-widget.md**：完整的 widget 开发指南（架构、KV schema、VIP 判定、命令路由、磨砂玻璃、调试命令、已知 bug + 修复）。后续有 widget 相关问题先查这个文档。
- **hm / iOS widget 端到端差异（已对齐大部分））**：
  - ✅ 4 种卡片 / VIP 锁定 / 11 命令 / `audiodock://` 深链 / 磨砂玻璃（`.blur(20)` 对齐 iOS `.blur(radius: 18)`）
  - ❌ hm 封面是 URL 实时拉，iOS 是本地缓存（App Group container）→ hm 离线不可看封面
  - ❌ hm 写死 colorPrimary `#3a3a5e`，iOS 从封面 8x8 平均色算 → hm 渐变背景不真实
- **下一步待做（仅剩）**：实际真机测试卡片显示/交互（添加 4 种卡片 → 按钮 → 模式切换 → 播放列表点击拉起 → 刷新按钮），需 `hdc install` 到真机验证。
