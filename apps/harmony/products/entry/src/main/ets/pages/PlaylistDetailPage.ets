import router from '@ohos.router';
import { buildTheme, CommonNavBar, CommonButton, EmptyView, SkeletonBlock } from 'features_ui';
import type { ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { playlistApi } from 'features_network';
import type { PlaylistDto, TrackDto } from 'features_network';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { likesHistory, EventPayloadId } from '../services/LikesHistoryService';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { MiniPlayer } from '../components/MiniPlayer';

interface PlaylistDetail extends PlaylistDto { tracks: TrackDto[] }

@Entry
@Component
struct PlaylistDetailPage {
  @State data: PlaylistDetail | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  @State liked: boolean = false;
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State private langAtBuild: string = getLang();
  private theme = buildTheme('light');
  private unsub: () => void = () => {};

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    interface RouterParams { id?: string }
    const p = router.getParams() as RouterParams;
    this.entityId = p.id ?? '';
    this.load();
    this.unsub = likesHistory.on('albumLike', (e) => {
      const ev = e as EventPayloadId;
      if (ev.id === this.entityId) this.liked = ev.liked;
    });
    likesHistory.isAlbumLiked(this.entityId).then((v) => this.liked = v).catch(() => undefined);
  }

  aboutToDisappear(): void {
    this.unsub();
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
      CommonNavBar({ title: this.data?.name ?? '', theme: this.theme,
        onBack: () => router.back() });
      if (this.loading) {
        Column({ space: 12 }) {
          SkeletonBlock({ blockHeight: 160, theme: this.theme });
          SkeletonBlock({ blockWidth: '60%', blockHeight: 20, theme: this.theme });
        }.padding(16).layoutWeight(1);
      } else if (this.error || !this.data) {
        EmptyView({ message: this.error || t('detail.retry_failed'), theme: this.theme })
          .layoutWeight(1);
      } else {
        this.content();
      }
      MiniPlayer()
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background)
  }

  @Builder content() {
    Column({ space: 12 }) {
      Text(this.data!.name).fontSize(22).fontWeight(FontWeight.Bold);
      if (this.data!.description) {
        Text(this.data!.description).fontSize(13)
          .fontColor(this.theme.colors.textSecondary).maxLines(4);
      }
      CommonButton({
        label: t('player.title'),
        theme: this.theme, onButtonClick: async () => {
          if (!this.data || this.data.tracks.length === 0) return;
          const tracks: Track[] = [];
          for (const x of this.data.tracks) tracks.push(await resolveTrackToPlayer(x, false));
          await playerStore.playTrackList(tracks, 0);
          router.pushUrl({ url: 'pages/PlayerPage' });
        },
      });
      CommonButton({
        label: this.liked ? t('detail.unlike') : t('detail.like'),
        theme: this.theme, variant: this.liked ? 'secondary' : 'primary',
        onButtonClick: () => {
          if (this.liked) likesHistory.unlikeAlbum(this.entityId);
          else likesHistory.likeAlbum(this.entityId);
        },
      });
      List() {
        ForEach(this.data!.tracks, (tr: TrackDto) => {
          ListItem() {
            Row() {
              Text(tr.name).layoutWeight(1).fontSize(15);
              Text(formatDuration((tr.duration ?? 0) * 1000))
                .fontSize(12).fontColor(this.theme.colors.textSecondary);
            }.padding(12);
          }
          .onClick(async () => {
            const tracks: Track[] = [];
            for (const x of this.data!.tracks) tracks.push(await resolveTrackToPlayer(x, false));
            const idx = this.data!.tracks.findIndex((x) => x.id === tr.id);
            await playerStore.playTrackList(tracks, idx >= 0 ? idx : 0);
            router.pushUrl({ url: 'pages/PlayerPage' });
          });
        }, (tr: TrackDto) => tr.id);
      }.layoutWeight(1);
    }.padding(16).layoutWeight(1);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await playlistApi.getById(this.entityId) as PlaylistDetail;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
