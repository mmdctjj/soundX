import router from '@ohos.router';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { trackApi } from 'features_network';
import type { LyricLine } from 'features_player';
import { playerStore } from '../context/PlayerStore';
import type { PlayerStateView, Track } from '../context/PlayerStore';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { likesHistory } from '../services/LikesHistoryService';
import type { EventPayload, EventPayloadId } from '../services/LikesHistoryService';
import { CoverImage } from '../components/CoverImage';
import { AppIcon } from '../components/AppIcon';
import type { AppIconName } from '../components/AppIcon';

/**
 * 播放器详情页，布局与行为对齐 mobile 的 PlayerDetailView（竖屏）：
 * 顶部仅返回（chevron-down）；中部封面 200×200（点按切换歌词）/ 歌词列表
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
  @State private liked: boolean = false;
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');
  private lyricScroller: Scroller = new Scroller();
  private lastTrackId: string = '';
  private lastLyricIndex: number = -1;
  private unsub: () => void = () => {};
  private unsubLike: () => void = () => {};

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

  private playModeIcon(): AppIconName {
    switch (this.view.playMode) {
      case 'SHUFFLE': return 'shuffle';
      case 'LOOP_LIST': return 'repeat';
      case 'LOOP_SINGLE': return 'repeat-once';
      default: return 'playlist';
    }
  }

  build() {
    Column() {
      this.header();
      if (this.view.queue.length === 0) {
        Text(t('player.empty'))
          .fontColor(this.theme.colors.textSecondary)
          .margin({ top: 80 });
      } else {
        this.content();
      }
    }
    .width('100%').height('100%')
    .backgroundColor(this.theme.colors.background)
    .bindSheet($$this.showPlaylist, this.playlistSheet(), {
      height: '60%',
      dragBar: true,
      backgroundColor: this.theme.colors.background,
    });
  }

  @Builder header() {
    Row() {
      AppIcon({ name: 'chevron-down', iconSize: 26, color: this.theme.colors.text })
        .width(44).height(44)
        .onClick(() => router.back());
      Row().layoutWeight(1);
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

  private loadSingle(trackId: string): void {
    trackApi.getById(trackId)
      .then((dto) => resolveTrackToPlayer(dto, false))
      .then((track) => playerStore.playTrack(track))
      .catch(() => undefined);
  }
}
