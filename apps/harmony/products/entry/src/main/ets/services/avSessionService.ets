import { avSession } from '@kit.AVSessionKit';
import { common, wantAgent } from '@kit.AbilityKit';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';
import { image } from '@kit.ImageKit';
import { http } from '@kit.NetworkKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';
import type { Track, PlayMode } from '../context/PlayerStore';
import { getImageUrl } from '../utils/image';

/** position 跳变超过该值（ms）且与「期望进度」不符才视为真实 seek，立即下发播放态。
 *  关键：不能用「距上次上报的跳变」判断——timeUpdate 间隔（~2s）大于该阈值时，
 *  进度自然前进会每次都被误判成 seek，导致 isReportOverSize 限频（本次根因 B）。 */
const SEEK_JUMP_THRESHOLD_MS = 1500;
/** setAVPlaybackState 最小下发间隔（ms）：系统对高频上报做 isReportOverSize 限频直接拒绝。 */
const MIN_STATE_REPORT_INTERVAL_MS = 500;

let session: avSession.AVSession | null = null;
let abilityContext: common.UIAbilityContext | null = null;
/** 会话是否已 activate（首次真正播放时触发）。 */
let sessionActivated: boolean = false;
/** activate 完成后需要补发一次元数据 + 播放态（未激活时发的可能被系统丢弃）。 */
let pendingMetadata: (() => void) | null = null;

/** 上一次已下发的元数据指纹，用于「仅在切歌时」setAVMetadata。 */
let lastMetadataKey: string = '';
/** 上一次 setAVMetadata 是否成功（失败时下次状态变化要重试，否则指纹缓存会导致永远不重发）。 */
let lastMetadataOk: boolean = false;
/** 上一次已下发的播放态。 */
let lastPlaybackState: avSession.PlaybackState = avSession.PlaybackState.PLAYBACK_STATE_PAUSE;
/** 上一次已下发的进度（ms），用于 seek 跳变检测。 */
let lastPositionMs: number = 0;
/** 上一次已下发的倍速。 */
let lastSpeed: number = 1.0;
/** 上一次已下发的时长（ms）。 */
let lastDurationMs: number = 0;
/** 上一次已下发的循环模式，用于变化时才下发 loopMode。 */
let lastLoopMode: avSession.LoopMode = avSession.LoopMode.LOOP_MODE_SEQUENCE;
/** 上一次实际调用 setAVPlaybackState 的时间戳（ms），用于最小间隔节流 + 期望进度推算。 */
let lastStateReportAt: number = 0;
/** 上一次下发时的播放状态（用于期望进度推算：播放中才随时间前进）。 */
let lastReportedIsPlaying: boolean = false;
/** 节流窗口内被合并的待发状态（trailing 补发，保证系统最终拿到最新状态）。 */
let pendingState: PendingPlaybackState | null = null;
let pendingStateTimer: number = -1;

interface PendingPlaybackState {
  state: avSession.PlaybackState;
  currentMs: number;
  durationMs: number;
  speed: number;
  loopMode: avSession.LoopMode;
}

/** PlayerStore.PlayMode → AVSession.LoopMode 一对一映射。播控中心只认这四种值，
 *  自定义模式（如「心动模式」）必须就近映射，否则通知栏会按 SEQUENCE 显示。 */
function mapPlayModeToLoopMode(pm: PlayMode): avSession.LoopMode {
  switch (pm) {
    case 'LOOP_SINGLE':
      return avSession.LoopMode.LOOP_MODE_SINGLE;
    case 'LOOP_LIST':
      return avSession.LoopMode.LOOP_MODE_LIST;
    case 'SHUFFLE':
      return avSession.LoopMode.LOOP_MODE_SHUFFLE;
    case 'SEQUENCE':
    default:
      return avSession.LoopMode.LOOP_MODE_SEQUENCE;
  }
}

/** AVSession.LoopMode → PlayerStore.PlayMode 反向映射。用户从通知栏/控制中心切循环模式时
 *  系统会回调 setLoopMode，需要把系统值转成本地 PlayMode 写回 PlayerStore。 */
