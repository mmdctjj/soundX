import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { albumApi, mvApi } from 'features_network';
import type { AlbumDto, TrackDto, MVDto, AlbumTracksResp } from 'features_network';
import { DetailHero } from '../components/DetailHero';
import { TrackRow } from '../components/TrackRow';
import { AppIcon } from '../components/AppIcon';
import { MiniPlayer } from '../components/MiniPlayer';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { likesHistory, EventPayloadId } from '../services/LikesHistoryService';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';

/** 与 mobile 的 PAGE_SIZE 保持一致：一次拉全，不做分页。 */
const PAGE_SIZE: number = 20000;

const SKELETON_ROWS: number[] = [0, 1, 2, 3, 4, 5, 6, 7];

@Entry
@Component
struct AlbumDetailPage {
  @State album: AlbumDto | null = null;
  @State tracks: TrackDto[] = [];
  @State mvs: MVDto[] = [];
  @State activeTab: string = 'tracks';
  @State loading: boolean = true;
  @State error: string = '';
  @State liked: boolean = false;
  @State currentTrackId: string = '';
  @State currentMs: number = 0;
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');
  private unsubLike: () => void = () => {};
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
    this.unsubLike = likesHistory.on('albumLike', (e) => {
      const ev = e as EventPayloadId;
      if (ev.id === this.entityId) this.liked = ev.liked;
    });
    likesHistory.isAlbumLiked(this.entityId).then((v: boolean) => this.liked = v).catch(() => undefined);
    this.unsubPlayer = playerStore.subscribe(() => {
      const v = playerStore.view();
      const cur = v.queue[v.currentIndex];
      this.currentTrackId = cur ? cur.id : '';
      this.currentMs = v.currentMs;
    });
  }

  aboutToDisappear(): void {
    this.unsubLike();
    this.unsubPlayer();
  }

  build() {
    Column() {
      CommonNavBar({
        title: this.album?.name ?? '',
        theme: this.theme,
        onBack: () => router.back(),
      })
      if (this.loading) {
        this.Skeleton()
      } else if (this.error.length > 0 || this.album === null) {
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
            coverPath: this.album!.cover ?? null,
            heroSize: 200,
            circle: false,
            title: this.album!.name,
            subtitle: this.album!.artist ?? '',
            progress: this.isAudiobook() ? (this.album!.progress ?? 0) : 0,
            theme: this.theme,
          })
          this.ActionRow()
          if (this.mvs.length > 0) {
            this.TabBar()
          }
        }
        .width('100%')
        .alignItems(HorizontalAlign.Center)
        .padding({ top: 20, bottom: 20 })
      }

      if (this.activeTab === 'mvs') {
        ForEach(this.mvs, (mv: MVDto, idx: number) => {
          ListItem() {
            TrackRow({
              index: idx,
              name: mv.name,
              source: '',
              duration: mv.duration ?? 0,
              coverPath: mv.cover ?? null,
              isCurrent: false,
              listenedPercent: 0,
              theme: this.theme,
              onRowClick: () => router.pushUrl({ url: 'pages/MVDetailPage', params: { id: mv.id } }),
            })
          }
        }, (mv: MVDto) => mv.id)
      } else {
        ForEach(this.tracks, (tr: TrackDto, idx: number) => {
          ListItem() {
            TrackRow({
              index: idx,
              name: tr.name,
              source: tr.source ?? '',
              duration: tr.duration ?? 0,
              coverPath: tr.cover ?? null,
              isCurrent: tr.id === this.currentTrackId,
              listenedPercent: this.listenedPercent(tr),
              theme: this.theme,
              onRowClick: () => this.playFrom(idx, 0),
            })
          }
        }, (tr: TrackDto) => tr.id)
      }
    }
    .layoutWeight(1)
    .width('100%')
    .padding({ left: 20, right: 20, bottom: 40 })
    .scrollBar(BarState.Off)
    .edgeEffect(EdgeEffect.Spring)
  }

  @Builder
  ActionRow() {
    Row({ space: 10 }) {
      Row({ space: 8 }) {
        AppIcon({ name: 'play', iconSize: 20, color: this.theme.colors.onPrimary })
        Text(this.playLabel())
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.onPrimary)
      }
      .padding({ left: 25, right: 25, top: 10, bottom: 10 })
      .borderRadius(25)
      .backgroundColor(this.theme.colors.primary)
      .onClick(() => this.playAll())

      Column() {
        AppIcon({
          name: 'heart',
          iconSize: 24,
          color: this.liked ? this.theme.colors.primary : this.theme.colors.textSecondary,
        })
      }
      .width(44)
      .height(44)
      .borderRadius(22)
      .backgroundColor(this.theme.colors.surfaceAlt)
      .justifyContent(FlexAlign.Center)
      .onClick(() => this.toggleLike())
    }
    .margin({ top: 20 })
    .justifyContent(FlexAlign.Center)
  }

  @Builder
  TabBar() {
    Row() {
      Column() {
        Text(`${t('nav.tracks')} (${this.tracks.length})`)
          .fontSize(15)
          .fontWeight(this.activeTab === 'tracks' ? FontWeight.Bold : FontWeight.Normal)
          .fontColor(this.activeTab === 'tracks' ? this.theme.colors.primary : this.theme.colors.textSecondary)
      }
      .layoutWeight(1)
      .padding({ top: 10, bottom: 10 })
      .border({
        width: { bottom: this.activeTab === 'tracks' ? 2 : 0 },
        color: this.theme.colors.primary,
      })
      .onClick(() => this.activeTab = 'tracks')

      Column() {
        Text(`MV (${this.mvs.length})`)
          .fontSize(15)
          .fontWeight(this.activeTab === 'mvs' ? FontWeight.Bold : FontWeight.Normal)
          .fontColor(this.activeTab === 'mvs' ? this.theme.colors.primary : this.theme.colors.textSecondary)
      }
      .layoutWeight(1)
      .padding({ top: 10, bottom: 10 })
      .border({
        width: { bottom: this.activeTab === 'mvs' ? 2 : 0 },
        color: this.theme.colors.primary,
      })
      .onClick(() => this.activeTab = 'mvs')
    }
    .width('100%')
    .margin({ top: 20 })
    .borderWidth({ bottom: 1 })
    .borderColor(this.theme.colors.border)
  }

  @Builder
  Skeleton() {
    Column({ space: 12 }) {
      SkeletonBlock({ blockWidth: 200, blockHeight: 200, radius: 10, theme: this.theme })
      SkeletonBlock({ blockWidth: 180, blockHeight: 28, radius: 10, theme: this.theme })
      SkeletonBlock({ blockWidth: 120, blockHeight: 20, radius: 10, theme: this.theme })
      Row({ space: 10 }) {
        SkeletonBlock({ blockWidth: 150, blockHeight: 44, radius: 22, theme: this.theme })
        SkeletonBlock({ blockWidth: 44, blockHeight: 44, radius: 22, theme: this.theme })
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
    return this.album !== null && this.album.type === 'AUDIOBOOK';
  }

  private playLabel(): string {
    const resumeId = this.album !== null ? this.album.resumeTrackId : undefined;
    if (resumeId && this.indexOfTrack(resumeId) >= 0) return t('albumPage.continuePlaying');
    return t('albumPage.playAll');
  }

  private indexOfTrack(id: string): number {
    for (let i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].id === id) return i;
    }
    return -1;
  }

  /**
   * mobile 的 "已听 x%" 依赖 track.progress / listenedAsAudiobookByUsers，
   * 但 /album/:id/tracks 从不返回这两个字段，所以实际只有当前播放的那一首会显示。
   * 这里按同样的口径实现。
   */
  private listenedPercent(tr: TrackDto): number {
    if (!this.isAudiobook()) return 0;
    if (tr.id !== this.currentTrackId) return 0;
    const durMs = (tr.duration ?? 0) * 1000;
    if (durMs <= 0) return 0;
    return Math.floor(this.currentMs / durMs * 100);
  }

  private toggleLike(): void {
    if (this.liked) likesHistory.unlikeAlbum(this.entityId);
    else likesHistory.likeAlbum(this.entityId);
  }

  private async playAll(): Promise<void> {
    let startIndex = 0;
    let startMs = 0;
    const resumeId = this.album !== null ? this.album.resumeTrackId : undefined;
    if (resumeId) {
      const found = this.indexOfTrack(resumeId);
      if (found >= 0) {
        startIndex = found;
        startMs = (this.album!.resumeProgress ?? 0) * 1000;
      }
    }
    await this.playFrom(startIndex, startMs);
  }

  private async playFrom(index: number, startMs: number): Promise<void> {
    if (this.tracks.length === 0) return;
    try {
      const list: Track[] = [];
      for (const x of this.tracks) list.push(await resolveTrackToPlayer(x, false));
      await playerStore.playTrackList(list, index);
      if (startMs > 0) await playerStore.seek(startMs);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('AlbumDetail', `play failed: ${String(e)}`);
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const albumP: Promise<AlbumDto> = albumApi.getById(this.entityId);
      const tracksP: Promise<AlbumTracksResp> = albumApi.getTracks(this.entityId, PAGE_SIZE, 0, 'asc');
      const album = await albumP;
      const tracksResp = await tracksP;
      this.album = album;
      this.tracks = tracksResp.list;
      this.loadMvs(album);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }

  private loadMvs(album: AlbumDto): void {
    if (album.name.length === 0) return;
    mvApi.byAlbum(album.name, album.artist ?? '')
      .then((res: MVDto[]) => {
        if (res && res.length > 0) this.mvs = res;
      })
      .catch((e: Object) => {
        Logger.w('AlbumDetail', `mv load failed: ${String(e)}`);
      });
  }
}
