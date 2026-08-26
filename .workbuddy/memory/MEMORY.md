# AudioDock 项目长期记忆

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