function mapLoopModeToPlayMode(lm: avSession.LoopMode): PlayMode {
  switch (lm) {
    case avSession.LoopMode.LOOP_MODE_SINGLE:
      return 'LOOP_SINGLE';
    case avSession.LoopMode.LOOP_MODE_LIST:
      return 'LOOP_LIST';
    case avSession.LoopMode.LOOP_MODE_SHUFFLE:
      return 'SHUFFLE';
    case avSession.LoopMode.LOOP_MODE_SEQUENCE:
    case avSession.LoopMode.LOOP_MODE_CUSTOM:
    default:
      return 'SEQUENCE';
  }
}

export async function installAVSessionService(context: common.UIAbilityContext): Promise<void> {
  abilityContext = context;
  session = await avSession.createAVSession(context, 'AudioDockPlayer', 'audio');
  // 注意：这里只创建会话，不 activate。
  // activate 挪到首次真正播放时（pushPlaybackState 里 isPlaying=true 时触发），
  // 避免系统把「激活但从未播放」的会话当成无效会话。

  // 0. 声明投播能力（对齐 AudioCast AVSessionController.ets:68）。
  // 不调这个 setExtras，系统不认 AVSession 是音频代理，不会发出 outputDeviceChange，
  // 通知栏/控制中心的播控卡片也不会出现。这是「投播」链路的核心前提。
  try {
    await session.setExtras({ 'requireAbilityList': ['url-cast'] });
    Logger.i('AVSession', 'extras set: requireAbilityList=[url-cast]');
  } catch (e) {
    Logger.w('AVSession', `setExtras failed: ${String(e)}`);
  }

  // 1. 注册系统播控按键监听（通知栏播控卡片 / 锁屏 / 耳机线控 / 车机）
  bindControlCommands();

  // 2. 订阅 PlayerStore，把元数据 + 播放态同步给系统
  bindPlayerEvents();

  // 3. 申请 AUDIO_PLAYBACK 后台长时任务（系统播控卡片出现的前提之一）
  await startAudioBackgroundTask();

  // 4. 配置点击通知栏播控卡片回跳 EntryAbility
  await bindLaunchWantAgent(context);

  Logger.i('AVSession', 'installed (session created, activate deferred to first play)');
}

export function releaseAVSessionService(): void {
  stopAudioBackgroundTask();
  if (pendingStateTimer >= 0) {
    clearTimeout(pendingStateTimer);
    pendingStateTimer = -1;
  }
  pendingState = null;
  if (session) {
    session.destroy().catch(() => undefined);
    session = null;
  }
  abilityContext = null;
  sessionActivated = false;
  pendingMetadata = null;
  lastMetadataKey = '';
  lastMetadataOk = false;
  lastStateReportAt = 0;
  lastReportedIsPlaying = false;
  audioBackend.release().catch(() => undefined);
}

// ────────────────────────────────────────────────────────────
// 系统播控按键 → PlayerStore
// ────────────────────────────────────────────────────────────

function bindControlCommands(): void {
  if (!session) return;
  session.on('play', (): void => {
    Logger.i('AVSession', 'cmd: play');
    playerStore.resume().catch((e: Error): void => {
      Logger.w('AVSession', `resume failed: ${String(e)}`);
    });
  });
  session.on('pause', (): void => {
    Logger.i('AVSession', 'cmd: pause');
    playerStore.pause().catch((e: Error): void => {
      Logger.w('AVSession', `pause failed: ${String(e)}`);
    });
  });
  session.on('playNext', (): void => {
    Logger.i('AVSession', 'cmd: playNext');
    playerStore.playNext().catch((e: Error): void => {
      Logger.w('AVSession', `playNext failed: ${String(e)}`);
    });
  });
  session.on('playPrevious', (): void => {
    Logger.i('AVSession', 'cmd: playPrevious');
    playerStore.playPrevious().catch((e: Error): void => {
      Logger.w('AVSession', `playPrevious failed: ${String(e)}`);
    });
  });
  session.on('seek', (timeMs: number): void => {
    Logger.i('AVSession', `cmd: seek ${timeMs}`);
    playerStore.seek(timeMs).catch((e: Error): void => {
      Logger.w('AVSession', `seek failed: ${String(e)}`);
    });
  });
  session.on('setSpeed', (speed: number): void => {
    Logger.i('AVSession', `cmd: setSpeed ${speed}`);
    playerStore.setSpeed(speed).catch((e: Error): void => {
      Logger.w('AVSession', `setSpeed failed: ${String(e)}`);
    });
  });
  // 用户从通知栏/控制中心切循环模式 → 系统回调 → 反向映射写回 PlayerStore。
  // 对齐 AudioCast ControlAreaComponent.ets:252（监听 setLoopMode 后切换应用内部 playMode）。
  session.on('setLoopMode', (mode: avSession.LoopMode): void => {
    Logger.i('AVSession', `cmd: setLoopMode ${mode}`);
    const next = mapLoopModeToPlayMode(mode);
    playerStore.setMode(next);
  });
}

