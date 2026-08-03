import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { Logger } from 'audiodock_common';
import { albumApi, artistApi, trackApi, collectionApi, mvApi, miApi, playlistApi } from 'features_network';
import type { AlbumDto, ArtistDto, TrackDto, MVDto, CollectionDto, CollectionAlbumItem, MiDevice, MiTrackPayload } from 'features_network';
import { DetailHero } from '../components/DetailHero';
import { SectionHeader } from '../components/SectionHeader';
import { AlbumCarouselCard } from '../components/AlbumCarouselCard';
import { TrackRow } from '../components/TrackRow';
import { AppIcon } from '../components/AppIcon';
import { XiaoAiIcon } from '../components/XiaoAiIcon';
import { GlobalBottomBar } from '../components/GlobalBottomBar';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { getInternalQuality } from '../services/trackQuality';
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
  @State isPlaying: boolean = false;
  @State isSelectionMode: boolean = false;
  @State selectedTrackIds: string[] = [];
  @State showMoreSheet: boolean = false;
  @State showMiCast: boolean = false;
  @State miDevices: MiDevice[] = [];
  @State miLoggedIn: boolean = false;
  @State miQRCodeUrl: string = '';
  @State miLoading: boolean = false;
  @State miCasting: boolean = false;
  private miPollingId: number = -1;
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
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
      this.isPlaying = v.isPlaying;
    });
  }

  aboutToDisappear(): void {
    this.unsubPlayer();
  }

  onPageShow(): void {
    // 语言可能在后台（语言页/系统设置）被修改：回显时若语言已变化，切换 if 分支重建整页。
    // 不能在隐藏时重建——@StorageProp 在后台更新触发的重建会导致路由页触摸失效，
    // 因此用 langAtBuild 把重建延迟到页面可见时。
    const cur = getLang();
    if (cur !== this.langAtBuild) this.langAtBuild = cur;
  }

  build() {
    // 语言切换时重建整页：条件读取 langAtBuild 建立依赖（框架只追踪读取状态变量的表达式，
    // t() 是普通函数无法被追踪），语言变化使 if 分支切换，旧子树销毁、新子树重建，
    // 所有 t() 文案（含局部 @Builder 和 @Prop 传串的子组件）都按新语言重新求值。
    if (this.langAtBuild === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }

  @Builder
  LocalizedContent() {
    Column() {
      if (this.isSelectionMode) {
        Row() {
          AppIcon({ name: 'chevron-down', iconSize: 22, color: this.theme.colors.text })
            .onClick(() => this.exitSelectionMode())
          Text(t('artistPage.selectedCount', [['count', this.selectedTrackIds.length]]))
            .fontSize(17).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
            .layoutWeight(1).margin({ left: 12 })
          AppIcon({ name: 'plus', iconSize: 22, color: this.selectedTrackIds.length > 0 ? this.theme.colors.text : this.theme.colors.textSecondary })
            .margin({ right: 16 })
            .onClick(() => {
              if (this.selectedTrackIds.length > 0) promptAction.showToast({ message: '该功能暂未在鸿蒙端开放' });
            })
        }
        .width('100%').height(56).padding({ left: 16, right: 16 })
        .alignItems(VerticalAlign.Center)
      } else {
        // 标题留空：艺人名显示在头像下方，与 mobile 一致
        CommonNavBar({ title: '', theme: this.theme, onBack: () => router.back() })
      }
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
      GlobalBottomBar()
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.theme.colors.background)
    .bindSheet($$this.showMoreSheet, this.moreSheet(), { height: 380, dragBar: true })
    .bindSheet($$this.showMiCast, this.miCastSheet(), { height: 420, dragBar: true })
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
          Column() {
            SectionHeader({
              title: t('artistPage.allTracks', this.countParams(this.tracks.length)),
              showAction: true,
              theme: this.theme,
              onActionClick: () => this.playFrom(0),
            })
            Row({ space: 10 }) {
              if (!this.isSelectionMode) {
                Column() {
                  XiaoAiIcon({ iconSize: 20, color: this.theme.colors.textSecondary })
                }
                .width(36).height(36).borderRadius(18)
                .backgroundColor(this.theme.colors.surfaceAlt)
                .justifyContent(FlexAlign.Center)
                .onClick(() => this.handleOpenMiCast())
              }
              Column() {
                AppIcon({ name: 'list', iconSize: 20, color: this.theme.colors.textSecondary })
              }
              .width(36).height(36).borderRadius(18)
              .backgroundColor(this.theme.colors.surfaceAlt)
              .justifyContent(FlexAlign.Center)
              .onClick(() => {
                if (!this.isSelectionMode) {
                  this.isSelectionMode = true;
                  this.selectedTrackIds = [];
                } else {
                  this.toggleSelectAll();
                }
              })
              Column() {
                Text('···').fontSize(16).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.textSecondary)
              }
              .width(36).height(36).borderRadius(18)
              .backgroundColor(this.theme.colors.surfaceAlt)
              .justifyContent(FlexAlign.Center)
              .onClick(() => { this.showMoreSheet = true; })
            }
            .width('100%').justifyContent(FlexAlign.End)
            .padding({ left: 20, right: 20, bottom: 8 })
          }
          .width('100%')
        }
        ForEach(this.tracks, (tr: TrackDto, idx: number) => {
          ListItem() {
            Row() {
              if (this.isSelectionMode) {
                Column() {
                  Text(this.selectedTrackIds.indexOf(tr.id) >= 0 ? '☑' : '☐')
                    .fontSize(20)
                    .fontColor(this.selectedTrackIds.indexOf(tr.id) >= 0 ? this.theme.colors.primary : this.theme.colors.textSecondary)
                }
                .width(32).justifyContent(FlexAlign.Center)
              }
              TrackRow({
                index: idx,
                name: tr.name,
                source: tr.source ?? '',
                duration: tr.duration ?? 0,
                coverPath: tr.cover ?? null,
                isCurrent: tr.id === this.currentTrackId,
                isPlaying: this.isPlaying,
                listenedPercent: 0,
                theme: this.theme,
                onRowClick: () => {
                  if (this.isSelectionMode) this.toggleTrackSelection(tr.id);
                  else this.playFrom(idx);
                },
              })
            }
            .width('100%')
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

  private countParams(n: number): Array<[string, string | number]> {
    return [['count', n]];
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

  // ─── 多选模式 ───
  private toggleTrackSelection(id: string): void {
    const idx = this.selectedTrackIds.indexOf(id);
    if (idx >= 0) {
      this.selectedTrackIds = this.selectedTrackIds.filter((x: string) => x !== id);
    } else {
      this.selectedTrackIds = [...this.selectedTrackIds, id];
    }
  }

  private toggleSelectAll(): void {
    if (this.selectedTrackIds.length === this.tracks.length) {
      this.selectedTrackIds = [];
    } else {
      this.selectedTrackIds = this.tracks.map((tr: TrackDto) => tr.id);
    }
  }

  private exitSelectionMode(): void {
    this.isSelectionMode = false;
    this.selectedTrackIds = [];
  }

  // ─── 小爱音箱投送 ───
  private stopMiPolling(): void {
    if (this.miPollingId !== -1) { clearInterval(this.miPollingId); this.miPollingId = -1; }
  }

  private startMiQRPolling(lpUrl: string): void {
    this.stopMiPolling();
    this.miPollingId = setInterval(async () => {
      try {
        const res = await miApi.getQRCodeStatus(lpUrl);
        if (res.status === 'success') {
          this.stopMiPolling();
          this.miLoggedIn = true;
          const devRes = await miApi.getDevices();
          this.miDevices = devRes.devices || [];
        } else if (res.status === 'expired' || res.status === 'error') {
          this.stopMiPolling();
        }
      } catch (e) { /* silent */ }
    }, 2000);
  }

  private async handleOpenMiCast(): Promise<void> {
    this.showMiCast = true;
    this.miLoading = true;
    try {
      const auth = await miApi.getAuthStatus();
      this.miLoggedIn = auth.logged_in;
      if (auth.logged_in) {
        const res = await miApi.getDevices();
        this.miDevices = res.devices || [];
      } else {
        const qr = await miApi.getQRCode();
        if (qr.already_logged_in) {
          this.miLoggedIn = true;
          const res = await miApi.getDevices();
          this.miDevices = res.devices || [];
        } else if (qr.qrcode_url) {
          this.miQRCodeUrl = qr.qrcode_url;
          if (qr.status_url) this.startMiQRPolling(qr.status_url);
        }
      }
    } catch (e) {
      Logger.w('ArtistDetail', `loadMiDevices failed: ${String(e)}`);
      promptAction.showToast({ message: t('player.loadMiDevicesFailed') });
    } finally {
      this.miLoading = false;
    }
  }

  private handleCloseMiCast(): void {
    this.showMiCast = false;
    this.stopMiPolling();
  }

  private async handleCastPlaylistToMi(deviceId: string, deviceName: string): Promise<void> {
    if (this.tracks.length === 0) {
      promptAction.showToast({ message: t('player.miCastNoTrack') });
      return;
    }
    this.miCasting = true;
    try {
      const quality = await getInternalQuality();
      const payloads: MiTrackPayload[] = this.tracks.map((tr: TrackDto) => {
        const p: MiTrackPayload = {
          url: trackApi.streamUrl(tr.id, quality),
          title: `${tr.name} - ${tr.artist ?? ''}`,
          duration: tr.duration ?? 0,
        };
        return p;
      });
      await miApi.playPlaylist(deviceId, payloads, 0);
      promptAction.showToast({ message: t('player.miCastPlaylistSuccess', [['device', deviceName], ['count', payloads.length]]) });
      this.handleCloseMiCast();
    } catch (e) {
      Logger.w('ArtistDetail', `cast playlist to Mi failed: ${String(e)}`);
      promptAction.showToast({ message: t('player.miCastPlaylistFailed') });
    } finally {
      this.miCasting = false;
    }
  }

  // ─── 更多操作 ───
  @Builder
  moreSheet() {
    Column() {
      Text(t('artistMore.title'))
        .fontSize(16).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 4 });
      Text(this.artist?.name ?? '')
        .fontSize(13).fontColor(this.theme.colors.textSecondary)
        .margin({ bottom: 16 });

      this.MoreOptionRow(t('albumMore.addToPlaylist'), () => {
        this.showMoreSheet = false;
        promptAction.showToast({ message: '该功能暂未在鸿蒙端开放' });
      })
      this.MoreOptionRow(t('albumMore.selectTracks'), () => {
        this.showMoreSheet = false;
        this.isSelectionMode = true;
        this.selectedTrackIds = [];
      })
      this.MoreOptionRow(t('albumMore.batchDownload'), () => {
        this.showMoreSheet = false;
        promptAction.showToast({ message: '该功能暂未在鸿蒙端开放' });
      })
    }
    .width('100%').padding(20).alignItems(HorizontalAlign.Start)
  }

  @Builder
  MoreOptionRow(label: string, action: () => void) {
    Row({ space: 12 }) {
      Text(label).fontSize(15).fontColor(this.theme.colors.text).layoutWeight(1)
      Text('›').fontSize(18).fontColor(this.theme.colors.textSecondary)
    }
    .width('100%').padding({ top: 14, bottom: 14 })
    .onClick(action)
  }

  @Builder
  miCastSheet() {
    Column() {
      Text(t('player.miSpeakerTitle'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });

      if (this.miLoading) {
        Column({ space: 12 }) {
          LoadingProgress().width(32).height(32).color(this.theme.colors.primary);
          Text(t('common.loading')).fontSize(14).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (this.miLoggedIn) {
        if (this.miDevices.length === 0) {
          Column({ space: 12 }) {
            XiaoAiIcon({ iconSize: 40, color: this.theme.colors.textSecondary });
            Text(t('player.noMiDevices')).fontSize(14).fontColor(this.theme.colors.textSecondary);
          }
          .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          List() {
            ForEach(this.miDevices, (device: MiDevice) => {
              ListItem() {
                Row({ space: 12 }) {
                  Column() { XiaoAiIcon({ iconSize: 20, color: '#FFFFFFFF' }); }
                  .width(36).height(36).borderRadius(18)
                  .backgroundColor(this.theme.colors.primary)
                  .justifyContent(FlexAlign.Center);
                  Column({ space: 2 }) {
                    Text(device.name).fontSize(15).fontWeight(FontWeight.Medium)
                      .fontColor(this.theme.colors.text).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
                    if ((device.model ?? '').length > 0) {
                      Text(device.model ?? '').fontSize(12).fontColor(this.theme.colors.textSecondary)
                        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
                    }
                  }
                  .layoutWeight(1).alignItems(HorizontalAlign.Start);
                  Text('›').fontSize(20).fontColor(this.theme.colors.textSecondary);
                }
                .width('100%').padding({ top: 12, bottom: 12, left: 16, right: 16 })
                .opacity(this.miCasting ? 0.5 : 1)
                .onClick(() => {
                  if (!this.miCasting) this.handleCastPlaylistToMi(device.device_id, device.name);
                });
              }
            }, (device: MiDevice) => device.device_id);
          }
          .layoutWeight(1).scrollBar(BarState.Off);
        }
      } else if (this.miQRCodeUrl !== '') {
        Column({ space: 8 }) {
          Text(t('player.miLoginRequired')).fontSize(14).fontColor(this.theme.colors.textSecondary);
          Image(this.miQRCodeUrl).width(180).height(180).borderRadius(8)
            .backgroundColor('#FFFFFFFF').objectFit(ImageFit.Contain);
          Text(t('player.miScanQRCode')).fontSize(12).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      } else {
        Column({ space: 12 }) {
          XiaoAiIcon({ iconSize: 40, color: this.theme.colors.textSecondary });
          Text(t('player.miLoginRequired')).fontSize(14).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      }
    }
    .width('100%').height('100%').padding(20)
  }
}
