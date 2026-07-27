import { buildTheme, type Theme } from '../theme/Theme';

@Component
export struct CommonButton {
  @Prop label: string = '';
  @Prop variant: 'primary' | 'secondary' | 'ghost' = 'primary';
  @Prop disabled: boolean = false;
  @Prop theme: Theme = buildTheme('light');
  onButtonClick: () => void = () => {};

  build() {
    Button(this.label)
      .type(this.variant === 'ghost' ? ButtonType.Normal : ButtonType.Capsule)
      .backgroundColor(this.bg())
      .fontColor(this.fg())
      .fontSize(this.theme.typography.body.fontSize)
      .height(44)
      .padding({ left: 24, right: 24 })
      .enabled(!this.disabled)
      .onClick(() => this.onButtonClick());
  }

  private bg(): string {
    if (this.disabled) return this.theme.colors.surfaceAlt;
    switch (this.variant) {
      case 'primary': return this.theme.colors.primary;
      case 'secondary': return this.theme.colors.surfaceAlt;
      case 'ghost': return '#00000000';
    }
  }

  private fg(): string {
    if (this.disabled) return this.theme.colors.textSecondary;
    switch (this.variant) {
      case 'primary': return this.theme.colors.onPrimary;
      case 'secondary': return this.theme.colors.text;
      case 'ghost': return this.theme.colors.primary;
    }
  }
}