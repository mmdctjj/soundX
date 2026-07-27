import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct SkeletonBlock {
  @Prop blockWidth: string | number = '100%';
  @Prop blockHeight: number = 16;
  @Prop radius: number = 4;
  @Prop theme: Theme = buildTheme('light');

  build() {
    Row()
      .width(this.blockWidth).height(this.blockHeight)
      .backgroundColor(this.theme.colors.surfaceAlt)
      .borderRadius(this.radius);
  }
}