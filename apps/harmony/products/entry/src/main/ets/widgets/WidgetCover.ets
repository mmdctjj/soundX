import { getImageUrl } from '../utils/image';
import { WidgetIcon } from './WidgetIcon';

/**
 * 卡片专用封面组件（卡片进程独立运行，不依赖 AppStorage/EntryAbility context）。
 *
 * - coverPath: 完整 URL 或 /covers/xxx 相对路径（主 App 已写过 kvStore.cover）
 * - placeholder: 占位音符图标（无封面/加载失败时显示）
 * - 大/中/小 三档预设
 *
 * 注意：图片加载失败时不抛错，保留占位 UI（卡片 UI 必须容错）。
 */

export interface CoverSize {
  width: number;
  height: number;
  radius: number;
}

export class COVER_PRESETS {
  static readonly large: CoverSize = { width: 96, height: 96, radius: 14 };
  static readonly medium: CoverSize = { width: 64, height: 64, radius: 12 };
  static readonly small: CoverSize = { width: 40, height: 40, radius: 8 };
}

@Component
export struct WidgetCover {
  @Prop cover: string = '';
  @Prop preset: 'large' | 'medium' | 'small' = 'medium';

  build() {
    Stack({ alignContent: Alignment.Center }) {
      // 占位底（白色 10% 透明）
      Rect()
        .width('100%')
        .height('100%')
        .fill('#1AFFFFFF')
        .radius(this.getSize().radius);

      // 封面图
      if (this.cover !== '') {
        Image(this.resolveUrl(this.cover))
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
          .borderRadius(this.getSize().radius);
      }

      // 占位音符（无封面时显示）
      if (this.cover === '') {
        WidgetIcon('music', this.getSize().width * 0.4, '#B3FFFFFF');
      }
    }
    .width(this.getSize().width)
    .height(this.getSize().height);
  }

  private resolveUrl(path: string): string {
    // 已是 http/https 直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    // 卡片进程没有主 App 的 networkMode 内存变量，统一走绝对 URL（/image/optimize + 缩略图）
    return getImageUrl(path, 300);
  }

  private getSize(): CoverSize {
    if (this.preset === 'large') return COVER_PRESETS.large;
    if (this.preset === 'small') return COVER_PRESETS.small;
    return COVER_PRESETS.medium;
  }
}
