import { avSession } from '@kit.AVSessionKit';
import { common, wantAgent } from '@kit.AbilityKit';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';
import { image } from '@kit.ImageKit';
import { http } from '@kit.NetworkKit';
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';

/** position 跳变超过该值（ms）视为 seek，立即下发播放态。 */
const SEEK_JUMP_THRESHOLD_MS = 1500;

let session: avSession.AVSession | null = null;
let abilityContext: common.UIAbilityContext | null = null;
/** 会话是否已 activate（首次真正播放时触发）。 */
let sessionActivated: boolean = false;
/** activate 完成后需要补发一次元数据 + 播放态（未激活时发的可能被系统丢弃）。 */
let pendingMetadata: (() => void) | null = null;

/** 上一次已下发的元数据指纹，用于「仅在切歌时」setAVMetadata。 */
let lastMetadataKey: string = '';
/** 上一次已下发的播放态。 */
let lastPlaybackState: avSession.PlaybackState = avSession.PlaybackState.PLAYBACK_STATE_PAUSE;
/** 上一次已下发的进度（ms），用于 seek 跳变检测。 */
let lastPositionMs: number = 0;
/** 上一次已下发的倍速。 */
let lastSpeed: number = 1.0;
/** 上一次已下发的时长（ms）。 */
let lastDurationMs: number = 0;

export async function installAVSessionService(context: common.UIAbilityContext): Promise<void> {
  abilityContext = context;
  session = await avSession.createAVSession(context, 'AudioDockPlayer', 'audio');
  // 注意：这里只创建会话，不 activate。
  // activate 挪到首次真正播放时（pushPlaybackState 里 isPlaying=true 时触发），
  // 避免系统把「激活但从未播放」的会话当成无效会话。

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
  if (session) {
    session.destroy().catch(() => undefined);
    session = null;
  }
  abilityContext = null;
  sessionActivated = false;
  pendingMetadata = null;
  lastMetadataKey = '';
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
    pushPlaybackState(v.isPlaying, v.currentMs, v.durationMs, v.speed);
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
  if (key === lastMetadataKey) return;
  lastMetadataKey = key;

  const doSet = (): void => {
    if (!session) return;
    const meta: avSession.AVMetadata = {
      assetId: track?.id ?? '',
      title: track?.title ?? '',
      artist: track?.artist ?? '',
      album: track?.album ?? '',
      duration: durationMs,
    };
    session.setAVMetadata(meta)
      .then((): void => { Logger.i('AVSession', `metadata set: ${track?.title ?? 'empty'}`); })
      .catch((e: Error): void => {
        Logger.w('AVSession', `setAVMetadata failed: ${String(e)}`);
      });
  };

  if (!sessionActivated) {
    // 会话还没激活，先记下来，activate 完成后补发
    pendingMetadata = doSet;
    return;
  }
  doSet();

  // 封面异步下载解码，成功后补发一条带 mediaImage 的元数据
  const coverUrl = track?.coverUrl;
  if (coverUrl && (coverUrl.startsWith('http://') || coverUrl.startsWith('https://'))) {
    fetchCoverPixelMap(coverUrl)
      .then((pm: image.PixelMap): void => {
        if (!session) return;
        // 曲目已切走则放弃，避免旧封面盖到新曲
        if (lastMetadataKey !== key) return;
        const metaWithCover: avSession.AVMetadata = {
          assetId: track?.id ?? '',
          title: track?.title ?? '',
          artist: track?.artist ?? '',
          album: track?.album ?? '',
          duration: durationMs,
          mediaImage: pm,
        };
        session.setAVMetadata(metaWithCover).catch((): void => undefined);
      })
      .catch((e: Error): void => {
        Logger.w('AVSession', `fetch cover failed: ${String(e)}`);
      });
  }
}

/**
 * 播放态下发策略（关键：避免触发系统 isReportOverSize 限频）：
 * - 状态翻转（play ↔ pause）立即下发；
 * - position 跳变（seek）立即下发；
 * - 倍速变化立即下发；
 * - **进度不持续上报**——系统根据 position.elapsedTime + (now - updateTime) * speed 自己推算。
 */
function pushPlaybackState(isPlaying: boolean, currentMs: number, durationMs: number, speed: number): void {
  if (!session) return;
  const nextState = isPlaying
    ? avSession.PlaybackState.PLAYBACK_STATE_PLAY
    : avSession.PlaybackState.PLAYBACK_STATE_PAUSE;

  const stateFlipped = nextState !== lastPlaybackState;
  const seekJumped = Math.abs(currentMs - lastPositionMs) > SEEK_JUMP_THRESHOLD_MS;
  const speedChanged = speed !== lastSpeed;
  const durationChanged = durationMs > 0 && durationMs !== lastDurationMs;

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
        doPushPlaybackState(nextState, currentMs, durationMs, speed);
      })
      .catch((e: Error): void => {
        Logger.w('AVSession', `activate/setBackgroundPlayMode: ${String(e)}`);
      });
    // activate 是异步的，这里先更新本地状态，避免重复触发
    lastPlaybackState = nextState;
    lastPositionMs = currentMs;
    lastSpeed = speed;
    lastDurationMs = durationMs;
    // 首次播放时同步申请后台长时任务（防止 installAVSessionService 申请过但被系统回收）
    startAudioBackgroundTask().catch((): void => undefined);
    return;
  }

  // 后续 pause→play 状态翻转时，也要重新申请后台长时任务：
  // 后台长时任务可能被系统回收（参考官方 AudioCast 示例的实践），
  // 重新进入播放必须再申请一次，通知栏播控卡片才能持续有效。
  if (isPlaying && stateFlipped && lastPlaybackState === avSession.PlaybackState.PLAYBACK_STATE_PAUSE) {
    startAudioBackgroundTask().catch((): void => undefined);
  }

  if (!stateFlipped && !seekJumped && !speedChanged && !durationChanged) return;
  if (!sessionActivated) return;

  doPushPlaybackState(nextState, currentMs, durationMs, speed);
}

function doPushPlaybackState(
  state: avSession.PlaybackState,
  currentMs: number,
  durationMs: number,
  speed: number,
): void {
  if (!session) return;
  lastPlaybackState = state;
  lastPositionMs = currentMs;
  lastSpeed = speed;
  lastDurationMs = durationMs;

  session.setAVPlaybackState({
    position: { elapsedTime: currentMs, updateTime: Date.now() },
    speed: speed,
    state: state,
    duration: durationMs,
  })
    .then((): void => {
      Logger.i('AVSession', `playback state set: ${state === avSession.PlaybackState.PLAYBACK_STATE_PLAY ? 'PLAY' : 'PAUSE'}`);
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
    const wa = await wantAgent.getWantAgent({
      wants: [{
        bundleName: context.abilityInfo.bundleName,
        abilityName: context.abilityInfo.name,
      }],
      operationType: wantAgent.OperationType.START_ABILITIES,
      requestCode: 0,
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
