import { avSession } from '@kit.AVSessionKit';
import { common, wantAgent } from '@kit.AbilityKit';
import { notificationManager } from '@kit.NotificationKit';
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';

const NOTIFICATION_ID = 1001;

let session: avSession.AVSession | null = null;

export async function installAVSessionService(context: common.UIAbilityContext): Promise<void> {
  session = await avSession.createAVSession(context, 'AudioDockPlayer', 'audio');
  await session.activate();
  bindPlayerEvents();
  await bindNotification(context);
  Logger.i('AVSession', 'installed');
}

export function releaseAVSessionService(): void {
  if (session) {
    session.destroy().catch(() => undefined);
    session = null;
  }
  audioBackend.release().catch(() => undefined);
}

function bindPlayerEvents(): void {
  playerStore.subscribe(() => {
    if (!session) return;
    const v = playerStore.view();
    const track = v.queue[v.currentIndex];
    const meta: avSession.AVMetadata = {
      assetId: track?.id ?? '',
      title: track?.title ?? '',
      artist: track?.artist ?? '',
      album: track?.album ?? '',
      duration: v.durationMs,
      mediaImage: track?.coverUrl ?? '',
    };
    session.setAVMetadata(meta).catch(() => undefined);
    session.setAVPlaybackState({
      position: { elapsedTime: v.currentMs, updateTime: Date.now() },
      speed: v.speed,
      state: v.isPlaying
        ? avSession.PlaybackState.PLAYBACK_STATE_PLAY
        : avSession.PlaybackState.PLAYBACK_STATE_PAUSE,
      duration: v.durationMs,
    }).catch(() => undefined);
  });
}

async function bindNotification(context: common.UIAbilityContext): Promise<void> {
  try {
    await notificationManager.requestEnableNotification(context);
  } catch (e) {
    Logger.w('AVSession', `notification permission: ${String(e)}`);
  }
  const wa = await wantAgent.getWantAgent({
    wants: [{ bundleName: context.applicationInfo.name, abilityName: 'EntryAbility' }],
    operationType: wantAgent.OperationType.START_ABILITIES,
    requestCode: 0,
  });
  const v = playerStore.view();
  const track = v.queue[v.currentIndex];
  const req: notificationManager.NotificationRequest = {
    id: NOTIFICATION_ID,
    content: {
      notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
      normal: {
        title: track?.title ?? 'AudioDock',
        text: track?.artist ?? '',
      },
    },
    wantAgent: wa,
    isOngoing: true,
  };
  try { await notificationManager.publish(req); } catch (e) {
    Logger.w('AVSession', `notification publish: ${String(e)}`);
  }
}
