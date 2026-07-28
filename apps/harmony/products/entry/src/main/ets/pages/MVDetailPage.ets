import router from '@ohos.router';
import { buildTheme, CommonNavBar, EmptyView, SkeletonBlock } from 'features_ui';
import type { ThemeMode } from 'features_ui';
import { t } from 'features_i18n';
import { formatDuration } from 'audiodock_common';
import { mvApi } from 'features_network';
import type { MVDto } from 'features_network';

@Entry
@Component
struct MVDetailPage {
  @State data: MVDto | null = null;
  @State loading: boolean = true;
  @State error: string = '';
  private entityId: string = '';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme = buildTheme('light');

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

  build() {
    Column() {
      CommonNavBar({ title: this.data?.name ?? '', theme: this.theme,
        onBack: () => router.back() });
      if (this.loading) {
        Column({ space: 12 }) {
          SkeletonBlock({ blockHeight: 220, theme: this.theme });
          SkeletonBlock({ blockWidth: '60%', blockHeight: 20, theme: this.theme });
        }.padding(16);
      } else if (this.error || !this.data) {
        EmptyView({ message: this.error || t('detail.retry_failed'), theme: this.theme });
      } else {
        this.content();
      }
    }.width('100%').height('100%').backgroundColor(this.theme.colors.background);
  }

  @Builder content() {
    Column({ space: 12 }) {
      // Cover stand-in for <video> playback; P3 wires the real player.
      SkeletonBlock({ blockHeight: 220, theme: this.theme });
      Text(this.data!.name).fontSize(22).fontWeight(FontWeight.Bold);
      Text(this.data!.artist ?? '').fontSize(14)
        .fontColor(this.theme.colors.textSecondary);
      Text(formatDuration((this.data!.duration ?? 0) * 1000))
        .fontSize(12).fontColor(this.theme.colors.textSecondary);
    }.padding(16);
  }

  private async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      this.data = await mvApi.getById(this.entityId);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.loading = false;
    }
  }
}
