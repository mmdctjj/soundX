# AudioDock 项目长期记忆

## apps/harmony 构建环境

- **hvigor 命令行构建**：`DEVECO_SDK_HOME` 必须指向 DevEco 内置 SDK 根 `/Applications/DevEco-Studio.app/Contents/sdk`（不要指向 `default/openharmony` 或外部 `~/Library/OpenHarmony/Sdk`）；node 用 DevEco 自带 `Contents/tools/node/bin/node` 且必须 `env -u NODE_OPTIONS`。
- **完整命令**：
  ```bash
  cd apps/harmony && env -u NODE_OPTIONS \
    DEVECO_SDK_HOME="/Applications/DevEco-Studio.app/Contents/sdk" \
    PATH="/Applications/DevEco-Studio.app/Contents/tools/node/bin:$PATH" \
    /Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw \
    --mode module -p product=default -p module=entry@default assembleHap --no-daemon
  ```
- SDK 版本 API 24（HarmonyOS 6.1.1），hvigor 6.24.4 不认外部 SDK 的 12/20/23。报 00303217 先 `hvigorw --stop-daemon`。
- **构建副作用**：assembleHap 会改 `build-profile.json5`（compatibleSdkVersion 降级）+ 各模块 `BuildProfile.ets`（debug 改写）+ 产生 `_tmp_*` 空文件，提交前跑 `bash scripts/harmony-cleanup.sh` 一键还原。

## ArkTS 严格模式高频坑

- **禁止对象 spread**（arkts-no-spread）：`{ ...obj, field: x }` 对 interface 对象报错（只允许数组/数组子类），必须显式逐字段构造。
- 接口签名里不能用对象字面量类型（如 `Promise<{success:boolean}>`），必须定义显式 interface；JSON.parse 的 `as` 断言也指向显式 interface。
- 禁 `as const`（改 class + static readonly）、indexed access type `T['field']`、`Row().fill()`（改 backgroundColor）。
- FontWeight 仅 Lighter/Regular/Normal/Medium/Bolder/Bold（无 SemiBold）；@Builder 体内不能有 const/if。
- `t(key, params)` 插值参数是 `Array<[string, string|number]>` 元组；@Entry build() 需 if/else 包 builder 调用。
- `formBindingData` 用 default import 不带花括号。
- **ArkUI 8 位 hex 颜色是 `#AARRGGBB`（透明度在前）**，不是 CSS 的 RRGGBBAA——写反了会出现"黄色背景"之类的诡异渲染（`#FFFFFF14` 按 AARRGGBB 解析是纯黄）。

## AVSession 通知栏播控

- **媒体播控卡片三要素**（缺一不可）：① createAVSession + activate；② setAVMetadata + setAVPlaybackState；③ AVPlayer 在 initialized 态、首次 prepare 前设 `audioRendererInfo.usage = STREAM_USAGE_MUSIC/AUDIOBOOK`。
- `KEEP_BACKGROUND_RUNNING` 是 **ACL 受限开放权限**，module.json5 声明不够，必须 AGC 审核通过（调试白名单发邮件 agconnect@huawei.com）。
- `startBackgroundRunning` 在 `backgroundTaskManager`（`@kit.BackgroundTasksKit`，不存在 `continuousTask` 命名空间）；**每次 play()/setPlaying() 入口都要再申请一次**（官方 AudioCast 实战）。
- **activate 时机**：必须首次真正播放时 activate，空激活系统不认；activate 后立刻补发 setAVMetadata + setBackgroundPlayMode(ENABLE_BACKGROUND_PLAY)（API 24+）。
- **进度不要持续上报**（500ms 一次会被限频 `isReportOverSize,checkFail` 拒绝），只在状态翻转/seek/倍速时下发，进度由系统自己推算。
- AVSession 事件名官方是 `'play'/'pause'/'playNext'/'playPrevious'/'seek'/'setSpeed'`（论坛贴的 'next'/'previous' 是错的）。
- 抓日志：`hdc shell "hilog | grep -iE 'avsession|AVSession'"`。

## hm 桌面小部件（对齐 iOS 4 种 widget）

