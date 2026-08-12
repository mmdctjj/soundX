import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { kvStore } from 'features_storage';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { playlistApi, userDataApi } from 'features_network';
import type { PlaylistDto, TrackDto, AlbumDto } from 'features_network';
import { AppIcon, AppIconName } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { authStore } from '../context/AuthStore';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

// ArkTS strict 拒绝内联对象字面量类型，所以用 class 显式表达
// “三态联合”，再用 `kind` 区分渲染。
class ListRow {
  kind: 'track' | 'album' | 'playlist' = 'track';
  track: TrackDto | null = null;
  album: AlbumDto | null = null;
  playlist: PlaylistDto | null = null;

  static fromTrack(item: TrackDto): ListRow {
    const r = new ListRow();
    r.kind = 'track';
    r.track = item;
    return r;
  }

  static fromAlbum(item: AlbumDto): ListRow {
    const r = new ListRow();
    r.kind = 'album';
    r.album = item;
    return r;
  }

  static fromPlaylist(item: PlaylistDto): ListRow {
    const r = new ListRow();
    r.kind = 'playlist';
    r.playlist = item;
    return r;
  }

  name(): string {
    if (this.kind === 'track' && this.track) return this.track.name;
    if (this.kind === 'album' && this.album) return this.album.name;
    if (this.kind === 'playlist' && this.playlist) return this.playlist.name;
    return '';
  }

  cover(): string {
    if (this.kind === 'track' && this.track) return this.track.cover ?? '';
    if (this.kind === 'album' && this.album) return this.album.cover ?? '';
    if (this.kind === 'playlist' && this.playlist) return this.playlist.cover ?? '';
    return '';
  }

  subtitle(): string {
    if (this.kind === 'track' && this.track) {
      return `${this.track.artist ?? ''} · ${this.track.album ?? ''}`;
    }
    if (this.kind === 'album' && this.album) {
      return this.album.artist ?? '';
    }
    return '';
  }
}

class TabInfo {
  key: string = '';
  label: string = '';

  constructor(key: string, label: string) {
    this.key = key;
    this.label = label;
  }
}