// ────────────────────────────────────────────────────────────
// PlayerStore → AVSession 元数据 / 播放态
// ────────────────────────────────────────────────────────────

function bindPlayerEvents(): void {
  playerStore.subscribe((): void => {
    if (!session) return;
    const v = playerStore.view();
    const track: Track | undefined = v.queue[v.currentIndex];
    pushMetadata(track, v.durationMs);
    pushPlaybackState(v.isPlaying, v.currentMs, v.durationMs, v.speed, v.playMode);
    // 队列被清空/播完停止（clear() 后 currentIndex=-1 且不在播放）时及时停掉长时任务，
    // 避免空挂被系统判违规（Background TasksKit 接入规范要求任务结束主动 stop）。
    if (!v.isPlaying && v.currentIndex < 0) {
      stopAudioBackgroundTask();
    }
  });
}

/**
 * 元数据仅在「曲目身份变化」时下发一次。
 * 指纹 = id + title + artist + album + duration，避免 timeUpdate 高频重复触发。
 * 封面：coverUrl 是 http(s) URL，AVSession 只接受 PixelMap，必须先下载解码。
 *
 * 注意：会话未激活时 setAVMetadata 可能被系统丢弃，所以首次 activate 后需要补发。
 */
function pushMetadata(track: Track | undefined, durationMs: number): void {
  if (!session) return;
  const key = track
    ? `${track.id}|${track.title}|${track.artist ?? ''}|${track.album ?? ''}|${durationMs}`
    : '';
  // 指纹相同且上次确实成功才跳过；上次失败（如 activate 竞态）下次状态变化必须重试
  if (key === lastMetadataKey && lastMetadataOk) return;
  lastMetadataKey = key;
  Logger.i('AVSession', `push metadata: id=${track?.id ?? 'empty'} title=${track?.title ?? ''} artist=${track?.artist ?? ''} album=${track?.album ?? ''} dur=${durationMs} cover=${track?.coverUrl ?? 'none'}`);

  const doSet = (): void => {
    if (!session) return;
    // 注意：assetId 必须显式转 string——track.id 声明是 string 但运行时是 number
    // （JSON 反序列化保留 number），直接传会报 401 参数错误（已抓包确认）。
    const meta: avSession.AVMetadata = {
      assetId: String(track?.id ?? ''),
      title: track?.title ?? '',
      artist: track?.artist ?? '',
      album: track?.album ?? '',
      duration: durationMs,
    };
    session.setAVMetadata(meta)
      .then((): void => {
        lastMetadataOk = true;
        Logger.i('AVSession', `metadata set ok: ${track?.title ?? 'empty'}`);
      })
      .catch((e: Error): void => {
        lastMetadataOk = false;
        const be = e as BusinessError;
        Logger.e('AVSession', `setAVMetadata failed: code=${be.code} msg=${be.message} data=${JSON.stringify(meta)}`);
        // 401 参数错误不会自愈（assetId 类型错误等），重试无意义，停止避免无限循环
        if (be.code === 401) {
          lastMetadataOk = true; // 标记为"已处理"防止下次状态变化又重试
        }
      });
  };

  if (!sessionActivated) {
    // 会话还没激活，先记下来，activate 完成后补发
    pendingMetadata = doSet;
    return;
  }
  doSet();

  // 封面异步下载解码，成功后补发一条带 mediaImage 的元数据
  // track.coverUrl 是相对路径（/covers/...），需经 getImageUrl 拼 baseURL 并走缩略图代理。
  // 用 600 档（通知栏卡片实际显示尺寸约 300vp×2），平衡清晰度与下载耗时。
  const rawCover = track?.coverUrl;
  if (rawCover) {
    const coverUrl = getImageUrl(rawCover, 600);
    if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
      fetchCoverPixelMap(coverUrl)
        .then((pm: image.PixelMap): void => {
          if (!session) return;
          // 曲目已切走则放弃，避免旧封面盖到新曲
          if (lastMetadataKey !== key) return;
          const metaWithCover: avSession.AVMetadata = {
            assetId: String(track?.id ?? ''),
            title: track?.title ?? '',
            artist: track?.artist ?? '',
            album: track?.album ?? '',
            duration: durationMs,
            mediaImage: pm,
          };
          session.setAVMetadata(metaWithCover)
            .then((): void => { Logger.i('AVSession', `metadata set with cover: ${track?.title ?? ''}`); })
            .catch((e: Error): void => {
              Logger.w('AVSession', `setAVMetadata(cover) failed: ${String(e)}`);
            });
        })
        .catch((e: Error): void => {
          Logger.w('AVSession', `fetch cover failed: ${String(e)}`);
        });
    }
  }
}