- **架构**：`EntryFormAbility`（1 个管 4 卡片）+ 4 个 ArkTS 卡片组件 + `WidgetBridge`（主 App→卡片推送）+ `WidgetCommandHandler`（卡片→主 App 指令）。完整指南见 `docs/harmony-widget.md`。
- **数据共享**：同 HAP 共享 preferences（STORE_NAME `audiodock_kv`）；formName→formId 映射走 `widget_form_ids_${formName}`，另有 formId→name/dimension 反向索引。
- **⚠️ onAddForm 三个 want.parameters key 必须用 formInfo 常量**：`formInfo.FormParam.IDENTITY_KEY = "ohos.extra.param.key.form_identity"`（误用 `form_id` 会拿空串 → updateForm('') 报 invalid → 卡片永远停首屏）、`NAME_KEY`、`DIMENSION_KEY`（值是数字枚举，需归一化 1→1*2, 2→2*2, 3→2*4, 4→4*4, 5→2*1）。
- **⚠️ preferences 每进程一份内存缓存**：跨进程写入后对方读旧缓存。修复：`PreferencesStore.pull()`（removePreferencesFromCache + 重新 getPreferences），封装 `getFresh/getJSONFresh`；**任何读「会被对方进程写入」的数据都走 fresh 系列**。
- **⚠️ 跨进程订阅无效**：playerStore.subscribe 只在主 App 进程内有效，卡片收不到。方案：PlayerStore.notify() 里加 pushToWidget 钩子（动态 import WidgetBridge 避免循环依赖），任何状态变化主动推卡片；scheduleSyncNowPlaying 节流 1000ms（300ms 会被系统限频拒绝）。
- **跨进程单例 store 必须显式 loadFromStorage**：EntryAbility.initialize 末尾 + EntryFormAbility.ensureKvAndHttpReady 里都要 `await authStore.loadFromStorage()`。
- FormExtensionAbility import（API 24）：`from '@ohos.app.form.FormExtensionAbility'`（不是 @kit.AbilityKit）；postCardAction 是全局函数。
- form_config.json：supportDimensions **没有 4*2**；scheduledUpdateTime 必须 HH:MM 单点。
- FormExtensionAbility 回调必须同步（onAddForm 同步返回骨架，异步 fire-and-forget 加载数据 + updateForm）。
- VIP 判定用 `plus_user_id`（不是 user.id）；未登录时不要写 `widget_vip` KV（让锁定判定走"无缓存→不锁定"分支）。
- 卡片封面统一 `getImageUrl(path, 300)` 走 `/image/optimize`。
- play_history / play_latest 是播列表（对齐 mobile 的 playTrackList(list, index)），不是单曲。
- 脏 formId 注册表：`WidgetBridge.getFormIdsForKind` 自动检测空 formId 并重写。
- 卡片按钮图标：HarmonyOS 无 SF Symbols，用 SVG 资源 + Image 组件（不要用 emoji 字符）。
- **⚠️ WidgetIcon 必须用 Material Icons 标准 path**（fill 填充，不是 stroke 描边）；手绘 path 容易畸形（prev/next/heart/refresh 都踩过坑）。直接抄 Material 的 24x24 path 数据最稳。
- **⚠️ WidgetIcon 已改用 SVG 资源 + Image 组件**（Path 三种方案——`.width/.height`、`.scale()`、坐标预缩放——在卡片渲染管线全部不生效，图标永远 24vp）。实现方式：13 个 SVG 放在 `resources/base/media/`（ic_play/ic_pause/ic_prev/ic_next/ic_heart/ic_heart_fill/ic_shuffle/ic_repeat/ic_repeat_1/ic_list/ic_music/ic_crown/ic_refresh），Image($r('app.media.xxx')) + `.width/.height/.fillColor(color)`，SVG 里 fill 写 #FFFFFF 占位、fillColor 覆盖。空心 heart 用 Material `favorite_border` 的填充式轮廓路径（不是 stroke 描边）。
- **⚠️ 卡片列表数据必须用 features_network 的封装 API，不要手拼路径**：歌单 `playlistApi.list('MUSIC')` 返回 `PlaylistDto[]`；历史 `userDataApi.trackHistory()` 返回 `LoadMoreResp<TrackHistoryItem>`（`.list` 不是 `.items`）；上新 `trackApi.latest()` 返回 `TrackDto[]`。后端 Track 模型字段是 `id/name/artist/cover/duration/type/path`，**没有 `title/coverUrl/url`**。
- **⚠️ 播控必须用 call 事件（对齐官方 CardInfoRefresh 示例）**：message 事件落到 EntryFormAbility 进程（另一个 playerStore 实例，无法控制主 App 播放）；call 事件直达 EntryAbility 的 `this.callee.on('widgetCommand', handler)`，回包必须 `implements rpc.Parcelable`。卡片侧 `postCardAction({action:'call', abilityName:'EntryAbility', params:{method:'widgetCommand', widgetAction:'play'|..., id?}})`。冷启动时序：EntryAbility.onCreate 先 `restorePromise = playerStore.restoreState()`，call 回调 await 它再执行指令（否则 queue 空，play 落空）。
- **⚠️ 卡片封面三级兜底**（WidgetCoverResolver）：data:base64 内联（WidgetBridge 预取后塞进 FormBindingData，最稳定）→ file:// 本地缓存（同 UID 可读）→ 绝对 URL（相对路径用模块级 baseUrl 补全，**卡片进程不能 import features_network**，会拉起整张网络栈）。WidgetBridge.prefetchCover 用 http.createHttp 拉 ARRAY_BUFFER → 写 filesDir/widget_covers → 生成 data:image/webp;base64（≤80KB，300px webp 基本 <20KB）。
- **⚠️ 列表封面（歌单/历史/上新）必须统一下载转 file:// 本地文件路径**：FormExtensionAbility 渲染进程对 Image 加载网络 URL 不可靠（官方文档原话"对于网络图片的加载存在较大性能开销，部分场景可能存在加载失败"），dataImage 走 FormBindingData 有截断风险。resolveCoverToFile(cover) 用 getImageUrl(cover, 96) → http.createHttp 拉 ARRAY_BUFFER → 写 filesDir/widget_covers/ → 返回 file:// 路径，卡片零网络请求直接读本地文件。外链封面（Subsonic/Emby 等 http(s)）也统一下载转本地。EntryFormAbility.restoreNowPlayingFromPersistedState 的封面优先读 widget_now_playing_cover_cache（dataImage → 转 file://），缓存没有才手动拼 URL 兜底。
- **⚠️ service 类拿 context**：getContext() 只在 @Component 内可靠；service（WidgetBridge 等）从 AppStorage 取（EntryAbility.initialize 里 `AppStorage.setOrCreate('abilityContext', ctx)`）。
- ArkTS 严格模式追加：postCardAction 的 params 不能写字面量 `{a:1}`，必须先 `const params: Record<string,string> = {}` 再逐项赋值；Promise.race 分支必须同类型；Uint8Array.buffer 可能带 byteOffset，写文件前必须 slice。

