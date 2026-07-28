import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { playerStore } from '../context/PlayerStore';
import type { PlayerStateView, Track } from '../context/PlayerStore';
import { CoverImage } from './CoverImage';
import { AppIcon } from './AppIcon';

/**
 * 全局迷你播放器，布局与行为对齐 mobile 的 MiniPlayer：
 * 封面 40×40 + 标题/艺人 + 上一首/播放暂停/下一首，点击整行进 PlayerPage。
 * MainPage 已悬浮在 tab 栏上方；其余需要展示的页面在根 Column 末尾挂载，
 * 隐藏页面（登录/播放器/设置/音源管理/MV）与 mobile 的 hideBottomBar 一致不挂。
 */
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

  private current(): Track | null {
    if (this.view.queue.length === 0) return null;
    return this.view.queue[this.view.currentIndex] ?? null;
  }

  build() {
    if (this.view.queue.length > 0) {
      Row() {
        CoverImage({
          path: this.current()?.coverUrl ?? null,
          imgWidth: 40,
          imgHeight: 40,
          radius: 4,
          fallbackText: (this.current()?.title ?? '?').substring(0, 1),
        })
        Column({ space: 2 }) {
          Text(this.current()?.title ?? '')
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(this.theme.colors.text)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text(this.current()?.artist ?? '')
            .fontSize(12)
            .fontColor(this.theme.colors.textSecondary)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)
        .margin({ left: 10 })

        Row({ space: 20 }) {
          AppIcon({ name: 'skip-back', iconSize: 20, color: this.theme.colors.text })
            .onClick(() => playerStore.playPrevious().catch(() => undefined))
          AppIcon({
            name: this.view.isPlaying ? 'pause' : 'play',
            iconSize: 20,
            color: this.theme.colors.primary,
          })
            .onClick(() => playerStore.togglePlay().catch(() => undefined))
          AppIcon({ name: 'skip-forward', iconSize: 20, color: this.theme.colors.text })
            .onClick(() => playerStore.playNext().catch(() => undefined))
        }
        .margin({ left: 10 })
      }
      .height(60)
      .width('100%')
      .backgroundColor(this.theme.colors.background)
      .padding({ left: 10, right: 10 })
      .onClick(() => router.pushUrl({ url: 'pages/PlayerPage' }));
    }
  }
}