@Component
export struct PersonalTab {
  @State mode: string = 'MUSIC';
  @State sourceType: string = 'AudioDock';
  @State activeTab: string = 'playlists';
  @State activeSubTab: string = 'album';
  @State loading: boolean = true;
  @State error: string = '';
  @State username: string = '';
  @State avatar: string = '';
  @State userId: string = '';
  @State rows: ListRow[] = [];
  @State menuVisible: boolean = false;
  @State createModalVisible: boolean = false;
  @State newPlaylistName: string = '';
  @State creating: boolean = false;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State theme: Theme = buildTheme('light');

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.initData();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async initData(): Promise<void> {
    // baseURL / token 由 EntryAbility + authStore.loadFromStorage 装配。
    const user = authStore.state_.user;
    this.userId = user?.id ?? '';
    this.username = user?.username ?? '';
    this.avatar = user?.avatar ?? '';
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode) this.mode = savedMode;
      const savedSource = await kvStore.get('selectedSourceType');
      if (savedSource) this.sourceType = savedSource;
    } catch (e) {
      Logger.w('PersonalTab', `read storage failed: ${String(e)}`);
    }
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.error = '';
    // 每次加载都重新读取播放模式，保证与其它页签切换后保持一致。
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode) this.mode = savedMode;
    } catch (e) {
      Logger.w('PersonalTab', `read playMode failed: ${String(e)}`);
    }
    // 鸿蒙端暂无离线下载能力，优雅展示空态。
    if (this.activeTab === 'downloads') {
      this.rows = [];
      this.loading = false;
      return;
    }
    if (this.userId.length === 0) {
      this.rows = [];
      this.loading = false;
      return;
    }
    try {
      if (this.activeTab === 'playlists') {
        const list = await playlistApi.list(this.mode);
        const rows: ListRow[] = [];
        for (const p of list) rows.push(ListRow.fromPlaylist(p));
        this.rows = rows;
      } else if (this.activeTab === 'favorites') {
        if (this.activeSubTab === 'track') {
          const res = await userDataApi.likedTracks({ pageSize: 100, loadCount: 0, type: this.mode });
          const rows: ListRow[] = [];
          for (const it of res.list) {
            if (it.track) rows.push(ListRow.fromTrack(it.track));
          }
          this.rows = rows;
        } else {
          const res = await userDataApi.likedAlbums({ pageSize: 100, loadCount: 0, type: this.mode });
          const rows: ListRow[] = [];
          for (const it of res.list) {
            if (it.album) rows.push(ListRow.fromAlbum(it.album));
          }
          this.rows = rows;
        }
      } else if (this.activeTab === 'history') {
        if (this.activeSubTab === 'track') {
          const res = await userDataApi.trackHistory({ pageSize: 100, loadCount: 0, type: this.mode });
          const rows: ListRow[] = [];
          for (const it of res.list) {
            if (it.track) rows.push(ListRow.fromTrack(it.track));
          }
          this.rows = rows;
        } else {
          const res = await userDataApi.albumHistory({ pageSize: 100, loadCount: 0, type: this.mode });
          const rows: ListRow[] = [];
          for (const it of res.list) {
            if (it.album) rows.push(ListRow.fromAlbum(it.album));
          }
          this.rows = rows;
        }
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      Logger.e('PersonalTab', `load failed: ${this.error}`);
    } finally {
      this.loading = false;
    }
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.loadData();
  }

  switchSubTab(tab: string): void {
    this.activeSubTab = tab;
    this.loadData();
  }

  navigateToSettings(): void {
    router.pushUrl({ url: 'pages/SettingsPage' });
  }

  navigateToSourceManage(): void {
    router.pushUrl({ url: 'pages/SourceManagePage' });
  }

  openMenu(): void {
    this.menuVisible = true;
  }

  closeMenu(): void {
    this.menuVisible = false;
  }

  closeCreateModal(): void {
    this.createModalVisible = false;
    this.newPlaylistName = '';
  }

  // 增量/全量/精简/TTS 依赖后端任务系统，鸿蒙端暂未开放，统一优雅提示。
  handleMenuAction(action: string): void {
    this.menuVisible = false;
    if (action === 'createPlaylist') {
      this.createModalVisible = true;
      return;
    }
    promptAction.showToast({ message: '该功能暂未在鸿蒙端开放' });
  }

  canCreate(): boolean {
    return this.newPlaylistName.trim().length > 0 && !this.creating;
  }

  async handleCreatePlaylist(): Promise<void> {
    const name = this.newPlaylistName.trim();
    if (name.length === 0 || this.creating) return;
    this.creating = true;
    try {
      await playlistApi.create(name, this.mode);
      promptAction.showToast({ message: t('playlist.createSuccess') });
      this.createModalVisible = false;
      this.newPlaylistName = '';
      await this.loadData();
    } catch (e) {
      promptAction.showToast({ message: t('personal.createFailed') });
      Logger.e('PersonalTab', `create playlist failed: ${String(e)}`);
    } finally {
      this.creating = false;
    }
  }

  onAvatarClick(): void {
    // 头像上传依赖文件选择与上传接口，鸿蒙端暂仅展示。
    promptAction.showToast({ message: '头像修改暂未在鸿蒙端开放' });
  }

  async onCrownClick(): Promise<void> {
    const plusUserId = await kvStore.get('plus_user_id');
    if (plusUserId) {
      router.pushUrl({ url: 'pages/MemberDetailPage' });
    } else {
      router.pushUrl({ url: 'pages/MemberLoginPage' });
    }
  }

  getTabs(): TabInfo[] {
    const tabs: TabInfo[] = [
      new TabInfo('playlists', t('personal.playlists')),
      new TabInfo('favorites', t('personal.favorites')),
    ];
    if (this.sourceType !== 'Emby') {
      tabs.push(new TabInfo('history', t('personal.history')));
    }
    tabs.push(new TabInfo('downloads', t('personalPage.downloads')));
    return tabs;
  }

  private rowKey(row: ListRow, idx: number): string {
    if (row.kind === 'track' && row.track) return `t-${row.track.id}`;
    if (row.kind === 'album' && row.album) return `a-${row.album.id}`;
    if (row.kind === 'playlist' && row.playlist) return `p-${row.playlist.id}`;
    return `r-${idx}`;
  }

  private onRowClick(row: ListRow): void {
    if (row.kind === 'playlist' && row.playlist) {
      router.pushUrl({ url: 'pages/PlaylistDetailPage', params: { id: String(row.playlist.id) } });
    } else if (row.kind === 'album' && row.album) {
      router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: String(row.album.id) } });
    } else if (row.kind === 'track' && row.track) {
      this.playTrackRow(row);
    }
  }

  private async playTrackRow(row: ListRow): Promise<void> {
    if (!row.track) return;
    try {
      const queue: TrackDto[] = [];
      for (const r of this.rows) {
        if (r.kind === 'track' && r.track) queue.push(r.track);
      }
      const list: Track[] = [];
      for (const item of queue) list.push(await resolveTrackToPlayer(item, false));
      let idx = 0;
      const targetId = row.track.id;
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].id === targetId) { idx = i; break; }
      }
      await playerStore.playTrackList(list, idx);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('PersonalTab', `playTrack failed: ${String(e)}`);
    }
  }

  @Builder
  HeaderBuilder() {
    Row() {
      Button() {
        AppIcon({ name: 'plus', iconSize: 26, color: this.theme.colors.text })
      }
      .width(36).height(36).backgroundColor(Color.Transparent)
      .onClick(() => this.openMenu())

      Row() {
        Button() {
          AppIcon({ name: 'folder', iconSize: 22, color: this.theme.colors.text })
        }
        .width(36).height(36).backgroundColor(Color.Transparent).margin({ right: 8 })
        .onClick(() => this.navigateToSourceManage())

        Button() {
          AppIcon({ name: 'list', iconSize: 22, color: this.theme.colors.text })
        }
        .width(36).height(36).backgroundColor(Color.Transparent)
        .onClick(() => this.navigateToSettings())
      }
      .alignItems(VerticalAlign.Center)
    }
    .width('100%').height(50)
    .padding({ left: 20, right: 20 })
    .justifyContent(FlexAlign.SpaceBetween).alignItems(VerticalAlign.Center)
  }

  @Builder
  UserInfoBuilder() {
    Column() {
      Stack({ alignContent: Alignment.BottomEnd }) {
        CoverImage({
          path: this.avatar,
          imgWidth: 80, imgHeight: 80, radius: 40,
          fallbackText: this.username || '?',
        })
        Stack({ alignContent: Alignment.Center }) {
          AppIcon({ name: 'camera', iconSize: 14, color: this.theme.colors.text })
        }
        .width(24).height(24).borderRadius(12)
        .backgroundColor(this.theme.colors.surface)
        .border({ width: 1, color: 'rgba(0,0,0,0.1)' })
      }
      .width(80).height(80).margin({ bottom: 15 })
      .onClick(() => this.onAvatarClick())

      Row() {
        Text(this.username || t('common.notLoggedIn'))
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
        AppIcon({ name: 'crown', iconSize: 24, color: this.theme.colors.textSecondary })
          .margin({ left: 8 })
          .onClick(() => this.onCrownClick())
      }
      .alignItems(VerticalAlign.Center)
    }
    .width('100%').alignItems(HorizontalAlign.Center).padding({ top: 8, bottom: 16 })
  }

  @Builder
  TabBarBuilder() {
    Row() {
      ForEach(this.getTabs(), (tab: TabInfo) => {
        Column() {
          Text(tab.label)
            .fontSize(16)
            .fontWeight(this.activeTab === tab.key ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeTab === tab.key ? this.theme.colors.primary : this.theme.colors.textSecondary)
        }
        .layoutWeight(1).alignItems(HorizontalAlign.Center)
        .padding({ top: 15, bottom: 15 })
        .border({
          width: { bottom: this.activeTab === tab.key ? 2 : 0 },
          color: this.theme.colors.primary,
        })
        .onClick(() => this.switchTab(tab.key))
      }, (tab: TabInfo) => tab.key)
    }
    .width('100%')
    .padding({ left: 20, right: 20 })
    .border({ width: { bottom: 1 }, color: this.theme.colors.border })
  }

  @Builder
  SubTabBuilder() {
    if (this.activeTab === 'favorites' || this.activeTab === 'history') {
      Row({ space: 12 }) {
        Row() {
          Text(t('personal.album'))
            .fontSize(14)
            .fontWeight(this.activeSubTab === 'album' ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeSubTab === 'album' ? this.theme.colors.primary : this.theme.colors.textSecondary)
        }
        .padding({ left: 16, right: 16, top: 6, bottom: 6 }).borderRadius(20)
        .backgroundColor(this.activeSubTab === 'album' ? 'rgba(150,150,150,0.1)' : Color.Transparent)
        .onClick(() => this.switchSubTab('album'))

        if (this.mode !== 'AUDIOBOOK') {
          Row() {
            Text(t('personal.track'))
              .fontSize(14)
              .fontWeight(this.activeSubTab === 'track' ? FontWeight.Bold : FontWeight.Normal)
              .fontColor(this.activeSubTab === 'track' ? this.theme.colors.primary : this.theme.colors.textSecondary)
          }
          .padding({ left: 16, right: 16, top: 6, bottom: 6 }).borderRadius(20)
          .backgroundColor(this.activeSubTab === 'track' ? 'rgba(150,150,150,0.1)' : Color.Transparent)
          .onClick(() => this.switchSubTab('track'))
        }
      }
      .width('100%')
      .padding({ left: 20, right: 20, top: 10, bottom: 10 })
      .justifyContent(FlexAlign.Start)
    }
  }

  @Builder
  ListRowBuilder(row: ListRow) {
    Row() {
      if (row.kind === 'playlist') {
        // 堆叠封面：对齐 mobile StackedCover 视觉
        Stack({ alignContent: Alignment.TopStart }) {
          CoverImage({
            path: row.cover(),
            imgWidth: 50, imgHeight: 50, radius: 8,
            fallbackText: row.name(),
          })
            .offset({ x: 12, y: 6 })
            .opacity(0.7)
            .scale({ x: 0.92, y: 0.92 })
          CoverImage({
            path: row.cover(),
            imgWidth: 50, imgHeight: 50, radius: 8,
            fallbackText: row.name(),
          })
            .offset({ x: 6, y: 3 })
            .opacity(0.85)
            .scale({ x: 0.96, y: 0.96 })
          CoverImage({
            path: row.cover(),
            imgWidth: 50, imgHeight: 50, radius: 8,
            fallbackText: row.name(),
          })
        }
        .width(62).height(56)
        .margin({ right: 15 })
      } else {
        CoverImage({
          path: row.cover(),
          imgWidth: 50, imgHeight: 50, radius: 8,
          fallbackText: row.name(),
        }).margin({ right: 15 })
      }

      Column() {
        Text(row.name())
          .fontSize(16).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })

        if (row.kind !== 'playlist') {
          Text(row.subtitle())
            .fontSize(13).fontColor(this.theme.colors.textSecondary).margin({ top: 4 })
            .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        }
      }
      .layoutWeight(1).alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding(15).alignItems(VerticalAlign.Center)
    .border({ width: { bottom: 0.5 }, color: this.theme.colors.border })
    .onClick(() => this.onRowClick(row))
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      ForEach([1, 2, 3, 4, 5, 6, 7, 8], (index: number) => {
        Row() {
          Row().width(50).height(50).borderRadius(8)
            .backgroundColor(this.theme.colors.border).margin({ right: 15 })
          Column() {
            Row().width(150).height(16).borderRadius(8)
              .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
            Row().width(92).height(13).borderRadius(6).backgroundColor(this.theme.colors.border)
          }
          .layoutWeight(1).alignItems(HorizontalAlign.Start)
        }
        .width('100%').padding(15)
      }, (index: number) => `psk-${index}`)
    }
    .width('100%').layoutWeight(1).alignItems(HorizontalAlign.Start)
  }

  @Builder
  EmptyState() {
    Column() {
      Text(t('common.noData')).fontSize(14).fontColor(this.theme.colors.textSecondary).margin({ top: 40 })
    }
    .width('100%').layoutWeight(1).alignItems(HorizontalAlign.Center)
  }

  @Builder
  ErrorState() {
    Column({ space: 12 }) {
      Text(t('common.error')).fontSize(16).fontColor(this.theme.colors.text)
      Text(this.error).fontSize(12).fontColor(this.theme.colors.textSecondary)
        .maxLines(3).textAlign(TextAlign.Center)
      Button(t('common.retry'))
        .backgroundColor(this.theme.colors.primary).fontColor(this.theme.colors.onPrimary).borderRadius(18)
        .onClick(() => this.loadData())
    }
    .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center).padding(24)
  }

  @Builder
  MenuItemBuilder(icon: AppIconName, label: string, action: string) {
    Row() {
      AppIcon({ name: icon, iconSize: 22, color: this.theme.colors.text }).margin({ right: 12 })
      Text(label).fontSize(16).fontColor(this.theme.colors.text)
    }
    .width('100%')
    .padding({ top: 12, bottom: 12, left: 16, right: 16 })
    .alignItems(VerticalAlign.Center)
    .onClick(() => this.handleMenuAction(action))
  }

  @Builder
  MenuDivider() {
    Row().width('100%').height(1).backgroundColor(this.theme.colors.border)
  }

  @Builder
  MenuOverlay() {
    Stack({ alignContent: Alignment.Center }) {
      Column()
        .width('100%').height('100%')
        .backgroundColor('rgba(0,0,0,0.4)')
        .onClick(() => this.closeMenu())

      Column() {
        this.MenuItemBuilder('playlist', t('personal.createPlaylist'), 'createPlaylist')
        this.MenuDivider()
        this.MenuItemBuilder('arrow-clockwise', t('personal.incrementalUpdate'), 'incremental')
        this.MenuDivider()
        this.MenuItemBuilder('repeat', t('personal.fullUpdate'), 'full')
        if (this.sourceType !== 'Emby' && this.mode !== 'MUSIC') {
          this.MenuDivider()
          this.MenuItemBuilder('headphones', t('personal.ttsConversion'), 'tts')
        }
        this.MenuDivider()
        this.MenuItemBuilder('folder', t('personal.compactData'), 'compact')
      }
      .width(220)
      .backgroundColor(this.theme.colors.surface).borderRadius(12)
      .padding({ top: 8, bottom: 8 })
    }
    .width('100%').height('100%')
  }

  @Builder
  CreateModalOverlay() {
    Stack({ alignContent: Alignment.Center }) {
      Column()
        .width('100%').height('100%')
        .backgroundColor('rgba(0,0,0,0.4)')
        .onClick(() => this.closeCreateModal())

      Column() {
        Text(t('playlist.newPlaylist'))
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
          .textAlign(TextAlign.Center).width('100%').margin({ bottom: 20 })

        TextInput({ placeholder: t('playlist.namePlaceholder'), text: this.newPlaylistName })
          .placeholderColor(this.theme.colors.textSecondary)
          .fontColor(this.theme.colors.text)
          .fontSize(16)
          .backgroundColor(this.theme.colors.background)
          .borderRadius(12).border({ width: 1, color: this.theme.colors.border })
          .height(48).margin({ bottom: 24 })
          .onChange((value: string): void => { this.newPlaylistName = value; })

        Row({ space: 12 }) {
          Row() {
            Text(t('common.cancel')).fontSize(16).fontColor(this.theme.colors.textSecondary)
          }
          .padding({ top: 10, bottom: 10, left: 20, right: 20 })
          .onClick(() => this.closeCreateModal())

          Row() {
            if (this.creating) {
              LoadingProgress().width(20).height(20).color(this.theme.colors.onPrimary)
            } else {
              Text(t('common.confirm'))
                .fontSize(16).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.onPrimary)
            }
          }
          .padding({ top: 10, bottom: 10, left: 24, right: 24 }).borderRadius(10)
          .backgroundColor(this.theme.colors.primary)
          .opacity(this.canCreate() ? 1 : 0.5)
          .onClick(() => this.handleCreatePlaylist())
        }
        .width('100%').justifyContent(FlexAlign.End)
      }
      .width('80%')
      .backgroundColor(this.theme.colors.surface).borderRadius(20).padding(24)
    }
    .width('100%').height('100%')
  }

  build() {
    // 语言切换时重建整页：条件读取 appLang 建立依赖（框架只追踪读取状态变量的表达式，
    // t() 是普通函数无法被追踪），语言变化使 if 分支切换，旧子树销毁、新子树重建，
    // 所有 t() 文案（含局部 @Builder 和 @Prop 传串的子组件）都按新语言重新求值。
    if (this.appLang === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }

  @Builder
  LocalizedContent() {
    Stack({ alignContent: Alignment.Center }) {
      Column() {
        this.HeaderBuilder()
        this.UserInfoBuilder()
        this.TabBarBuilder()
        this.SubTabBuilder()

        if (this.loading) {
          this.LoadingSkeleton();
        } else if (this.error.length > 0) {
          this.ErrorState();
        } else if (this.rows.length === 0) {
          this.EmptyState();
        } else {
          List() {
            ForEach(this.rows, (row: ListRow, idx: number) => {
              ListItem() {
                this.ListRowBuilder(row);
              }
            }, (row: ListRow, idx: number) => this.rowKey(row, idx))
          }
          .width('100%').layoutWeight(1)
          .scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring)
        }
      }
      .width('100%').height('100%').backgroundColor(this.theme.colors.background)

      if (this.menuVisible) {
        this.MenuOverlay();
      }
      if (this.createModalVisible) {
        this.CreateModalOverlay();
      }
    }
    .width('100%').height('100%')
  }
}
