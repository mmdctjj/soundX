import { getImageUrl } from '../utils/image';
import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

@Component
export struct CoverImage {
  @Prop @Watch('onPathChange') path: string | null = null;
  @Prop imgWidth: number = 60;
  @Prop imgHeight: number = 60;
  @Prop radius: number | string = 8;
  @Prop fallbackText: string = '?';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  private theme: Theme = buildTheme('light');
  @State failed: boolean = false;
  @State currentUrl: string = '';

  aboutToAppear() {
    this.theme = buildTheme(this.themeMode);
    this.currentUrl = getImageUrl(this.path);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  // path 变化时刷新 URL 并清掉失败态（切歌换封面依赖这个）
  onPathChange() {
    this.currentUrl = getImageUrl(this.path);
    this.failed = false;
  }

  @Builder
  Fallback() {
    Column() {
      Text((this.fallbackText || '?').substring(0, 1))
        .fontSize(20)
        .fontColor(this.theme.colors.textSecondary)
        .fontWeight(FontWeight.Bold)
    }
    .width(this.imgWidth)
    .height(this.imgHeight)
    .borderRadius(this.radius)
    .backgroundColor(this.theme.colors.surface)
    .justifyContent(FlexAlign.Center)
  }

  build() {
    if (this.failed || !this.currentUrl) {
      this.Fallback();
    } else {
      Stack({ alignContent: Alignment.Center }) {
        Image(this.currentUrl)
          .width(this.imgWidth)
          .height(this.imgHeight)
          .borderRadius(this.radius)
          .objectFit(ImageFit.Cover)
          .onError(() => {
            this.failed = true;
          })
        if (this.failed) {
          this.Fallback();
        }
      }
      .width(this.imgWidth)
      .height(this.imgHeight)
    }
  }
}
