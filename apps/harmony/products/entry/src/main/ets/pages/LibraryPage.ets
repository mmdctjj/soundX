import router from '@ohos.router';
import { kvStore } from 'features_storage';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import {
  artistApi, albumApi, trackApi, collectionApi, mvApi,
} from 'features_network';
import type { ArtistDto, AlbumDto, TrackDto, CollectionDto, MVDto } from 'features_network';
import { AppIcon } from '../components/AppIcon';
import { CoverImage } from '../components/CoverImage';
import { authStore } from '../context/AuthStore';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

const FULL_PAGE: number = 200;

class TabInfo {
  key: string = '';
  label: string = '';

  constructor(key: string, label: string) {
    this.key = key;
    this.label = label;
  }
}

@Component
export struct LibraryTab {
  @State mode: string = 'MUSIC';
  @State activeTab: string = 'artists';
  @State loading: boolean = true;
  @State initialLoading: boolean = true;
  @State error: string = '';
  @State tracks: TrackDto[] = [];
  @State artists: ArtistDto[] = [];
  @State albums: AlbumDto[] = [];
  @State collections: CollectionDto[] = [];
  @State mvs: MVDto[] = [];
  @State tabCounts: Record<string, number> = {};
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');
  private userId: string = '';

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.initData();
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  async initData(): Promise<void> {
    this.userId = authStore.state_.user?.id ?? '';
    try {
      const savedMode = await kvStore.get('playMode');
      if (savedMode) this.mode = savedMode;
    } catch (e) {
      Logger.w('LibraryTab', `read playMode failed: ${String(e)}`);
    }
    await this.loadAllData();
  }

  /**
   * 统计各 tab 数量 + 加载当前 tab 内容。
   * 注意：旧实现这里只有 try/catch 没有 finally，一旦计数请求失败，
   * loading 永远停在 true，声仓页就卡死在骨架屏。现在统一在 finally 收口。
   */
  async loadAllData(): Promise<void> {
    this.loading = true;
    this.initialLoading = true;
    this.error = '';
    try {
      const counts: Record<string, number> = {};
      const isMusic = this.mode === 'MUSIC';

      const artistCount = await artistApi.loadMore({ pageSize: 1, loadCount: 0, type: this.mode });
      counts['artists'] = artistCount.total;

      const albumCount = await albumApi.loadMore({ pageSize: 1, loadCount: 0, type: this.mode });
      counts['albums'] = albumCount.total;

      if (isMusic) {
        const trackCount = await trackApi.loadMore({ pageSize: 1, loadCount: 0, type: 'MUSIC' });
        counts['songs'] = trackCount.total;

        const mvCount = await mvApi.list({ pageSize: 1, skip: 0 });
        counts['mvs'] = mvCount.total;
      } else if (this.userId.length > 0) {
        const cols = await collectionApi.list(this.userId);
        counts['collections'] = cols.length;
      }

      this.tabCounts = counts;
      await this.loadTabData();
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      Logger.e('LibraryTab', `loadAllData failed: ${this.error}`);
    } finally {
      this.loading = false;
      this.initialLoading = false;
    }
  }

  async loadTabData(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      if (this.activeTab === 'songs' && this.mode === 'MUSIC') {
        const res = await trackApi.loadMore({ pageSize: FULL_PAGE, loadCount: 0, type: 'MUSIC' });
        const list = res.list.slice();
        list.sort((a: TrackDto, b: TrackDto) => a.name.localeCompare(b.name));
        this.tracks = list;
      } else if (this.activeTab === 'artists') {
        const res = await artistApi.loadMore({ pageSize: FULL_PAGE, loadCount: 0, type: this.mode });
        const list = res.list.slice();
        list.sort((a: ArtistDto, b: ArtistDto) => a.name.localeCompare(b.name));
        this.artists = list;
      } else if (this.activeTab === 'albums') {
        const res = await albumApi.loadMore({ pageSize: FULL_PAGE, loadCount: 0, type: this.mode });
        const list = res.list.slice();
        list.sort((a: AlbumDto, b: AlbumDto) => a.name.localeCompare(b.name));
        this.albums = list;
      } else if (this.activeTab === 'collections' && this.mode === 'AUDIOBOOK' && this.userId.length > 0) {
        this.collections = await collectionApi.list(this.userId);
      } else if (this.activeTab === 'mvs' && this.mode === 'MUSIC') {
        const res = await mvApi.list({ pageSize: FULL_PAGE, skip: 0 });
        this.mvs = res.list;
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      Logger.e('LibraryTab', `loadTabData failed: ${this.error}`);
    } finally {
      this.loading = false;
    }
  }

