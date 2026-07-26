import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct SkeletonBlock {
  @Prop width: string | number = '100%';
  @Prop height: number = 16;
  @Prop radius: number = 4;
  @Prop theme: Theme = buildTheme('light');

  build() {
    Row()
      .width(this.width).height(this.height)
      .backgroundColor(this.theme.colors.surfaceAlt)
      .borderRadius(this.radius);
  }
}