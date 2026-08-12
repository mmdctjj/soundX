import { httpClient } from 'features_network';
import { Logger } from 'audiodock_common';
import { buildTheme } from 'features_ui';
import type { Theme } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { authStore } from '../context/AuthStore';
import { syncStore } from '../context/SyncStore';
import type { InviteUsersPayload } from '../context/SyncStore';

interface InviteUser {
  id: string;
  username: string;
  nickname?: string;
}

interface InviteListResponse {
  code: number;
  message?: string;
  data: InviteUser[];
}

/**
 * 「选择同步好友」底部弹层。对齐 mobile SyncModal：
 * - 拉取 /user/list 排除自己
 * - 多选用户 + checkbox
 * - 「发起同步」按钮：emit 'invite' 事件，携带当前曲目/播放列表/进度，并先暂停本地播放
 * 等待被邀请方接受后由 SyncStore 收到 sync_session_started 切换到同步态。
 */
@Component
export struct SyncInviteModal {
  @Prop @Watch('onVisibleChange') visible: boolean = false;
  onClose: () => void = (): void => undefined;

  @State private users: InviteUser[] = [];
  @State private selectedIds: string[] = [];
  @State private loading: boolean = false;
  @State private submitting: boolean = false;
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');

  /** Modal 打开时拉取用户列表；关闭时清空选择。 */
  aboutToAppear(): void {
    this.theme = buildTheme('light');
    this.langAtBuild = getLang();
    if (this.visible) {
      this.fetchUsers();
    }
  }

  /** 监听 visible 变化：第一次打开时拉数据，关闭时清选择。 */
  onVisibleChange(): void {
    if (this.visible) {
      this.fetchUsers();
    } else {
      this.selectedIds = [];
    }
  }

  private async fetchUsers(): Promise<void> {
    this.loading = true;
    try {
      const localId = authStore.state_.user?.id ?? '';
      const res = await httpClient.get<InviteListResponse>('/user/list', {});
      const data = res && res.code === 200 ? (res.data ?? []) : [];
      this.users = data.filter((u): boolean => u.id !== localId);
    } catch (e) {
      Logger.w('SyncInviteModal', `fetchUsers failed: ${String(e)}`);
      this.users = [];
    } finally {
      this.loading = false;
    }
  }

  private toggleUser(id: string): void {
    const set = new Set<string>(this.selectedIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    this.selectedIds = Array.from(set);
  }

  private async handleInvite(): Promise<void> {
    if (this.selectedIds.length === 0 || this.submitting) return;
    this.submitting = true;
    try {
      // 发起邀请时先暂停本地播放，等待对方加入（对齐 mobile SyncModal.handleInvite）
      await playerStore.pause();

      const sv = syncStore.view();
      const sessionId = sv.sessionId ?? `sync_${authStore.state_.user?.id ?? 'guest'}_${Date.now()}`;
      const view = playerStore.view();
      const cur: Track | undefined = view.queue[view.currentIndex];
      const progress = view.currentMs;

      const payload: InviteUsersPayload = {
        targetUserIds: this.selectedIds,
        currentTrack: cur,
        playlist: view.queue,
        progress,
        sessionId,
      };
      syncStore.inviteUsers(payload);

      // 本地立刻标记为「同步中」，等待服务端下发的 sync_session_started 做权威切换。
      syncStore.setSynced(true, sessionId);

      this.onClose();
    } catch (e) {
      Logger.w('SyncInviteModal', `handleInvite failed: ${String(e)}`);
    } finally {
      this.submitting = false;
    }
  }

  @Builder private rowContent(u: InviteUser): void {
    Row() {
      // Avatar: 用昵称首字母，无头图 fallback
      Text((u.nickname || u.username || '?').charAt(0).toUpperCase())
        .width(40).height(40)
        .fontSize(18).fontWeight(FontWeight.Bold)
        .fontColor(Color.White)
        .backgroundColor('#3F51B5')
        .borderRadius(20)
        .textAlign(TextAlign.Center)
        .margin({ right: 12 });

      Text(u.nickname || u.username)
        .fontSize(16)
        .fontColor(this.theme.colors.text)
        .layoutWeight(1);

      // Checkbox
      Column() {
        if (this.selectedIds.indexOf(u.id) >= 0) {
          Text('✓').fontSize(16).fontColor(Color.White).fontWeight(FontWeight.Bold);
        }
      }
      .width(22).height(22)
      .borderRadius(11)
      .border({
        width: this.selectedIds.indexOf(u.id) >= 0 ? 0 : 1,
        color: this.theme.colors.border,
      })
      .backgroundColor(this.selectedIds.indexOf(u.id) >= 0 ? '#3F51B5' : Color.Transparent)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center);
    }
    .width('100%')
    .padding({ top: 12, bottom: 12 })
    .border({
      width: { bottom: 0.5 },
      color: this.theme.colors.border,
    })
    .onClick((): void => this.toggleUser(u.id));
  }

  build() {
    // 注意：本组件原本自带 Stack + 黑色半透明遮罩 + 60% 高度定位模拟底部弹层，
    // 设计为可独立使用。但 PlayerPage 是用 bindSheet 包裹本组件调用的——
    // 两层叠加导致「两层弹窗」视觉问题（灰色蒙版 + 中间面板 + 底部浅灰）。
    // 现改为纯内容组件，让外层 bindSheet 负责遮罩、圆角、关闭交互（dragBar 下拉/外部点击）。
    Column() {
      // Header：bindSheet 已自带 dragBar 的关闭交互，不再放标题旁的 × 按钮
      Text(t('sync.selectSyncFriends'))
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .width('100%')
        .padding({ left: 20, right: 20, top: 16, bottom: 12 });

      // Body
      if (this.loading) {
        Column() {
          LoadingProgress().width(36).height(36).color('#3F51B5');
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center);
      } else if (this.users.length === 0) {
        Column() {
          Text(t('sync.noOnlineFriends'))
            .fontSize(14)
            .fontColor(this.theme.colors.textSecondary);
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center);
      } else {
        List({ space: 0 }) {
          ForEach(this.users, (u: InviteUser): void => {
            ListItem() {
              this.rowContent(u);
            }
          }, (u: InviteUser): string => u.id);
        }
        .width('100%')
        .layoutWeight(1)
        .padding({ left: 20, right: 20 });
      }

      // Footer：发起按钮
      Row() {
        Button(this.selectedIds.length > 0
          ? t('sync.initiateSyncCount', [['count', this.selectedIds.length]])
          : t('sync.initiateSync'))
          .width('100%')
          .height(48)
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .backgroundColor('#3F51B5')
          .fontColor(Color.White)
          .borderRadius(24)
          .opacity(this.selectedIds.length > 0 ? 1 : 0.5)
          .enabled(this.selectedIds.length > 0 && !this.submitting)
          .onClick((): void => {
            this.handleInvite().catch((e: Error): void => {
              Logger.w('SyncInviteModal', `handleInvite rejected: ${String(e)}`);
            });
          });
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 16, bottom: 24 });
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.surface)
    .visibility(this.visible ? Visibility.Visible : Visibility.None);
  }
}