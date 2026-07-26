import router from '@ohos.router';
import { buildTheme, CommonNavBar } from 'features_ui';
import type { Theme } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { trackApi } from 'features_network';
import { playerStore } from '../context/PlayerStore';
import type { PlayerStateView } from '../context/PlayerStore';
import { resolveTrackToPlayer } from '../services/trackResolver';

@Entry
@Component
struct PlayerPage {
  @State private view: PlayerStateView = playerStore.view();
  private theme: Theme = buildTheme('light');
  private unsub: () => void = () => {};

  aboutToAppear(): void {
    this.unsub = playerStore.subscribe(() => {
      this.view = playerStore.view();
    });
    const params = router.getParams() as Record<string, string> | undefined;
    const trackId = params?.['trackId'];
    if (trackId) this.loadSingle(trackId);
  }

  aboutToDisappear(): void {
    this.unsub();
  }

  build() {
    Column() {
      CommonNavBar({
        title: t('player.title'),
        theme: this.theme,
        onBack: () => router.back(),
      });
      if (this.view.queue.length === 0) {
        Text(t('player.empty')).margin({ top: 80 });
      } else {
        this.content();
      }
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background);
  }

  @Builder content() {
    Column({ space: 12 }) {
      Text(this.view.queue[this.view.currentIndex]?.title ?? '')
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .margin({ top: 24 })
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis });
      Text(this.view.queue[this.view.currentIndex]?.artist ?? '')
        .fontSize(14)
        .fontColor(this.theme.colors.textSecondary);
      Text(this.view.currentLyric || ' ')
        .fontSize(16)
        .margin({ top: 24 });
      Row({ space: 12 }) {
        Text(formatDuration(this.view.currentMs))
          .fontColor(this.theme.colors.textSecondary)
          .fontSize(12);
        Slider({
          value: this.view.currentMs,
          min: 0,
          max: Math.max(1, this.view.durationMs),
          step: 1000,
        })
          .layoutWeight(1)
          .onChange((v: number) => playerStore.seek(v).catch(() => undefined));
        Text(formatDuration(this.view.durationMs))
          .fontColor(this.theme.colors.textSecondary)
          .fontSize(12);
      }.width('90%');
      Row({ space: 32 }) {
        Button('⏮').onClick(() => playerStore.playPrevious().catch(() => undefined));
        Button(this.view.isPlaying ? '⏸' : '▶')
          .onClick(() => playerStore.togglePlay().catch(() => undefined));
        Button('⏭').onClick(() => playerStore.playNext().catch(() => undefined));
      }
      .justifyContent(FlexAlign.Center)
      .margin({ top: 24 });
    }
    .width('100%')
    .padding(16);
  }

  private loadSingle(trackId: string): void {
    trackApi.getById(trackId)
      .then((dto) => resolveTrackToPlayer(dto, false))
      .then((track) => playerStore.playTrack(track))
      .catch(() => undefined);
  }
}