/**
 * 播放态下发策略（关键：避免触发系统 isReportOverSize 限频）：
 * - 状态翻转（play ↔ pause）立即下发；
 * - position 跳变（seek）立即下发；
 * - 倍速变化立即下发；
 * - **进度不持续上报**——系统根据 position.elapsedTime + (now - updateTime) * speed 自己推算。
 */
function pushPlaybackState(
  isPlaying: boolean,
  currentMs: number,
  durationMs: number,
  speed: number,
  playMode: PlayMode,
): void {
  if (!session) return;
  const nextState = isPlaying
    ? avSession.PlaybackState.PLAYBACK_STATE_PLAY
    : avSession.PlaybackState.PLAYBACK_STATE_PAUSE;
  const nextLoopMode = mapPlayModeToLoopMode(playMode);

  const stateFlipped = nextState !== lastPlaybackState;
  // seek 判定（核心修复）：与「期望进度」比较，而不是与「上次上报值」比较。
  // 期望进度 = 上次上报的 position + 播放时长 × speed（与系统侧推算公式一致）。
  // timeUpdate 自然前进 ~2s/次，与期望进度几乎重合（diff≈0）→ 不触发；
  // 用户真实 seek（跳几分钟/拖到任意位置）与期望进度差距巨大 → 触发。
  const expectedMs = lastReportedIsPlaying
    ? lastPositionMs + (Date.now() - lastStateReportAt) * lastSpeed
    : lastPositionMs;
  const seekJumped = Math.abs(currentMs - expectedMs) > SEEK_JUMP_THRESHOLD_MS;
  const speedChanged = speed !== lastSpeed;
  // duration 已在 AVMetadata 里给过系统，这里只在「首次拿到有效 duration」时随状态补一次，
  // 之后不再因 duration 触发上报（避免 durationUpdate 阶段被 isReportOverSize 限频）
  const durationChanged = lastDurationMs === 0 && durationMs > 0;
  const loopModeChanged = nextLoopMode !== lastLoopMode;

  // 首次真正播放时 activate + 显式声明后台播放模式（API 24+）。
  if (isPlaying && !sessionActivated) {
    sessionActivated = true;
    session.activate()
      .then((): Promise<void> => {
        Logger.i('AVSession', 'session activated');
        return session!.setBackgroundPlayMode(avSession.BackgroundPlayMode.ENABLE_BACKGROUND_PLAY);
      })
      .then((): void => {
        Logger.i('AVSession', 'background play mode enabled');
        // activate 完成后补发元数据（未激活时发的可能被丢弃）
        if (pendingMetadata) {
          pendingMetadata();
          pendingMetadata = null;
        }
        // 补发一次播放态，确保系统拿到最新状态
        doPushPlaybackState(nextState, currentMs, durationMs, speed, nextLoopMode);
      })
      .catch((e: Error): void => {
        Logger.w('AVSession', `activate/setBackgroundPlayMode: ${String(e)}`);
      });
    // activate 是异步的，这里先更新本地状态，避免重复触发
    lastPlaybackState = nextState;
    lastPositionMs = currentMs;
    lastSpeed = speed;
    lastDurationMs = durationMs;
    lastLoopMode = nextLoopMode;
    lastReportedIsPlaying = isPlaying;
    // 首次播放时同步申请后台长时任务（防止 installAVSessionService 申请过但被系统回收）
    startAudioBackgroundTask().catch((): void => undefined);
    return;
  }

  // 对齐官方 AudioCast（AudioRendererController.ets L225/L270）：每次进入播放都重新申请
  // 后台长时任务——任务超过系统回收阈值后会被静默回收，只有重新申请才能让
  // 通知栏/控制中心播控卡片持续有效。startBackgroundRunning 幂等，重复调用无副作用。
  if (isPlaying && stateFlipped) {
    startAudioBackgroundTask().catch((): void => undefined);
  }

  if (!stateFlipped && !seekJumped && !speedChanged && !durationChanged && !loopModeChanged) return;
  if (!sessionActivated) return;

  Logger.i('AVSession', `push state: flip=${stateFlipped} seek=${seekJumped} speed=${speedChanged} dur=${durationChanged} loop=${loopModeChanged} pos=${currentMs} lastPos=${lastPositionMs} durMs=${durationMs} lastDur=${lastDurationMs}`);
  doPushPlaybackState(nextState, currentMs, durationMs, speed, nextLoopMode);
}

