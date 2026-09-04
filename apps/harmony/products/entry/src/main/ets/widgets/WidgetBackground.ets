/**
 * 卡片背景组件（对齐 iOS 玻璃拟态）。
 *
 * - 有封面：封面图铺底 + 高斯模糊（iOS `blur(radius: 18)` 等价） + 黑 22% 暗化 + 白 8% 高光
 * - 无封面：primary → secondary 双色线性渐变
 * - 顶层永远叠一层白 8% 高光，确保前景白色文字清晰可读
 */

@Component
export struct WidgetBackground {
  @Prop cover: string = '';
  @Prop colorPrimary: string = '#1a1a2e';
  @Prop colorSecondary: string = '#16213e';

  build() {
    Stack() {
      if (this.cover !== '') {
        // 有封面：封面铺底 + 高斯模糊（对齐 iOS `.blur(radius: 18)`，hm Image.blur 不支持
        // 任意 radius 但可用 0/1/2/3/4 枚举档位，叠加放大放大倍数走 20，视觉接近 iOS 模糊度）
        Image(this.cover)
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
          .blur(20);
        // 黑 22% 暗化
        Rect()
          .width('100%')
          .height('100%')
          .fill('#38000000');
      } else {
        // 无封面：双色线性渐变
        Column()
          .width('100%')
          .height('100%')
          .linearGradient({
            angle: 135,
            colors: [[this.colorPrimary, 0.0], [this.colorSecondary, 1.0]],
          });
      }
      // 顶层白 8% 高光（让前景更通透）
      Rect()
        .width('100%')
        .height('100%')
        .fill('#14FFFFFF');
    }
    .width('100%')
    .height('100%');
  }
}
