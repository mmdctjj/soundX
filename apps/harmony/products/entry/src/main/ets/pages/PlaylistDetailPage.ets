import router from '@ohos.router';
import promptAction from '@ohos.promptAction';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';
import { t, getLang } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { playlistApi } from 'features_network';
import type { PlaylistDto, TrackDto } from 'features_network';
import { resolveTrackToPlayer } from '../services/trackResolver';
import { playerStore } from '../context/PlayerStore';
import type { Track } from '../context/PlayerStore';
import { CoverImage } from '../components/CoverImage';
import { AppIcon } from '../components/AppIcon';
import { GlobalBottomBar } from '../components/GlobalBottomBar';
import { Logger } from 'audiodock_common';

interface PlaylistDetail extends PlaylistDto { tracks: TrackDto[] }

@Entry
@Component
struct PlaylistDetailPage {
  @State data: PlaylistDetail | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  @State showMore: boolean = false;
  @State showRename: boolean = false;
  @State newName: string = '';
  @State renaming: boolean = false;
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @StorageProp('appLang') appLang: string = 'zh-CN';
  @State private langAtBuild: string = getLang();
  @State theme: Theme = buildTheme('light');

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
    interface RouterParams { id?: string }
    const p = router.getParams() as RouterParams;
    this.entityId = p.id ?? '';
    this.load();
  }

  onPageShow(): void {
    const cur = getLang();
    if (cur !== this.langAtBuild) this.langAtBuild = cur;
  }

  build() {
    if (this.langAtBuild === 'zh-CN') {
      this.LocalizedContent()
    } else {
      this.LocalizedContent()
    }
  }

  @Builder
  LocalizedContent() {
    Column() {
      // Header
      Row() {
        Text('‹').fontSize(28).fontColor(this.theme.colors.text)
          .onClick(() => router.back())
          .width(44).height(44).textAlign(TextAlign.Center)
        Text(this.data?.name ?? '')
          .fontSize(18).fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .layoutWeight(1)
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
        Text('⋮').fontSize(22).fontColor(this.theme.colors.text)
          .width(44).height(44).textAlign(TextAlign.Center)
          .onClick(() => { this.showMore = true; })
      }
      .width('100%').height(56)
      .padding({ left: 10, right: 10 })
      .alignItems(VerticalAlign.Center)

      if (this.loading) {
        Column() {
          LoadingProgress().width(48).height(48).color(this.theme.colors.primary)
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else if (this.error || !this.data) {
        Column() {
          Text(this.error || t('detail.retry_failed'))
            .fontSize(14).fontColor(this.theme.colors.textSecondary)
          Button(t('common.retry'))
            .backgroundColor(this.theme.colors.primary).fontColor('#FFFFFF').borderRadius(18)
            .margin({ top: 12 })
            .onClick(() => this.load())
        }
        .width('100%').layoutWeight(1).justifyContent(FlexAlign.Center)
      } else {
        this.Content()
      }

      GlobalBottomBar()
    }
    .width('100%').height('100%').backgroundColor(this.theme.colors.background)
    .bindSheet($$this.showMore, this.MoreSheet(), {
      height: 320,
      dragBar: true,
      backgroundColor: this.theme.colors.surface,
    })
    .bindSheet($$this.showRename, this.RenameSheet(), {
      height: 220,
      dragBar: true,
      backgroundColor: this.theme.colors.surface,
    })
  }

  @Builder
  Content() {
    List() {
      // 封面墙
      ListItem() {
        this.CoverWall()
      }

      // 播放全部按钮
      ListItem() {
        Row() {
          AppIcon({ name: 'play', iconSize: 18, color: '#FFFFFF' })
          Text(t('playlist.playAll'))
            .fontSize(15).fontWeight(FontWeight.Medium)
            .fontColor('#FFFFFF').margin({ left: 8 })
        }
        .width('100%').height(48)
        .justifyContent(FlexAlign.Center)
        .backgroundColor(this.theme.colors.primary)
        .borderRadius(12)
        .margin({ left: 16, right: 16, top: 12, bottom: 12 })
        .onClick(() => this.handlePlayAll())
      }

      // 曲目列表
      ForEach(this.data!.tracks, (tr: TrackDto, index: number) => {
        ListItem() {
          Row() {
            Text(`${index + 1}`)
              .fontSize(14)
              .fontColor(this.theme.colors.textSecondary)
              .width(30).textAlign(TextAlign.Center)
            CoverImage({
              path: tr.cover ?? '',
              imgWidth: 40, imgHeight: 40, radius: 6,
              fallbackText: (tr.name ?? '?').substring(0, 1),
            }).margin({ left: 8, right: 12 })
            Column() {
              Text(tr.name)
                .fontSize(15).fontWeight(FontWeight.Medium)
                .fontColor(this.theme.colors.text)
                .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
              if (tr.artist) {
                Text(tr.artist)
                  .fontSize(12).fontColor(this.theme.colors.textSecondary)
                  .margin({ top: 3 })
                  .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis })
              }
            }
            .layoutWeight(1).alignItems(HorizontalAlign.Start)
            Text(formatDuration((tr.duration ?? 0) * 1000))
              .fontSize(12).fontColor(this.theme.colors.textSecondary)
          }
          .width('100%')
          .padding({ top: 10, bottom: 10, left: 16, right: 16 })
          .alignItems(VerticalAlign.Center)
          .onClick(() => this.playFromIndex(index))
        }
      }, (tr: TrackDto) => tr.id)
    }
    .width('100%').layoutWeight(1)
    .scrollBar(BarState.Off)
  }

  @Builder
  CoverWall() {
    Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start }) {
      ForEach(this.getCoverUrls(), (url: string, idx: number) => {
        CoverImage({
          path: url,
          imgWidth: idx % 3 === 0 ? 80 : 60,
          imgHeight: idx % 3 === 0 ? 80 : 60,
          radius: 4,
          fallbackText: '♪',
        })
          .margin(2)
      }, (url: string, idx: number) => `cw-${idx}`)
    }
    .width('100%')
    .padding({ left: 14, right: 14, top: 12 })
  }

  @Builder
  MoreSheet() {
    Column() {
      Text(t('playlistDetail.title'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 12 })

      // 播放全部
      Row() {
        AppIcon({ name: 'play', iconSize: 20, color: this.theme.colors.primary })
        Text(t('playlist.playAll')).fontSize(15).fontColor(this.theme.colors.text).margin({ left: 12 })
      }
      .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
      .alignItems(VerticalAlign.Center)
      .onClick(() => { this.showMore = false; this.handlePlayAll(); })

      // 重命名
      Row() {
        Text('✎').fontSize(18).fontColor(this.theme.colors.text)
        Text(t('playlistDetail.editPlaylist')).fontSize(15).fontColor(this.theme.colors.text).margin({ left: 12 })
      }
      .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
      .alignItems(VerticalAlign.Center)
      .onClick(() => {
        this.showMore = false;
        this.newName = this.data?.name ?? '';
        setTimeout(() => { this.showRename = true; }, 150);
      })

      // 解散
      Row() {
        Text('🗑').fontSize(18)
        Text(t('playlistDetail.deletePlaylist')).fontSize(15).fontColor('#FF3B30').margin({ left: 12 })
      }
      .width('100%').padding({ top: 14, bottom: 14, left: 20, right: 20 })
      .alignItems(VerticalAlign.Center)
      .onClick(() => { this.showMore = false; this.handleDelete(); })
    }
    .width('100%').padding({ left: 4, right: 4 })
  }

  @Builder
  RenameSheet() {
    Column() {
      Text(t('playlistDetail.editPlaylist'))
        .fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(this.theme.colors.text)
        .margin({ top: 8, bottom: 16 })

      TextInput({ placeholder: t('playlist.namePlaceholder'), text: this.newName })
        .height(48)
        .borderRadius(10)
        .border({ width: 1, color: this.theme.colors.border })
        .backgroundColor(this.theme.colors.card)
        .fontColor(this.theme.colors.text)
        .fontSize(15)
        .padding({ left: 14, right: 14 })
        .onChange((v: string) => { this.newName = v; })

      Button() {
        if (this.renaming) {
          LoadingProgress().width(20).height(20).color('#FFFFFF')
        } else {
          Text(t('common.confirm')).fontSize(15).fontWeight(FontWeight.Medium).fontColor('#FFFFFF')
        }
      }
      .width('100%').height(46)
      .borderRadius(10)
      .backgroundColor(this.theme.colors.primary)
      .margin({ top: 16 })
      .enabled(this.newName.trim().length > 0 && !this.renaming)
      .onClick(() => this.handleRename())
    }
    .width('100%').padding({ left: 20, right: 20 })
  }

  private getCoverUrls(): string[] {
    if (!this.data || !this.data.tracks) return [];
    const urls: string[] = [];
    const seen: Set<string> = new Set();
    for (const tr of this.data.tracks) {
      const c = tr.cover ?? '';
      if (c && !seen.has(c)) {
        seen.add(c);
        urls.push(c);
        if (urls.length >= 9) break;
      }
    }
    return urls;
  }

  private async handlePlayAll(): Promise<void> {
    if (!this.data || this.data.tracks.length === 0) return;
    try {
      const tracks: Track[] = [];
      for (const x of this.data.tracks) tracks.push(await resolveTrackToPlayer(x, false));
      await playerStore.playTrackList(tracks, 0);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('PlaylistDetail', `playAll failed: ${String(e)}`);
    }
  }

  private async playFromIndex(index: number): Promise<void> {
    if (!this.data || this.data.tracks.length === 0) return;
    try {
      const tracks: Track[] = [];
      for (const x of this.data.tracks) tracks.push(await resolveTrackToPlayer(x, false));
      await playerStore.playTrackList(tracks, index);
      router.pushUrl({ url: 'pages/PlayerPage' });
    } catch (e) {
      Logger.w('PlaylistDetail', `playFromIndex failed: ${String(e)}`);
    }
  }

  private handleDelete(): void {
    promptAction.showDialog({
      title: t('playlistDetail.deletePlaylist'),
      message: t('playlistDetail.confirmDelete'),
      buttons: [
        { text: t('common.cancel'), color: this.theme.colors.text },
        { text: t('common.confirm'), color: '#FF3B30' },
      ],
    }).then(async (res) => {
      if (res.index === 1) {
        try {
          await playlistApi.remove(this.entityId);
          promptAction.showToast({ message: t('common.success') });
          router.back();
        } catch (e) {
          promptAction.showToast({ message: t('common.operationFailed') });
        }
      }
    });
  }

  private async handleRename(): Promise<void> {
    const name = this.newName.trim();
    if (!name || this.renaming) return;
    this.renaming = true;
    try {
      await playlistApi.rename(this.entityId, name);
      if (this.data) {
        const d = this.data;
        this.data = {
          id: d.id,
          name: name,
          type: d.type,
          createdAt: d.createdAt,
          description: d.description,
          trackCount: d.trackCount,
          cover: d.cover,
          tracks: d.tracks
        } as PlaylistDetail;
      }
      this.showRename = false;
      promptAction.showToast({ message: t('common.success') });
    } catch (e) {
      promptAction.showToast({ message: t('common.operationFailed') });
    } finally {
      this.renaming = false;
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const res = await playlistApi.getById(this.entityId);
      this.data = {
        id: res.id,
        name: res.name,
        type: res.type,
        createdAt: res.createdAt,
        description: res.description,
        trackCount: res.trackCount,
        cover: res.cover,
        tracks: res.tracks ?? []
      } as PlaylistDetail;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
