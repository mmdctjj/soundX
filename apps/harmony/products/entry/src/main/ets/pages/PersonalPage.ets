import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { playlistApi, userDataApi } from 'features_network';
import type { PlaylistDto, TrackDto, AlbumDto } from 'features_network';
import { AppIcon } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { authStore } from '../context/AuthStore';
import { buildTheme, withAlpha } from 'features_ui';
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
  @State activeTab: string = 'playlists';
  @State activeSubTab: string = 'album';
  @State loading: boolean = true;
  @State error: string = '';
  @State username: string = '';
  @State avatar: string = '';
  @State userId: string = '';
  @State rows: ListRow[] = [];
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');

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
    } catch (e) {
      Logger.w('PersonalTab', `read playMode failed: ${String(e)}`);
    }
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading = true;
    this.error = '';
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

  async toggleMode(): Promise<void> {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    await kvStore.set('playMode', this.mode);
    await this.loadData();
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

  async logout(): Promise<void> {
    try {
      await authStore.logout();
      await kvStore.delete('serverAddress');
      await kvStore.delete('selectedSourceType');
      router.replaceUrl({ url: 'pages/SourceSelectPage' });
    } catch (e) {
      Logger.e('PersonalTab', `logout failed: ${String(e)}`);
    }
  }

  getTabs(): TabInfo[] {
    return [
      new TabInfo('playlists', t('nav.playlists')),
      new TabInfo('favorites', t('nav.favorites')),
      new TabInfo('history', t('nav.listened')),
    ];
  }

  @Builder
  TabBarBuilder() {
    Row() {
      ForEach(this.getTabs(), (tab: TabInfo) => {
        Column() {
          Text(tab.label)
            .fontSize(15)
            .fontWeight(this.activeTab === tab.key ? FontWeight.Bold : FontWeight.Normal)
            .fontColor(this.activeTab === tab.key ? this.theme.colors.primary : this.theme.colors.textSecondary)
        }
        .layoutWeight(1)
        .padding({ top: 12, bottom: 12 })
        .border({
          width: { bottom: this.activeTab === tab.key ? 2 : 0 },
          color: this.theme.colors.primary,
        })
        .onClick(() => this.switchTab(tab.key))
      }, (tab: TabInfo) => tab.key)
    }
    .width('100%')
  }

  @Builder
  SubTabBuilder() {
    if (this.activeTab === 'favorites' || this.activeTab === 'history') {
      Row() {
        Button(t('personal.album'))
          .backgroundColor(this.activeSubTab === 'album' ? withAlpha(this.theme.colors.primary, '20') : Color.Transparent)
          .fontColor(this.activeSubTab === 'album' ? this.theme.colors.primary : this.theme.colors.textSecondary)
          .borderRadius(16).height(32)
          .onClick(() => this.switchSubTab('album'))

        if (this.mode !== 'AUDIOBOOK') {
          Button(t('personal.track'))
            .backgroundColor(this.activeSubTab === 'track' ? withAlpha(this.theme.colors.primary, '20') : Color.Transparent)
            .fontColor(this.activeSubTab === 'track' ? this.theme.colors.primary : this.theme.colors.textSecondary)
            .borderRadius(16).height(32)
            .margin({ left: 8 })
            .onClick(() => this.switchSubTab('track'))
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, bottom: 8 })
      .justifyContent(FlexAlign.Start)
    }
  }

  @Builder
  ListRowBuilder(row: ListRow) {
    Row() {
      CoverImage({
        path: row.cover(),
        imgWidth: 50, imgHeight: 50, radius: 8,
        fallbackText: row.name(),
      }).margin({ right: 12 })

      Column() {
        Text(row.name())
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(200)

        if (row.kind !== 'playlist') {
          Text(row.subtitle())
            .fontSize(12).fontColor(this.theme.colors.textSecondary).margin({ top: 4 })
            .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(200)
        }
      }
      .layoutWeight(1).alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 10, bottom: 10, left: 16, right: 16 })
    .onClick(() => this.onRowClick(row))
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
      router.pushUrl({ url: 'pages/PlayerPage' });
    }
  }

  @Builder
  LoadingSkeleton() {
    Column() {
      ForEach([1, 2, 3, 4, 5], (index: number) => {
        Row() {
          Row().width(50).height(50).borderRadius(8)
            .backgroundColor(this.theme.colors.border).margin({ right: 12 })
          Column() {
            Row().width(120).height(16).borderRadius(8)
              .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
            Row().width(80).height(12).borderRadius(6).backgroundColor(this.theme.colors.border)
          }
          .layoutWeight(1)
        }
        .width('100%').padding({ top: 10, bottom: 10, left: 16, right: 16 })
      }, (index: number) => `psk-${index}`)
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }

  build() {
    if (this.loading) {
      this.LoadingSkeleton();
    } else {
      Column() {
        Row() {
          Text(t('navTabs.mine'))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
          Row() {
            Button() {
              AppIcon({ name: 'folder', iconSize: 22, color: this.theme.colors.text })
            }
            .width(36).height(36).backgroundColor(this.theme.colors.surface).borderRadius(18)
            .margin({ right: 8 })
            .onClick(() => this.navigateToSourceManage())

            Button() {
              AppIcon({ name: 'folder', iconSize: 22, color: this.theme.colors.text })
            }
            .width(36).height(36).backgroundColor(this.theme.colors.surface).borderRadius(18)
            .onClick(() => this.navigateToSettings())
          }
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 16, bottom: 8 })
        .justifyContent(FlexAlign.SpaceBetween)

        Row() {
          Stack({ alignContent: Alignment.BottomEnd }) {
            CoverImage({
              path: this.avatar,
              imgWidth: 80, imgHeight: 80, radius: 40,
              fallbackText: this.username || '?',
                          })
            Stack({ alignContent: Alignment.Center }) {
              AppIcon({ name: 'camera', iconSize: 12, color: '#000000' })
            }
            .width(24).height(24).borderRadius(12).backgroundColor('#FFFFFF')
          }
          .width(80).height(80)

          Column() {
            Row() {
              Text(this.username || t('common.notLoggedIn'))
                .fontSize(18).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
              if (this.userId.length > 0) {
                AppIcon({ name: 'crown', iconSize: 20, color: '#FFD700' }).margin({ left: 6 })
              }
            }
            .alignItems(VerticalAlign.Center)

            Row() {
              Button(this.mode === 'MUSIC' ? t('nav.library') : t('nav.personal'))
                .backgroundColor(this.theme.colors.surface).fontColor(this.theme.colors.text)
                .borderRadius(16).height(32).margin({ right: 8 })
                .onClick(() => this.toggleMode())
              Button('退出')
                .backgroundColor(withAlpha(this.theme.colors.error, '20')).fontColor(this.theme.colors.error)
                .borderRadius(16).height(32)
                .onClick(() => this.logout())
            }
            .margin({ top: 12 })
          }
          .layoutWeight(1).margin({ left: 16 }).alignItems(HorizontalAlign.Start)
        }
        .width('100%').padding({ left: 16, right: 16, top: 16, bottom: 16 })

        this.TabBarBuilder()
        this.SubTabBuilder()

        if (this.error.length > 0) {
          Column({ space: 12 }) {
            Text(t('common.error')).fontSize(16).fontColor(this.theme.colors.text)
            Text(this.error).fontSize(12).fontColor(this.theme.colors.textSecondary)
              .maxLines(3).textAlign(TextAlign.Center)
            Button(t('common.retry'))
              .backgroundColor(this.theme.colors.primary).fontColor(this.theme.colors.onPrimary).borderRadius(18)
              .onClick(() => this.loadData())
          }
          .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center).padding(24)
        } else if (this.rows.length === 0) {
          Column() {
            Text(t('common.noData')).fontSize(14).fontColor(this.theme.colors.textSecondary).margin({ top: 40 })
          }
          .width('100%').layoutWeight(1)
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
    }
  }
}
