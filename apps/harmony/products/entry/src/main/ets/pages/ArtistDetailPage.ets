import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { albumApi, artistApi, trackApi, collectionApi, mvApi } from 'features_network';
import type { AlbumDto, ArtistDto, TrackDto, MVDto, CollectionDto, CollectionAlbumItem } from 'features_network';
import { DetailHero } from '../components/DetailHero';
import { SectionHeader } from '../components/SectionHeader';
import { AlbumCarouselCard } from '../components/AlbumCarouselCard';
import { TrackRow } from '../components/TrackRow';
import { MiniPlayer } from '../components/MiniPlayer';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { authStore } from '../context/AuthStore';

const SKELETON_ROWS: number[] = [0, 1, 2, 3, 4, 5, 6];
const SKELETON_CARDS: number[] = [0, 1, 2];

@Entry
@Component
struct ArtistDetailPage {
  @State artist: ArtistDto | null = null;
  @State albums: AlbumDto[] = [];
  @State collaborativeAlbums: AlbumDto[] = [];
  @State tracks: TrackDto[] = [];
  @State collections: CollectionDto[] = [];
  @State mvs: MVDto[] = [];
  @State loading: boolean = true;
  @State error: string = '';
  @State currentTrackId: string = '';
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');
  private unsubPlayer: () => void = () => {};

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    interface RouterParams { id?: string }
    const p = router.getParams() as RouterParams;
    this.entityId = p.id ?? '';
    this.load();
    this.unsubPlayer = playerStore.subscribe(() => {
      const v = playerStore.view();
      const cur = v.queue[v.currentIndex];
      this.currentTrackId = cur ? cur.id : '';
    });
  }

  aboutToDisappear(): void {
    this.unsubPlayer();
  }

  build() {
    Column() {
      // 标题留空：艺人名显示在头像下方，与 mobile 一致
      CommonNavBar({ title: '', theme: this.theme, onBack: () => router.back() })
      if (this.loading) {
        this.Skeleton()
      } else if (this.error.length > 0 || this.artist === null) {
        Column({ space: 12 }) {
          EmptyView({
            message: this.error.length > 0 ? this.error : t('detail.retry_failed'),
            theme: this.theme,
          })
          CommonButton({
            label: t('detail.retry'),
            theme: this.theme,
            onButtonClick: () => this.load(),
          })
        }
        .padding(16)
        .layoutWeight(1)
      } else {
        this.Content()
      }
      MiniPlayer()
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
  }

  @Builder
  Content() {
    List() {
      ListItem() {
        Column() {
          DetailHero({
            coverPath: this.artist!.avatar ?? null,
            heroSize: 150,
            circle: true,
            title: this.artist!.name,
            subtitle: '',
            progress: 0,
            theme: this.theme,
          })
        }
        .width('100%')
        .padding(20)
      }

      if (this.albums.length > 0) {
        ListItem() {
          this.AlbumSection(t('artistPage.allAlbums', this.countParams(this.albums.length)), this.albums)
        }
      }

      if (this.collaborativeAlbums.length > 0) {
        ListItem() {
          this.AlbumSection(
            t('artistPage.collaborativeAlbums', this.countParams(this.collaborativeAlbums.length)),
            this.collaborativeAlbums,
          )
        }
      }

      if (this.collections.length > 0) {
        ListItem() {
          this.CollectionSection()
        }
      }

      if (this.mvs.length > 0) {
        ListItem() {
          this.MvSection()
        }
      }

      if (!this.isAudiobook()) {
        ListItem() {
          SectionHeader({
            title: t('artistPage.allTracks', this.countParams(this.tracks.length)),
            showAction: true,
            theme: this.theme,
            onActionClick: () => this.playFrom(0),
          })
        }
        ForEach(this.tracks, (tr: TrackDto, idx: number) => {
          ListItem() {
            TrackRow({
              index: idx,
              name: tr.name,
              source: tr.source ?? '',
              duration: tr.duration ?? 0,
              coverPath: tr.cover ?? null,
              isCurrent: tr.id === this.currentTrackId,
              listenedPercent: 0,
              theme: this.theme,
              onRowClick: () => this.playFrom(idx),
            })
          }
          .padding({ left: 20, right: 20 })
        }, (tr: TrackDto) => tr.id)
      }
    }
    .layoutWeight(1)
    .width('100%')
    .padding({ bottom: 40 })
    .scrollBar(BarState.Off)
    .edgeEffect(EdgeEffect.Spring)
  }

  @Builder
  AlbumSection(title: string, items: AlbumDto[]) {
    Column() {
      SectionHeader({ title: title, showAction: false, theme: this.theme })
      Scroll() {
        Row() {
          ForEach(items, (a: AlbumDto) => {
            AlbumCarouselCard({
              coverPath: a.cover ?? null,
              name: a.name,
              progress: this.isAudiobook() ? (a.progress ?? 0) : 0,
              theme: this.theme,
              onCardClick: () => router.pushUrl({
                url: 'pages/AlbumDetailPage',
                params: { id: a.id },
              }),
            })
          }, (a: AlbumDto) => a.id)
        }
        .padding({ left: 20, right: 20 })
      }
      .scrollBar(BarState.Off)
      .scrollable(ScrollDirection.Horizontal)
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .margin({ bottom: 20 })
  }

  @Builder
  CollectionSection() {
    Column() {
      SectionHeader({
        title: t('artistPage.relatedCollections', this.countParams(this.collections.length)),
        showAction: false,
        theme: this.theme,
      })
      Scroll() {
        Row() {
          ForEach(this.collections, (col: CollectionDto) => {
            AlbumCarouselCard({
              coverPath: this.collectionCover(col),
              name: col.name,
              progress: 0,
              theme: this.theme,
              onCardClick: () => router.pushUrl({
                url: 'pages/CollectionDetailPage',
                params: { id: col.id },
              }),
            })
          }, (col: CollectionDto) => col.id)
        }
        .padding({ left: 20, right: 20 })
      }
      .scrollBar(BarState.Off)
      .scrollable(ScrollDirection.Horizontal)
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .margin({ bottom: 20 })
  }

  @Builder
  MvSection() {
    Column() {
      SectionHeader({ title: `MV (${this.mvs.length})`, showAction: false, theme: this.theme })
      Scroll() {
        Row() {
          ForEach(this.mvs, (mv: MVDto) => {
            AlbumCarouselCard({
              coverPath: mv.cover ?? null,
              name: mv.name,
              progress: 0,
              theme: this.theme,
              onCardClick: () => router.pushUrl({
                url: 'pages/MVDetailPage',
                params: { id: mv.id },
              }),
            })
          }, (mv: MVDto) => mv.id)
        }
        .padding({ left: 20, right: 20 })
      }
      .scrollBar(BarState.Off)
      .scrollable(ScrollDirection.Horizontal)
    }
    .width('100%')
    .alignItems(HorizontalAlign.Start)
    .margin({ bottom: 20 })
  }

  @Builder
  Skeleton() {
    Column({ space: 12 }) {
      SkeletonBlock({ blockWidth: 150, blockHeight: 150, radius: 75, theme: this.theme })
      SkeletonBlock({ blockWidth: 170, blockHeight: 28, radius: 10, theme: this.theme })
      Row({ space: 15 }) {
        ForEach(SKELETON_CARDS, (i: number) => {
          SkeletonBlock({ blockWidth: 120, blockHeight: 120, radius: 10, theme: this.theme })
        }, (i: number) => String(i))
      }
      .margin({ top: 8, bottom: 8 })

      ForEach(SKELETON_ROWS, (i: number) => {
        SkeletonBlock({ blockWidth: '100%', blockHeight: 20, radius: 8, theme: this.theme })
      }, (i: number) => String(i))
    }
    .width('100%')
    .layoutWeight(1)
    .alignItems(HorizontalAlign.Center)
    .padding(20)
  }

  private isAudiobook(): boolean {
    return this.artist !== null && this.artist.type === 'AUDIOBOOK';
  }

  private countParams(n: number): Record<string, string | number> {
    const p: Record<string, string | number> = {};
    p['count'] = n;
    return p;
  }

  private collectionCover(col: CollectionDto): string | null {
    if (col.cover) return col.cover;
    const items = col.items ?? [];
    for (const it of items) {
      const alb = it.album;
      if (alb !== undefined && alb.cover) return alb.cover;
    }
    return null;
  }

  private async playFrom(index: number): Promise<void> {
    if (this.tracks.length === 0) return;
    try {
      const list: Track[] = [];
      for (const x of this.tracks) list.push(await resolveTrackToPlayer(x, false));
      await playerStore.playTrackList(list, index);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('ArtistDetail', `play failed: ${String(e)}`);
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const artist = await artistApi.getById(this.entityId);
      this.artist = artist;
      // /album/artist/:artist 与 /track/artist 用的是艺人名字；Emby 源例外，用 id
      const key = authStore.state_.sourceType === 'emby' ? this.entityId : artist.name;
      if (key.length > 0) {
        const albumsP = albumApi.byArtist(key).catch((): AlbumDto[] => []);
        const collabP = albumApi.collaborativeByArtist(key).catch((): AlbumDto[] => []);
        const tracksP = trackApi.byArtist(key).catch((): TrackDto[] => []);
        this.albums = await albumsP;
        this.collaborativeAlbums = await collabP;
        this.tracks = await tracksP;
        this.loadMvs(key);
        await this.loadCollections(artist);
      }
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  private loadMvs(key: string): void {
    mvApi.byArtist(key)
      .then((res: MVDto[]) => {
        if (res && res.length > 0) this.mvs = res;
      })
      .catch((e: Object) => {
        Logger.w('ArtistDetail', `mv load failed: ${String(e)}`);
      });
  }

  /**
   * 相关合集：取用户全部合集，留下「含有该艺人任一专辑」的。
   * 注意 GET /collections 的 items 只带前 4 条（后端 take: 4），mobile 也是同样的限制。
   */
  private async loadCollections(artist: ArtistDto): Promise<void> {
    if (artist.type !== 'AUDIOBOOK') {
      this.collections = [];
      return;
    }
    const user = authStore.state_.user;
    if (user === null) {
      this.collections = [];
      return;
    }
    try {
      const all = await collectionApi.list(user.id);
      const albumIds: string[] = [];
      for (const a of this.albums) albumIds.push(String(a.id));
      for (const a of this.collaborativeAlbums) albumIds.push(String(a.id));
      const matched: CollectionDto[] = [];
      for (const col of all) {
        const items: CollectionAlbumItem[] = col.items ?? [];
        let hit = false;
        for (const it of items) {
          const alb = it.album;
          if (alb !== undefined && albumIds.indexOf(String(alb.id)) >= 0) {
            hit = true;
            break;
          }
        }
        if (hit) matched.push(col);
      }
      this.collections = matched;
    } catch (e) {
      Logger.w('ArtistDetail', `collections load failed: ${String(e)}`);
      this.collections = [];
    }
  }
}
