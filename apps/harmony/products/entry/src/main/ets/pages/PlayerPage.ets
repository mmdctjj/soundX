import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { formatDuration, Logger } from 'audiodock_common';
import { trackApi, playlistApi, artistApi, albumApi, miApi } from 'features_network';
import type { PlaylistDto, ArtistDto, AlbumDto, MiDevice } from 'features_network';
import { kvStore } from 'features_storage';
import type { LyricLine } from 'features_player';
import { playerStore } from '../context/PlayerStore';
import type { PlayerStateView, Track } from '../context/PlayerStore';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { getInternalQuality } from '../services/trackQuality';
import { likesHistory } from '../services/LikesHistoryService';
import type { EventPayload, EventPayloadId } from '../services/LikesHistoryService';
import { CoverImage } from '../components/CoverImage';
import { AppIcon } from '../components/AppIcon';
import type { AppIconName } from '../components/AppIcon';
import { XiaoAiIcon } from '../components/XiaoAiIcon';

class MoreOption {
  key: string = '';
  label: string = '';

  constructor(key: string, label: string) {
    this.key = key;
    this.label = label;
  }
}

/**
 * 播放器详情页，布局与行为对齐 mobile 的 PlayerDetailView（竖屏）：
 * 顶部左侧返回（chevron-down）、右侧更多按钮（⋮，打开选项半模态）；中部封面 200×200（点按切换歌词）/ 歌词列表
 * （高亮当前行并自动滚动居中，点按切回封面）；底部信息行（曲名+艺人+喜欢）、
 * 进度条（松手 seek）、控制行（播放模式 / 上一首 / 播放暂停 / 下一首 / 播放列表）。
 * 播放列表用半模态展示，点击行跳转播放。
 */
