import { getImageUrl } from '../utils/image';

@Component
export struct CoverImage {
  @Prop @Watch('onPathChange') path: string | null = null;
  @Prop imgWidth: number = 60;
  @Prop imgHeight: number = 60;
  @Prop radius: number | string = 8;
  @Prop fallbackText: string = '?';
  @Prop fallbackBg: string = '#52B54B';
  @State failed: boolean = false;
  @State currentUrl: string = '';

  aboutToAppear() {
    this.currentUrl = getImageUrl(this.path);
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
        .fontColor('#FFFFFF')
        .fontWeight(FontWeight.Bold)
    }
    .width(this.imgWidth)
    .height(this.imgHeight)
    .borderRadius(this.radius)
    .backgroundColor(this.fallbackBg)
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