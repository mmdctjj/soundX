import { Logger } from 'audiodock_common';
import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { syncStore, type SyncInvite } from '../context/SyncStore';

/**
 * 同步播放邀请悬浮通知。对齐 mobile InviteNotification：
 * - 顶部弹出（顶部 12 像素内边距）
 * - 显示发起人 + 设备 + 当前曲目
 * - 接受 / 拒绝 两个圆形按钮
 * - 15 秒未操作自动拒绝
 * - 同一时刻只展示一条邀请（FIFO）；点接受/拒绝后展示下一条
 *
 * 该组件无 @State visible：自身通过 syncStore.subscribe 拉取 invites，
 * 因此挂在任何页面都会自动响应。
 */
@Component
export struct SyncNotification {
  @State private current: SyncInvite | null = null;
  @State private animTop: number = -200;
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');
  private unsub: (() => void) | null = null;
  private timerId: number = -1;

  aboutToAppear(): void {
    this.theme = buildTheme('light');
    this.langAtBuild = getLang();
    this.unsub = syncStore.subscribe((): void => {
      this.pullNext();
    });
    this.pullNext();
  }

  aboutToDisappear(): void {
    if (this.unsub) this.unsub();
    if (this.timerId !== -1) {
      clearTimeout(this.timerId);
      this.timerId = -1;
    }
  }

  private pullNext(): void {
    const sv = syncStore.view();
    if (this.current === null && sv.invites.length > 0) {
      const first: SyncInvite = sv.invites[0];
      this.show(first);
    }
  }

  private show(invite: SyncInvite): void {
    this.current = invite;
    // 简单入场动画：直接放下来；复杂动效可后续加 animateTo
    this.animTop = 40;
    if (this.timerId !== -1) {
      clearTimeout(this.timerId);
      this.timerId = -1;
    }
    this.timerId = setTimeout((): void => {
      Logger.i('SyncNotification', 'auto-reject after 15s');
      this.handleReject();
    }, 15_000);
  }

  private hide(): void {
    this.animTop = -200;
    if (this.timerId !== -1) {
      clearTimeout(this.timerId);
      this.timerId = -1;
    }
    this.current = null;
    // 显示队列里的下一条
    this.pullNext();
  }

  private handleAccept(): void {
    const inv = this.current;
    if (!inv) return;
    syncStore.acceptInvite(inv);
    this.hide();
  }

  private handleReject(): void {
    const inv = this.current;
    if (!inv) return;
    syncStore.rejectInvite(inv);
    this.hide();
  }

  build() {
    Stack() {
      if (this.current !== null) {
        Column() {
          Row() {
            Column() {
              Text(t('sync.syncInvite'))
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.theme.colors.text);
              Text(t('sync.fromUser', [
                ['username', this.current.fromUsername || ''],
                ['deviceName', this.current.fromDeviceName || ''],
              ]))
                .fontSize(13)
                .fontColor(this.theme.colors.textSecondary)
                .margin({ top: 4 });
              if (this.current.currentTrack) {
                Text(t('sync.nowPlaying', [['trackName',
                  String((this.current.currentTrack as Record<string, Object>)['title'] ?? '')]]))
                  .fontSize(12)
                  .fontColor(this.theme.colors.textSecondary)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .margin({ top: 2 });
              }
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start);

            Row({ space: 10 }) {
              Text('×')
                .width(36).height(36)
                .fontSize(20)
                .fontColor(this.theme.colors.textSecondary)
                .backgroundColor(this.theme.colors.border)
                .borderRadius(18)
                .textAlign(TextAlign.Center)
                .onClick((): void => this.handleReject());

              Text('✓')
                .width(36).height(36)
                .fontSize(20)
                .fontColor(Color.White)
                .fontWeight(FontWeight.Bold)
                .backgroundColor('#3F51B5')
                .borderRadius(18)
                .textAlign(TextAlign.Center)
                .onClick((): void => this.handleAccept());
            }
            .margin({ left: 12 });
          }
          .padding(16)
          .backgroundColor(this.theme.colors.surface)
          .borderRadius(12)
          .shadow({ radius: 12, color: 'rgba(0,0,0,0.25)', offsetY: 4 });
        }
        .padding({ left: 16, right: 16 })
        .width('100%')
        .position({ x: 0, y: this.animTop });
      } else {
        Column().width(0).height(0);
      }
    }
    .width('100%')
    .height('100%')
    .hitTestBehavior(HitTestMode.Transparent);
  }
}