function doPushPlaybackState(
  state: avSession.PlaybackState,
  currentMs: number,
  durationMs: number,
  speed: number,
  loopMode: avSession.LoopMode,
): void {
  if (!session) return;
  // 最小间隔节流：系统对高频 setAVPlaybackState 做 isReportOverSize 限频直接拒绝。
  // 窗口内的调用合并成 trailing 一次补发，保证系统最终拿到的是最新状态。
  const now = Date.now();
  const sinceLast = now - lastStateReportAt;
  if (sinceLast < MIN_STATE_REPORT_INTERVAL_MS) {
    Logger.i('AVSession', `throttled: sinceLast=${sinceLast}ms, merged into pending`);
    pendingState = { state, currentMs, durationMs, speed, loopMode };
    if (pendingStateTimer < 0) {
      pendingStateTimer = setTimeout((): void => {
        pendingStateTimer = -1;
        const p = pendingState;
        pendingState = null;
        if (p) doPushPlaybackState(p.state, p.currentMs, p.durationMs, p.speed, p.loopMode);
      }, MIN_STATE_REPORT_INTERVAL_MS - sinceLast);
    }
    return;
  }
  lastStateReportAt = now;

  lastPlaybackState = state;
  lastPositionMs = currentMs;
  lastSpeed = speed;
  lastDurationMs = durationMs;
  lastLoopMode = loopMode;
  lastReportedIsPlaying = state === avSession.PlaybackState.PLAYBACK_STATE_PLAY;

  session.setAVPlaybackState({
    position: { elapsedTime: currentMs, updateTime: Date.now() },
    speed: speed,
    state: state,
    duration: durationMs,
    loopMode: loopMode,
  })
    .then((): void => {
      Logger.i('AVSession', `playback state set: ${state === avSession.PlaybackState.PLAYBACK_STATE_PLAY ? 'PLAY' : 'PAUSE'} loop=${loopMode}`);
    })
    .catch((e: Error): void => {
      Logger.w('AVSession', `setAVPlaybackState failed: ${String(e)}`);
    });
}

// ────────────────────────────────────────────────────────────
// 后台长时任务（AUDIO_PLAYBACK）
// ────────────────────────────────────────────────────────────

