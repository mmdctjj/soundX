import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct CommonNavBar {
  @Prop title: string = '';
  @Prop showBack: boolean = true;
  @Prop theme: Theme = buildTheme('light');
  @Prop showMore: boolean = false;
  onBack: () => void = () => {};
  onMore: () => void = () => {};

  build() {
    Row() {
      if (this.showBack) {
        Text('‹')
          .fontSize(28)
          .fontColor(this.theme.colors.text)
          .width(44).height(44)
          .textAlign(TextAlign.Center)
          .onClick(() => this.onBack());
      } else {
        Row().width(44);
      }
      Text(this.title)
        .layoutWeight(1)
        .textAlign(TextAlign.Center)
        .fontSize(this.theme.typography.h3.fontSize)
        .fontWeight(this.theme.typography.h3.fontWeight)
        .fontColor(this.theme.colors.text);
      if (this.showMore) {
        Text('···')
          .fontSize(20)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.theme.colors.text)
          .width(44).height(44)
          .textAlign(TextAlign.Center)
          .onClick(() => this.onMore());
      } else {
        Row().width(44);
      }
    }
    .width('100%').height(56)
    .backgroundColor(Color.Transparent)
    .padding({ left: 4, right: 4 });
  }
}