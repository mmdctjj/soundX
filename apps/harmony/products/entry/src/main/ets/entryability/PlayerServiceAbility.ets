import ServiceExtensionAbility from '@ohos.app.ability.ServiceExtensionAbility';
import Want from '@ohos.app.ability.Want';
import { wantAgent } from '@kit.AbilityKit';
import { notificationManager } from '@kit.NotificationKit';
import AVSessionManager from '@ohos.multimedia.avSession';
import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';

const NOTIFICATION_ID = 1001;

export default class PlayerServiceAbility extends ServiceExtensionAbility {
  private session: AVSessionManager.AVSession | null = null;

  async onCreate(want: Want): Promise<void> {
    Logger.i('PlayerSvc', 'onCreate');
    await this.bindAVSession();
    this.bindPlayerEvents();
    await this.bindNotification();
  }

  onDestroy(): void {
    Logger.i('PlayerSvc', 'onDestroy');
    if (this.session) {
      this.session.destroy().catch(() => undefined);
      this.session = null;
    }
    audioBackend.release().catch(() => undefined);
  }

  onRequest(want: Want, startId: number): void {
    Logger.i('PlayerSvc', `onRequest startId=${startId}`);
  }

  private async bindAVSession(): Promise<void> {
    this.session = await AVSessionManager.createAVSession(
      this.context, 'AudioDockPlayer', 'audio');
    await this.session.activate();
  }

  private bindPlayerEvents(): void {
    const unsub = playerStore.subscribe(() => {
      if (!this.session) return;
      const v = playerStore.view();
      const track = v.queue[v.currentIndex];
      const meta: AVSessionManager.AVMetadata = {
        assetId: track?.id ?? '',
        title: track?.title ?? '',
        artist: track?.artist ?? '',
        album: track?.album ?? '',
        duration: v.durationMs,
        mediaImage: track?.coverUrl ?? '',
      };
      this.session.setAVMetadata(meta).catch(() => undefined);
      this.session.setAVPlaybackState({
        position: { elapsedTime: v.currentMs, updateTime: Date.now() },
        speed: v.speed,
        state: v.isPlaying
          ? AVSessionManager.PlaybackState.PLAYBACK_STATE_PLAYING
          : AVSessionManager.PlaybackState.PLAYBACK_STATE_PAUSED,
        duration: v.durationMs,
      }).catch(() => undefined);
    });
    // held for service lifetime; service destroy tears down the whole process binding
    void unsub;
  }

  private async bindNotification(): Promise<void> {
    try {
      await notificationManager.requestEnableNotification(this.context);
    } catch (e) {
      Logger.w('PlayerSvc', `notification permission: ${String(e)}`);
    }
    const wa = await wantAgent.getWantAgent({
      wants: [{ bundleName: this.context.applicationInfo.name, abilityName: 'EntryAbility' }],
      operationType: wantAgent.OperationType.START_ABILITIES,
      requestCode: 0,
    });
    const track = playerStore.view().queue[playerStore.view().currentIndex];
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
      Logger.w('PlayerSvc', `notification publish: ${String(e)}`);
    }
  }
}