/**
 * 申请 AUDIO_PLAYBACK 后台长时任务。
 * 必须在 module.json5 申请 ohos.permission.KEEP_BACKGROUND_RUNNING（ACL 受限权限，AGC 审批通过才能用）。
 * 系统可能在后台运行超过阈值后回收长时任务，每次进入播放应再调一次（参考官方 AudioCast 示例的实践）。
 * 函数设计为幂等：重复调用不抛错，重复申请会用同模式覆盖。
 */
async function startAudioBackgroundTask(): Promise<void> {
  if (!abilityContext) {
    Logger.w('AVSession', 'startAudioBackgroundTask skipped: abilityContext not set');
    return;
  }
  try {
    // 用 abilityInfo 拿 bundleName / abilityName，比 applicationInfo 更可靠（重构/分包不会断）
    const wa = await wantAgent.getWantAgent({
      wants: [{
        bundleName: abilityContext.abilityInfo.bundleName,
        abilityName: abilityContext.abilityInfo.name,
      }],
      operationType: wantAgent.OperationType.START_ABILITIES,
      requestCode: 0,
    });
    // API 18+：startBackgroundRunning(context, bgModes: string[], wantAgent): Promise<ContinuousTaskNotification>
    // bgModes 用字符串数组形式，'audioPlayback' 表示音视频后台播放。
    const result = await backgroundTaskManager.startBackgroundRunning(
      abilityContext,
      ['audioPlayback'],
      wa,
    );
    Logger.i(
      'AVSession',
      `background task started: notificationId=${result.notificationId}, slotType=${result.slotType}, contentType=${result.contentType}`,
    );
  } catch (e) {
    // ACL 受限权限未开通 / 系统限制时降级：仅靠 module.json5 的 backgroundModes 保住基础后台播放，
    // 通知栏播控可能不出现（典型症状：只剩"正在运行"普通通知、无媒体播控卡片），
    // 但播放本身不中断。要彻底解决需在 AGC 申请 KEEP_BACKGROUND_RUNNING。
    // 重复调用 / 任务已运行时这里也会被忽略，不影响流程。
    Logger.w('AVSession', `startBackgroundRunning failed (检查 AGC 是否已批准 KEEP_BACKGROUND_RUNNING): ${String(e)}`);
  }
}

function stopAudioBackgroundTask(): void {
  if (!abilityContext) return;
  backgroundTaskManager.stopBackgroundRunning(abilityContext).catch((): void => undefined);
}

// ────────────────────────────────────────────────────────────
// wantAgent：点击通知栏播控卡片回跳
// ────────────────────────────────────────────────────────────

async function bindLaunchWantAgent(context: common.UIAbilityContext): Promise<void> {
  if (!session) return;
  try {
    // UPDATE_PRESENT_FLAG：Ability 已在栈顶时不重新拉起，避免从通知栏点回时把同一个
    // EntryAbility 推一个新页面实例出来（对齐官方 AudioCast 示例的 wantAgentFlags 写法）。
    const wa = await wantAgent.getWantAgent({
      wants: [{
        bundleName: context.abilityInfo.bundleName,
        abilityName: context.abilityInfo.name,
      }],
      operationType: wantAgent.OperationType.START_ABILITIES,
      requestCode: 0,
      wantAgentFlags: [wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG],
    });
    await session.setLaunchAbility(wa);
  } catch (e) {
    Logger.w('AVSession', `setLaunchAbility: ${String(e)}`);
  }
}

// ────────────────────────────────────────────────────────────
// 封面下载 → PixelMap
// ────────────────────────────────────────────────────────────

async function fetchCoverPixelMap(url: string): Promise<image.PixelMap> {
  const req = http.createHttp();
  try {
    const resp = await req.request(url, {
      method: http.RequestMethod.GET,
      expectDataType: http.HttpDataType.ARRAY_BUFFER,
      connectTimeout: 10000,
      readTimeout: 10000,
    });
    if (resp.responseCode !== 200) {
      throw new Error(`HTTP ${resp.responseCode}`);
    }
    const buf = resp.result as ArrayBuffer;
    const source = image.createImageSource(buf);
    const pm = await source.createPixelMap();
    source.release();
    return pm;
  } finally {
    req.destroy();
  }
}