- **⚠️⚠️ `fs.mkdirSync(dir, true)` 在目录已存在时照样抛 `File exists`（EEXIST）**，不是「存在即返回」。这曾让小部件封面第二次起全部落盘失败（卡片全是占位音符，"偶尔能显示一次"就是首次安装目录还不存在那次）。正确写法：先 `fs.accessSync(dir)` 判断，mkdir 失败后再 accessSync 校验一次；写文件前 `unlinkSync`、写后 `statSync().size` 校验非空。见 `WidgetBridge.ensureDir`。
- **⚠️ 抓 harmony 日志用 hdc**（App 日志 domain = `com.audiodock.app/AudioDock`，Logger 输出 `[TAG] msg`）：`hdc shell "aa start -b com.audiodock.app -a EntryAbility"` 然后 `hdc shell "hilog > /data/local/tmp/hl.txt & sleep 14; kill %1; grep ... hl.txt"`——**`hilog | grep` 会流式挂死，必须先落文件再 grep**。hilog 里直接看 `[WidgetBridge]` 能秒定位封面问题。
- `COVER_PREFETCH_TIMEOUT_MS = 8000`（4000 在外网 300px 图上经常 timeout）。

## 封面/头像分级加载（四端统一）

- 后端 `GET /image/optimize?src=&w=&q=&fmt=`（services/api，只放行 `/covers/`）。
- 档位 [96,128,300,600,900,1200]，width=目标设备像素宽（显示尺寸×2），q=72 fmt=webp；**≤300 恒压缩不分内外网**（防解码 OOM），>300 才分内外网。
- `getImageUrl` 必须保持同步纯函数；网络判定走模块级变量 + 服务器切换钩子异步 refresh。
- 坑：① 视频地址不要走 getImageUrl；② 会落盘缓存的路径必须限 ≤300 档；③ 小程序 iOS<14 需 `<Image webp>`。

## @soundx/services workspace 包

- father 构建，入口指向 dist；**改 src/ 后必须 `cd packages/services && pnpm build`**，否则引用端拿旧 dist 报 `xxx is not a function`。
- mini 会员支付：plusWechatMpSession → openid；下单 clientType:'miniprogram' + openId，返回 wechatPay 直接喂 Taro.requestPayment。

## services/mi 小爱音箱管理

- sqlite3（`services/mi/data/xiaoai.db`），DB 操作必须 asyncio.to_thread 包裹。
- 唤醒词 DB 优先（env VOICE_KEYWORDS 仅首启种子）；voice_listener 每 30s reload。
- 管理 API 前缀 `/api`，前端走 `{服务器}/mi/api/*`。
- docker-compose 需挂载 `auth.json`、`.mi.token`、`data/` 三路径防登录态丢失。