  async toggleMode(): Promise<void> {
    this.mode = this.mode === 'MUSIC' ? 'AUDIOBOOK' : 'MUSIC';
    await kvStore.set('playMode', this.mode);
    this.activeTab = 'artists';
    await this.loadAllData();
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    this.loadTabData();
  }

  navigateToSearch(): void {
    router.pushUrl({ url: 'pages/SearchPage' });
  }

  navigateToArtist(id: string): void {
    router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: id } });
  }

  navigateToAlbum(id: string): void {
    router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: id } });
  }

  navigateToCollection(id: string): void {
    router.pushUrl({ url: 'pages/CollectionDetailPage', params: { id: id } });
  }

  navigateToMv(id: string): void {
    router.pushUrl({ url: 'pages/MVDetailPage', params: { id: id } });
  }

  async playFrom(index: number): Promise<void> {
    try {
      const list: Track[] = [];
      for (const item of this.tracks) list.push(await resolveTrackToPlayer(item, false));
      await playerStore.playTrackList(list, index);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('LibraryTab', `play failed: ${String(e)}`);
    }
  }

  getVisibleTabs(): TabInfo[] {
    const tabs: TabInfo[] = [];
    if (this.mode === 'MUSIC') tabs.push(new TabInfo('songs', t('nav.tracks')));
    tabs.push(new TabInfo('artists', t('nav.artists')));
    tabs.push(new TabInfo('albums', t('nav.albums')));
    if (this.mode === 'MUSIC') tabs.push(new TabInfo('mvs', 'MV'));
    if (this.mode === 'AUDIOBOOK') tabs.push(new TabInfo('collections', t('nav.collections')));
    return tabs;
  }

  getTabCount(key: string): number {
    return this.tabCounts[key] ?? 0;
  }

  @Builder
  TabBarBuilder() {
    Row() {
      Row() {
        ForEach(this.getVisibleTabs(), (tab: TabInfo) => {
          Row() {
            Text() {
              Span(tab.label)
                .fontSize(14)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.activeTab === tab.key ? this.theme.colors.onPrimary : this.theme.colors.textSecondary)
              if (this.getTabCount(tab.key) > 0) {
                Span(' ' + this.getTabCount(tab.key))
                  .fontSize(11)
                  .fontWeight(FontWeight.Medium)
                  .fontColor(this.activeTab === tab.key ? this.theme.colors.onPrimary : this.theme.colors.textSecondary)
              }
            }
          }
          .layoutWeight(1)
          .height('100%')
          .borderRadius(18)
          .justifyContent(FlexAlign.Center)
          .backgroundColor(this.activeTab === tab.key ? this.theme.colors.primary : Color.Transparent)
          .onClick(() => this.switchTab(tab.key))
        }, (tab: TabInfo) => tab.key)
      }
      .width('100%')
      .height(40)
      .padding(2)
      .borderRadius(20)
      .borderWidth(1)
      .borderColor(this.theme.colors.border)
      .backgroundColor(this.theme.colors.surface)
    }
    .width('100%')
    .padding({ left: 20, right: 20, bottom: 15 })
  }

  @Builder
  SongItemBuilder(track: TrackDto, index: number) {
    Row() {
      CoverImage({
        path: track.cover,
        imgWidth: 48, imgHeight: 48, radius: 8,
        fallbackText: track.name,
      })
        .margin({ right: 12 })
      Column() {
        Text(track.name)
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(200)
        Text(`${track.artist ?? ''} · ${track.album ?? ''}`)
          .fontSize(12).fontColor(this.theme.colors.textSecondary).margin({ top: 4 })
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(200)
      }
      .layoutWeight(1).alignItems(HorizontalAlign.Start)
    }
    .width('100%')
    .padding({ top: 8, bottom: 8, left: 16, right: 16 })
    .onClick(() => this.playFrom(index))
  }

  @Builder
  ArtistGridBuilder() {
    Grid() {
      ForEach(this.artists, (artist: ArtistDto) => {
        GridItem() {
          Column() {
            CoverImage({
              path: artist.avatar,
              imgWidth: 80, imgHeight: 80, radius: 40,
              fallbackText: artist.name,
            })
            Text(artist.name)
              .fontSize(13).fontColor(this.theme.colors.text).margin({ top: 8 })
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
              .textAlign(TextAlign.Center).width(80)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToArtist(String(artist.id)))
        }
      }, (artist: ArtistDto) => String(artist.id))
    }
    .columnsTemplate('1fr 1fr 1fr').columnsGap(16).rowsGap(16).padding(16)
  }

  @Builder
  AlbumGridBuilder() {
    Grid() {
      ForEach(this.albums, (album: AlbumDto) => {
        GridItem() {
          Column() {
            CoverImage({
              path: album.cover,
              imgWidth: 100, imgHeight: 100, radius: 10,
              fallbackText: album.name,
            })
            Text(album.name)
              .fontSize(13).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
              .margin({ top: 8, bottom: 4 })
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
            Text(album.artist ?? '')
              .fontSize(11).fontColor(this.theme.colors.textSecondary)
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToAlbum(String(album.id)))
        }
      }, (album: AlbumDto) => String(album.id))
    }
    .columnsTemplate('1fr 1fr 1fr').columnsGap(16).rowsGap(16).padding(16)
  }

  @Builder
  CollectionGridBuilder() {
    Grid() {
      ForEach(this.collections, (collection: CollectionDto) => {
        GridItem() {
          Column() {
            CoverImage({
              path: collection.cover,
              imgWidth: 100, imgHeight: 100, radius: 10,
              fallbackText: collection.name,
            })
            Text(collection.name)
              .fontSize(13).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
              .margin({ top: 8, bottom: 4 })
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToCollection(String(collection.id)))
        }
      }, (collection: CollectionDto) => String(collection.id))
    }
    .columnsTemplate('1fr 1fr 1fr').columnsGap(16).rowsGap(16).padding(16)
  }

  @Builder
  MvGridBuilder() {
    Grid() {
      ForEach(this.mvs, (mv: MVDto) => {
        GridItem() {
          Column() {
            CoverImage({
              path: mv.cover,
              imgWidth: 100, imgHeight: 100, radius: 10,
              fallbackText: mv.name,
            })
            Text(mv.name)
              .fontSize(13).fontWeight(FontWeight.Medium).fontColor(this.theme.colors.text)
              .margin({ top: 8, bottom: 4 })
              .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis }).width(100)
            Text(mv.artist ?? t('common.unknownArtist'))
              .fontSize(11).fontColor(this.theme.colors.textSecondary).width(100)
          }
          .margin({ bottom: 16 })
          .onClick(() => this.navigateToMv(String(mv.id)))
        }
      }, (mv: MVDto) => String(mv.id))
    }
    .columnsTemplate('1fr 1fr 1fr').columnsGap(16).rowsGap(16).padding(16)
  }

  @Builder
  ContentBuilder() {
    if (this.error.length > 0) {
      Column({ space: 12 }) {
        Text(t('common.error')).fontSize(16).fontColor(this.theme.colors.text)
        Text(this.error).fontSize(12).fontColor(this.theme.colors.textSecondary)
          .maxLines(3).textAlign(TextAlign.Center)
        Button(t('common.retry'))
          .backgroundColor(this.theme.colors.primary).fontColor(this.theme.colors.onPrimary).borderRadius(18)
          .onClick(() => this.loadAllData())
      }
      .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center).padding(24)
    } else if (this.activeTab === 'songs') {
      List() {
        ForEach(this.tracks, (track: TrackDto, index: number) => {
          ListItem() {
            this.SongItemBuilder(track, index);
          }
        }, (track: TrackDto) => String(track.id))
      }
      .width('100%').layoutWeight(1)
      .scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring)
    } else if (this.activeTab === 'artists') {
      Scroll() {
        this.ArtistGridBuilder()
      }.width('100%').layoutWeight(1).scrollBar(BarState.Off)
    } else if (this.activeTab === 'albums') {
      Scroll() {
        this.AlbumGridBuilder()
      }.width('100%').layoutWeight(1).scrollBar(BarState.Off)
    } else if (this.activeTab === 'collections') {
      Scroll() {
        this.CollectionGridBuilder()
      }.width('100%').layoutWeight(1).scrollBar(BarState.Off)
    } else {
      Scroll() {
        this.MvGridBuilder()
      }.width('100%').layoutWeight(1).scrollBar(BarState.Off)
    }
  }

  @Builder
  ContentSkeleton() {
    if (this.activeTab === 'songs') {
      Column() {
        ForEach([1, 2, 3, 4, 5, 6], (index: number) => {
          Row() {
            Row().width(48).height(48).borderRadius(8)
              .backgroundColor(this.theme.colors.border).margin({ right: 12 })
            Column() {
              Row().width(120).height(16).borderRadius(8)
                .backgroundColor(this.theme.colors.border).margin({ bottom: 8 })
              Row().width(80).height(12).borderRadius(6).backgroundColor(this.theme.colors.border)
            }
            .layoutWeight(1).alignItems(HorizontalAlign.Start)
          }
          .width('100%').padding({ top: 8, bottom: 8, left: 16, right: 16 })
        }, (index: number) => `sk-song-${index}`)
      }
      .width('100%').layoutWeight(1)
    } else {
      Scroll() {
        Grid() {
          ForEach([1, 2, 3, 4, 5, 6], (index: number) => {
            GridItem() {
              Column() {
                Row().width(80).height(80)
                  .borderRadius(this.activeTab === 'artists' ? 40 : 10)
                  .backgroundColor(this.theme.colors.border)
                Row().width(60).height(12).borderRadius(6)
                  .backgroundColor(this.theme.colors.border).margin({ top: 8 })
              }
              .margin({ bottom: 16 })
            }
          }, (index: number) => `sk-grid-${index}`)
        }
        .columnsTemplate('1fr 1fr 1fr').columnsGap(16).rowsGap(16).padding(16)
      }
      .width('100%').layoutWeight(1).scrollBar(BarState.Off)
    }
  }

  build() {
    Column() {
      Row() {
        Text(t('libraryPage.title'))
          .fontSize(24).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
        Row() {
          Button() {
            AppIcon({ name: 'plus', iconSize: 18, color: this.theme.colors.text })
          }
          .width(36).height(36).backgroundColor(this.theme.colors.surface).borderRadius(18)
          .margin({ right: 8 })
          .onClick(() => this.navigateToSearch())

          Button() {
            AppIcon({ name: 'headphones', iconSize: 18, color: this.theme.colors.text })
          }
          .width(36).height(36).backgroundColor(this.theme.colors.surface).borderRadius(18)
          .onClick(() => this.toggleMode())
        }
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16, bottom: 8 })
      .justifyContent(FlexAlign.SpaceBetween)

      this.TabBarBuilder()

      if (this.loading) {
        this.ContentSkeleton()
      } else {
        this.ContentBuilder()
      }
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }
}
