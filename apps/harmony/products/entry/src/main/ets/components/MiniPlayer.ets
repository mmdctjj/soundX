import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { playerStore } from '../context/PlayerStore';
import type { PlayerStateView } from '../context/PlayerStore';

@Component
export struct MiniPlayer {
  @State private view: PlayerStateView = playerStore.view();
  private theme: Theme = buildTheme('light');
  private unsub: () => void = () => {};

  aboutToAppear(): void {
    this.unsub = playerStore.subscribe(() => {
      this.view = playerStore.view();
    });
  }

  aboutToDisappear(): void {
    this.unsub();
  }

  build() {
    if (this.view.queue.length > 0) {
      Row({ space: 8 }) {
        Text(this.view.queue[this.view.currentIndex]?.title ?? '')
          .layoutWeight(1)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis });
        Button(this.view.isPlaying ? '⏸' : '▶')
          .onClick(() => playerStore.togglePlay().catch(() => undefined));
        Button('⏭')
          .onClick(() => playerStore.playNext().catch(() => undefined));
      }
      .height(48)
      .width('100%')
      .backgroundColor(this.theme.colors.surface)
      .padding({ left: 12, right: 12 })
      .onClick(() => router.pushUrl({ url: 'pages/PlayerPage' }));
    }
  }
}