@Entry
@Component
struct PlayerPage {
  @State private view: PlayerStateView = playerStore.view();
  @State private showLyrics: boolean = false;
  @State private showPlaylist: boolean = false;
  @State private showMore: boolean = false;
  @State private liked: boolean = false;
  @State private showSleepTimer: boolean = false;
  @State private showAddToPlaylist: boolean = false;
  @State private showLyricsSize: boolean = false;
  @State private showControlPos: boolean = false;
  @State private sleepTimerRemaining: number = 0;
  @State private lyricFontSize: number = 16;
  @State private controlBottomOffset: number = 0;
  @State private playlists: PlaylistDto[] = [];
  // 小爱音箱投放相关状态（对齐 mobile player.tsx 的 mi* 状态）
  @State private showMiCast: boolean = false;
  @State private miDevices: MiDevice[] = [];
  @State private miLoggedIn: boolean = false;
  @State private miQRCodeUrl: string = '';
  @State private miLoading: boolean = false;
  @State private miCasting: boolean = false;
  private miPollingId: number = -1;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');
  private lyricScroller: Scroller = new Scroller();
  private lastTrackId: string = '';
  private lastLyricIndex: number = -1;
  private unsub: () => void = () => {};
  private unsubLike: () => void = () => {};
  private sleepTimerId: number = -1;

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    this.unsub = playerStore.subscribe(() => {
      this.view = playerStore.view();
      const cur = this.current();
      const curId = cur ? cur.id : '';
      if (curId !== this.lastTrackId) {
        this.lastTrackId = curId;
        this.refreshLike();
      }
      if (this.showLyrics && this.view.activeLyricIndex !== this.lastLyricIndex) {
        this.lastLyricIndex = this.view.activeLyricIndex;
        if (this.lastLyricIndex >= 0) {
          this.lyricScroller.scrollToIndex(this.lastLyricIndex, true, ScrollAlign.CENTER);
        }
      }
    });
    this.unsubLike = likesHistory.on('trackLike', (p: EventPayload) => {
      const payload = p as EventPayloadId;
      const cur = this.current();
      if (cur && payload.id === cur.id) this.liked = payload.liked;
    });
    const cur = this.current();
    this.lastTrackId = cur ? cur.id : '';
    this.refreshLike();
    const params = router.getParams() as Record<string, string> | undefined;
    const trackId = params?.['trackId'];
    if (trackId) this.loadSingle(trackId);
  }

  aboutToDisappear(): void {
    this.unsub();
    this.unsubLike();
    if (this.sleepTimerId !== -1) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = -1;
    }
    this.stopMiPolling();
  }

  private current(): Track | null {
    if (this.view.queue.length === 0) return null;
    return this.view.queue[this.view.currentIndex] ?? null;
  }

  private refreshLike(): void {
    const cur = this.current();
    if (!cur) { this.liked = false; return; }
    likesHistory.isTrackLiked(cur.id)
      .then((v: boolean) => { this.liked = v; })
      .catch(() => undefined);
  }

  private toggleLike(): void {
    const cur = this.current();
    if (!cur) return;
    if (this.liked) {
      likesHistory.unlikeTrack(cur.id).catch(() => undefined);
    } else {
      likesHistory.likeTrack(cur.id).catch(() => undefined);
    }
  }

  // ===== 小爱音箱投放（对齐 mobile player.tsx） =====
  private stopMiPolling(): void {
    if (this.miPollingId !== -1) {
      clearInterval(this.miPollingId);
      this.miPollingId = -1;
    }
  }

  private startMiQRPolling(lpUrl: string): void {
    this.stopMiPolling();
    this.miPollingId = setInterval(async () => {
      try {
        const status = await miApi.getQRCodeStatus(lpUrl);
        if (status.status === 'success') {
          this.stopMiPolling();
          this.miLoggedIn = true;
          this.miQRCodeUrl = '';
          promptAction.showToast({ message: t('player.miLoginSuccess') });
          const res = await miApi.getDevices();
          this.miDevices = res.devices || [];
        } else if (status.status === 'expired' || status.status === 'error') {
          this.stopMiPolling();
          this.miQRCodeUrl = '';
        }
      } catch (e) {
        // 静默失败，等待下次轮询
      }
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
      Logger.w('PlayerPage', `loadMiDevices failed: ${String(e)}`);
      promptAction.showToast({ message: t('player.loadMiDevicesFailed') });
    } finally {
      this.miLoading = false;
    }
  }

  private handleCloseMiCast(): void {
    this.showMiCast = false;
    this.stopMiPolling();
  }

  private async handleCastToMi(deviceId: string, deviceName: string): Promise<void> {
    const cur = this.current();
    if (!cur) {
      promptAction.showToast({ message: t('player.miCastNoTrack') });
      return;
    }
    this.miCasting = true;
    try {
      const quality = await getInternalQuality();
      const url = trackApi.streamUrl(cur.id, quality);
      const title = `${cur.title} - ${cur.artist ?? ''}`;
      await miApi.playByUrl(deviceId, url, title);
      if (this.view.isPlaying) {
        await playerStore.togglePlay();
      }
      promptAction.showToast({ message: t('player.miCastSuccess', [['device', deviceName]]) });
      this.handleCloseMiCast();
    } catch (e) {
      Logger.w('PlayerPage', `cast to Mi failed: ${String(e)}`);
      promptAction.showToast({ message: t('player.miCastFailed') });
    } finally {
      this.miCasting = false;
    }
  }

  private playModeIcon(): AppIconName {
    switch (this.view.playMode) {
      case 'SHUFFLE': return 'shuffle';
      case 'LOOP_LIST': return 'repeat';
      case 'LOOP_SINGLE': return 'repeat-once';
      default: return 'playlist';
    }
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
      this.header();
      if (this.view.queue.length === 0) {
        Text(t('player.empty'))
          .fontColor(this.theme.colors.textSecondary)
          .margin({ top: 80 });
      } else {
        this.content();
      }

      // ArkUI 每个组件只能绑定一个 bindSheet，用不可见锚点分散绑定
      Column().width(0).height(0)
        .bindSheet($$this.showPlaylist, this.playlistSheet(), {
          height: '60%',
          dragBar: true,
          backgroundColor: this.theme.colors.background,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showMore, this.moreSheet(), {
          height: '55%',
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showSleepTimer, this.sleepTimerSheet(), {
          height: 360,
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showAddToPlaylist, this.addToPlaylistSheet(), {
          height: '50%',
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showLyricsSize, this.lyricsSizeSheet(), {
          height: 280,
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showControlPos, this.controlPosSheet(), {
          height: 260,
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
      Column().width(0).height(0)
        .bindSheet($$this.showMiCast, this.miCastSheet(), {
          height: 420,
          dragBar: true,
          backgroundColor: this.theme.colors.surface,
        })
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background);
  }

  @Builder header() {
    Row() {
      AppIcon({ name: 'chevron-down', iconSize: 26, color: this.theme.colors.text })
        .width(44).height(44)
        .onClick(() => router.back());
      Row().layoutWeight(1);
      Text('⋮')
        .fontSize(22)
        .fontColor(this.theme.colors.text)
        .width(44).height(44)
        .textAlign(TextAlign.Center)
        .onClick(() => { this.showMore = true; });
    }
    .width('100%').height(56)
    .padding({ left: 10, right: 10 });
  }

  @Builder content() {
    Column() {
      // 中部：封面 / 歌词，占满剩余空间
      Column() {
        if (this.showLyrics) {
          this.lyricsView();
        } else {
          CoverImage({
            path: this.current()?.coverUrl ?? null,
            imgWidth: 200,
            imgHeight: 200,
            radius: 20,
            fallbackText: (this.current()?.title ?? '?').substring(0, 1),
          })
            .onClick(() => { this.showLyrics = true; });
        }
      }
      .layoutWeight(1)
      .width('100%')
      .justifyContent(FlexAlign.Center);

      this.controls();
    }
    .width('100%')
    .layoutWeight(1)
    .padding({ left: 30, right: 30 });
  }

  @Builder lyricsView() {
    if (this.view.lyrics.length === 0) {
      Text(t('player.noLyrics'))
        .fontSize(16)
        .fontColor(this.theme.colors.textSecondary)
        .onClick(() => { this.showLyrics = false; });
    } else {
      List({ scroller: this.lyricScroller }) {
        ForEach(this.view.lyrics, (line: LyricLine, index: number) => {
          ListItem() {
            Text(line.text)
              .fontSize(index === this.view.activeLyricIndex ? 17 : 15)
              .fontWeight(index === this.view.activeLyricIndex ? FontWeight.Bold : FontWeight.Medium)
              .fontColor(index === this.view.activeLyricIndex
                ? this.theme.colors.primary
                : this.theme.colors.text)
              .opacity(index === this.view.activeLyricIndex ? 1 : 0.4)
              .textAlign(TextAlign.Center)
              .width('100%')
              .padding({ top: 10, bottom: 10, left: 20, right: 20 });
          }
        }, (line: LyricLine, index: number) => `${index}_${line.time}`);
      }
      .width('100%')
      .height('100%')
      .scrollBar(BarState.Off)
      .onClick(() => { this.showLyrics = false; });
    }
  }

  @Builder controls() {
    Column() {
      // 信息行：曲名 + 艺人 + 喜欢
      Row({ space: 16 }) {
        Column({ space: 5 }) {
          Text(this.current()?.title ?? '')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.theme.colors.text)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis });
          Text(this.current()?.artist ?? '')
            .fontSize(14)
            .fontColor(this.theme.colors.textSecondary)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis });
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start);

        AppIcon({
          name: this.liked ? 'heart-fill' : 'heart',
          iconSize: 24,
          color: this.liked ? this.theme.colors.primary : this.theme.colors.text,
        })
          .onClick(() => this.toggleLike());

        XiaoAiIcon({
          iconSize: 24,
          color: this.miLoggedIn ? this.theme.colors.primary : this.theme.colors.text,
        })
          .onClick(() => { this.handleOpenMiCast(); });
      }
      .width('100%')
      .alignItems(VerticalAlign.Top)
      .margin({ bottom: 20 });

      // 进度行
      Row({ space: 10 }) {
        Text(formatDuration(this.view.currentMs))
          .fontSize(12)
          .fontColor(this.theme.colors.textSecondary);
        Slider({
          value: this.view.currentMs,
          min: 0,
          max: Math.max(1, this.view.durationMs),
        })
          .layoutWeight(1)
          .trackColor(this.theme.colors.border)
          .selectedColor(this.theme.colors.primary)
          .blockColor(this.theme.colors.primary)
          .onChange((value: number, mode: SliderChangeMode) => {
            // 对齐 mobile：松手/点击才 seek，拖动中不打断播放
            if (mode === SliderChangeMode.End || mode === SliderChangeMode.Click) {
              playerStore.seek(value).catch(() => undefined);
            }
          });
        Text(formatDuration(this.view.durationMs))
          .fontSize(12)
          .fontColor(this.theme.colors.textSecondary);
      }
      .width('100%')
      .margin({ bottom: 20 });

      // 控制行：模式 | 上一首 播放 下一首 | 播放列表
      Row() {
        if (!this.view.radioMode) {
          AppIcon({ name: this.playModeIcon(), iconSize: 24, color: this.theme.colors.textSecondary })
            .onClick(() => playerStore.togglePlayMode());
        }

        Row({ space: 30 }) {
          AppIcon({ name: 'skip-back', iconSize: 32, color: this.theme.colors.text })
            .onClick(() => playerStore.playPrevious().catch(() => undefined));
          Stack() {
            AppIcon({
              name: this.view.isPlaying ? 'pause' : 'play',
              iconSize: 28,
              color: this.theme.colors.background,
            });
          }
          .width(50).height(50)
          .borderRadius(25)
          .backgroundColor(this.theme.colors.text)
          .onClick(() => playerStore.togglePlay().catch(() => undefined));
          AppIcon({ name: 'skip-forward', iconSize: 32, color: this.theme.colors.text })
            .onClick(() => playerStore.playNext().catch(() => undefined));
        }
        .alignItems(VerticalAlign.Center);

        if (!this.view.radioMode) {
          AppIcon({ name: 'list', iconSize: 24, color: this.theme.colors.textSecondary })
            .onClick(() => { this.showPlaylist = true; });
        }
      }
      .width('100%')
      .justifyContent(this.view.radioMode ? FlexAlign.Center : FlexAlign.SpaceBetween)
      .margin({ bottom: 30 });
    }
    .width('100%');
  }

  @Builder playlistSheet() {
    Column() {
      Text(t('player.playlistTitle'))
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 8 });
      List() {
        ForEach(this.view.queue, (track: Track, index: number) => {
          ListItem() {
            Row({ space: 10 }) {
              Text(index === this.view.currentIndex ? '▶' : `${index + 1}`)
                .fontSize(14)
                .fontColor(index === this.view.currentIndex
                  ? this.theme.colors.primary
                  : this.theme.colors.textSecondary)
                .width(30)
                .textAlign(TextAlign.Center);
              CoverImage({
                path: track.coverUrl ?? null,
                imgWidth: 20,
                imgHeight: 20,
                radius: 2,
                fallbackText: (track.title ?? '?').substring(0, 1),
              });
              Column({ space: 2 }) {
                Text(track.title)
                  .fontSize(15)
                  .fontColor(index === this.view.currentIndex
                    ? this.theme.colors.primary
                    : this.theme.colors.text)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
                Text(track.artist ?? '')
                  .fontSize(12)
                  .fontColor(this.theme.colors.textSecondary)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis });
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start);
            }
            .width('100%')
            .padding({ top: 10, bottom: 10, left: 16, right: 16 })
            .onClick(() => {
              this.showPlaylist = false;
              playerStore.playTrackList(this.view.queue, index).catch(() => undefined);
            });
          }
        }, (track: Track, index: number) => `${index}_${track.id}`);
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off);
    }
    .width('100%')
    .height('100%')
    .padding({ left: 4, right: 4 });
  }

  @Builder moreSheet() {
    Column() {
      Text(t('playerMore.moreOptions'))
        .fontSize(16)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 8 });
      List() {
        ForEach(this.getMoreOptions(), (opt: MoreOption) => {
          ListItem() {
            Row() {
              Text(opt.label)
                .fontSize(15)
                .fontColor(this.theme.colors.text)
                .layoutWeight(1);
              Text('›')
                .fontSize(20)
                .fontColor(this.theme.colors.textSecondary);
            }
            .width('100%')
            .padding({ top: 16, bottom: 16, left: 20, right: 20 })
            .onClick(() => this.onMoreOption(opt.key));
          }
        }, (opt: MoreOption) => opt.key)
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off);
    }
    .width('100%')
    .height('100%')
    .padding({ left: 4, right: 4 });
  }

  private getMoreOptions(): MoreOption[] {
    const opts: MoreOption[] = [
      new MoreOption('artist', t('playerMore.artistDetails')),
      new MoreOption('album', t('playerMore.albumDetails')),
      new MoreOption('track', t('playerMore.trackDetails')),
      new MoreOption('sleepTimer', this.sleepTimerRemaining > 0
        ? `${t('playerMore.sleepTimer')} (${this.sleepTimerRemaining}min)` : t('playerMore.sleepTimer')),
      new MoreOption('addToPlaylist', t('playerMore.addToPlaylist')),
      new MoreOption('lyricsSize', t('playerMore.adjustLyricsSize')),
      new MoreOption('controlPosition', t('playerMore.controlPosition')),
    ];
    return opts;
  }

  private onMoreOption(key: string): void {
    this.showMore = false;
    const cur = this.current();
    if (key === 'artist') {
      if (!cur || !cur.artist) { promptAction.showToast({ message: t('common.unknownArtist') }); return; }
      this.navigateToArtist(cur.artist);
    } else if (key === 'album') {
      if (!cur || !cur.album) { promptAction.showToast({ message: t('common.unknownAlbum') }); return; }
      this.navigateToAlbum(cur.album);
    } else if (key === 'track') {
      if (!cur) return;
      promptAction.showDialog({
        title: `${t('playerMore.trackDetails')} · ${cur.title}`,
        message: `ID: ${cur.id}\n${cur.artist ? t('common.artists') + ': ' + cur.artist + '\n' : ''}${cur.album ? t('playerMore.albumDetails') + ': ' + cur.album + '\n' : ''}${cur.duration ? t('player.sleepTimer') + ': ' + formatDuration((cur.duration) * 1000) : ''}`,
        buttons: [{ text: t('common.close'), color: this.theme.colors.primary }],
      });
    } else if (key === 'sleepTimer') {
      setTimeout(() => { this.showSleepTimer = true; }, 150);
    } else if (key === 'addToPlaylist') {
      if (!cur) return;
      this.loadPlaylists();
      setTimeout(() => { this.showAddToPlaylist = true; }, 150);
    } else if (key === 'lyricsSize') {
      setTimeout(() => { this.showLyricsSize = true; }, 150);
    } else if (key === 'controlPosition') {
      setTimeout(() => { this.showControlPos = true; }, 150);
    }
  }

  private async navigateToArtist(name: string): Promise<void> {
    try {
      const artists = await artistApi.latest({ type: 'MUSIC', random: false, pageSize: 50 });
      const found = artists.find((a: ArtistDto) => a.name === name);
      if (found) {
        router.pushUrl({ url: 'pages/ArtistDetailPage', params: { id: String(found.id) } });
      } else {
        promptAction.showToast({ message: t('common.unknownArtist') });
      }
    } catch (e) {
      promptAction.showToast({ message: t('common.operationFailed') });
    }
  }

  private async navigateToAlbum(name: string): Promise<void> {
    try {
      const albums = await albumApi.latest({ type: 'MUSIC', random: false, pageSize: 50 });
      const found = albums.find((a: AlbumDto) => a.name === name);
      if (found) {
        router.pushUrl({ url: 'pages/AlbumDetailPage', params: { id: String(found.id) } });
      } else {
        promptAction.showToast({ message: t('common.unknownAlbum') });
      }
    } catch (e) {
      promptAction.showToast({ message: t('common.operationFailed') });
    }
  }

  private setSleepTimer(minutes: number): void {
    if (this.sleepTimerId !== -1) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = -1;
    }
    if (minutes <= 0) {
      this.sleepTimerRemaining = 0;
      promptAction.showToast({ message: t('player.cancelTimer') });
      return;
    }
    this.sleepTimerRemaining = minutes;
    this.sleepTimerId = setInterval(() => {
      this.sleepTimerRemaining -= 1;
      if (this.sleepTimerRemaining <= 0) {
        clearInterval(this.sleepTimerId);
        this.sleepTimerId = -1;
        this.sleepTimerRemaining = 0;
        playerStore.togglePlay().catch(() => undefined);
        promptAction.showToast({ message: t('player.sleepTimerTriggered') });
      }
    }, 60000);
    promptAction.showToast({ message: `${t('playerMore.sleepTimer')} ${minutes}min` });
  }

  private async loadPlaylists(): Promise<void> {
    try {
      this.playlists = await playlistApi.list('MUSIC');
    } catch (e) {
      Logger.w('PlayerPage', `loadPlaylists failed: ${String(e)}`);
    }
  }

  private async addToPlaylist(playlistId: string): Promise<void> {
    const cur = this.current();
    if (!cur) return;
    this.showAddToPlaylist = false;
    try {
      await playlistApi.addTrack(playlistId, cur.id);
      promptAction.showToast({ message: t('player.addedToPlaylist') });
    } catch (e) {
      promptAction.showToast({ message: t('player.addToPlaylistFailed') });
    }
  }

  @Builder sleepTimerSheet() {
    Column() {
      Text(t('playerMore.sleepTimer'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });
      if (this.sleepTimerRemaining > 0) {
        Row() {
          Text(`${t('player.cancelTimer')} (${this.sleepTimerRemaining}min)`)
            .fontSize(15).fontColor('#FF3B30')
        }
        .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
        .onClick(() => { this.showSleepTimer = false; this.setSleepTimer(0); })
      }
      ForEach([15, 20, 30, 45, 60, 120], (min: number) => {
        Row() {
          Text(`${min} ${t('common.minutes')}`)
            .fontSize(15).fontColor(this.theme.colors.text)
        }
        .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
        .onClick(() => { this.showSleepTimer = false; this.setSleepTimer(min); })
      }, (min: number) => `st-${min}`)
    }
    .width('100%').padding({ left: 4, right: 4 })
  }

  @Builder addToPlaylistSheet() {
    Column() {
      Text(t('playerMore.addToPlaylist'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });
      List() {
        ForEach(this.playlists, (pl: PlaylistDto) => {
          ListItem() {
            Row() {
              Text(pl.name).fontSize(15).fontColor(this.theme.colors.text).layoutWeight(1)
              Text('›').fontSize(18).fontColor(this.theme.colors.textSecondary)
            }
            .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
            .onClick(() => this.addToPlaylist(pl.id))
          }
        }, (pl: PlaylistDto) => pl.id)
      }
      .layoutWeight(1).scrollBar(BarState.Off)
    }
    .width('100%').height('100%').padding({ left: 4, right: 4 })
  }

  @Builder lyricsSizeSheet() {
    Column() {
      Text(t('playerMore.adjustLyricsSize'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });
      Text(t('lyricsSize.currentSize') + `: ${this.lyricFontSize}`)
        .fontSize(13).fontColor(this.theme.colors.textSecondary)
        .margin({ bottom: 12 });
      Row({ space: 20 }) {
        Button('-').width(50).height(50).borderRadius(25)
          .backgroundColor(this.theme.colors.surface)
          .fontColor(this.theme.colors.text).fontSize(24)
          .onClick(() => { if (this.lyricFontSize > 12) this.lyricFontSize -= 2; this.saveLyricSize(); })
        Text(`${this.lyricFontSize}`)
          .fontSize(20).fontWeight(FontWeight.Bold).fontColor(this.theme.colors.text)
        Button('+').width(50).height(50).borderRadius(25)
          .backgroundColor(this.theme.colors.surface)
          .fontColor(this.theme.colors.text).fontSize(24)
          .onClick(() => { if (this.lyricFontSize < 40) this.lyricFontSize += 2; this.saveLyricSize(); })
      }
      .margin({ bottom: 16 });
      Button(t('common.reset'))
        .backgroundColor(this.theme.colors.primary).fontColor('#FFFFFF').borderRadius(18)
        .onClick(() => { this.lyricFontSize = 16; this.saveLyricSize(); })
    }
    .width('100%').padding(20).alignItems(HorizontalAlign.Center)
  }

  @Builder controlPosSheet() {
    Column() {
      Text(t('playerMore.controlPosition'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });
      Slider({ value: this.controlBottomOffset, min: 0, max: 120, step: 1 })
        .width('80%')
        .trackColor(this.theme.colors.border)
        .selectedColor(this.theme.colors.primary)
        .blockColor(this.theme.colors.primary)
        .onChange((v: number, mode: SliderChangeMode) => {
          if (mode === SliderChangeMode.End || mode === SliderChangeMode.Click) {
            this.controlBottomOffset = v;
          }
        });
      Text(`${this.controlBottomOffset}`)
        .fontSize(13).fontColor(this.theme.colors.textSecondary)
        .margin({ top: 8, bottom: 16 });
      Button(t('common.reset'))
        .backgroundColor(this.theme.colors.primary).fontColor('#FFFFFF').borderRadius(18)
        .onClick(() => { this.controlBottomOffset = 0; })
    }
    .width('100%').padding(20).alignItems(HorizontalAlign.Center)
  }

  @Builder miCastSheet() {
    Column() {
      Text(t('player.miSpeakerTitle'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 });

      if (this.miLoading) {
        Column({ space: 12 }) {
          LoadingProgress().width(32).height(32).color(this.theme.colors.primary);
          Text(t('common.loading'))
            .fontSize(14).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (this.miLoggedIn) {
        if (this.miDevices.length === 0) {
          Column({ space: 12 }) {
            XiaoAiIcon({ iconSize: 40, color: this.theme.colors.textSecondary });
            Text(t('player.noMiDevices'))
              .fontSize(14).fontColor(this.theme.colors.textSecondary);
          }
          .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          List() {
            ForEach(this.miDevices, (device: MiDevice) => {
              ListItem() {
                Row({ space: 12 }) {
                  Column() {
                    XiaoAiIcon({ iconSize: 20, color: '#FFFFFFFF' });
                  }
                  .width(36).height(36).borderRadius(18)
                  .backgroundColor(this.theme.colors.primary)
                  .justifyContent(FlexAlign.Center);

                  Column({ space: 2 }) {
                    Text(device.name)
                      .fontSize(15).fontWeight(FontWeight.Medium)
                      .fontColor(this.theme.colors.text)
                      .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
                    if ((device.model ?? '').length > 0) {
                      Text(device.model ?? '')
                        .fontSize(12).fontColor(this.theme.colors.textSecondary)
                        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
                    }
                  }
                  .layoutWeight(1).alignItems(HorizontalAlign.Start);

                  Text('›').fontSize(20).fontColor(this.theme.colors.textSecondary);
                }
                .width('100%')
                .padding({ top: 12, bottom: 12, left: 16, right: 16 })
                .opacity(this.miCasting ? 0.5 : 1)
                .onClick(() => {
                  if (!this.miCasting) this.handleCastToMi(device.device_id, device.name);
                });
              }
            }, (device: MiDevice) => device.device_id);
          }
          .layoutWeight(1).scrollBar(BarState.Off);
        }
      } else if (this.miQRCodeUrl !== '') {
        Column({ space: 8 }) {
          Text(t('player.miLoginRequired'))
            .fontSize(14).fontColor(this.theme.colors.textSecondary);
          Image(this.miQRCodeUrl)
            .width(180).height(180).borderRadius(8)
            .backgroundColor('#FFFFFFFF')
            .objectFit(ImageFit.Contain);
          Text(t('player.miScanQRCode'))
            .fontSize(12).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      } else {
        Column({ space: 12 }) {
          XiaoAiIcon({ iconSize: 40, color: this.theme.colors.textSecondary });
          Text(t('player.miLoginRequired'))
            .fontSize(14).fontColor(this.theme.colors.textSecondary);
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
      }

      Row() {
        Text(t('common.close'))
          .fontSize(15).fontWeight(FontWeight.Medium)
          .fontColor(this.theme.colors.text);
      }
      .width('100%').padding({ top: 12, bottom: 12 })
      .margin({ top: 12 })
      .borderRadius(8)
      .backgroundColor(this.theme.colors.border)
      .justifyContent(FlexAlign.Center)
      .onClick(() => this.handleCloseMiCast());
    }
    .width('100%').height('100%')
    .padding({ left: 16, right: 16, bottom: 12 });
  }

  private saveLyricSize(): void {
    kvStore.set('lyric_font_size', String(this.lyricFontSize)).catch(() => undefined);
  }

  private loadSingle(trackId: string): void {
    trackApi.getById(trackId)
      .then((dto) => resolveTrackToPlayer(dto, false))
      .then((track) => playerStore.playTrack(track))
      .catch(() => undefined);
  }

  pageTransition() {
    PageTransitionEnter({ duration: 300, curve: Curve.EaseOut })
      .slide(SlideEffect.Bottom)
    PageTransitionExit({ duration: 300, curve: Curve.EaseIn })
      .slide(SlideEffect.Bottom)
  }
}
