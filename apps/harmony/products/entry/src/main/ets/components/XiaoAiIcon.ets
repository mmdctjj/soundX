import { buildTheme } from 'features_ui';
import type { Theme, ThemeMode } from 'features_ui';

/**
 * 小爱音箱图标，对齐 mobile 的 XiaoAiIcon（assets/images/xiaoai_dark|light.png + tintColor）。
 * 按主题选择深/浅底图，再用 colorFilter 把单色图形染成指定颜色（保留 alpha 通道）。
 */
function hexToRgb(hex: string): number[] {
  // 主题色格式为 #AARRGGBB；兼容 #RRGGBB。
  let h = hex.replace('#', '');
  if (h.length === 8) h = h.substring(2);
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [isNaN(r) ? 0 : r, isNaN(g) ? 0 : g, isNaN(b) ? 0 : b];
}

/** 生成把图形染成纯色 (r,g,b)、保留原始 alpha 的 4x5 颜色矩阵。 */
function tintMatrix(hex: string): number[] {
  const c = hexToRgb(hex);
  return [
    0, 0, 0, 0, c[0],
    0, 0, 0, 0, c[1],
    0, 0, 0, 0, c[2],
    0, 0, 0, 1, 0,
  ];
}

@Component
export struct XiaoAiIcon {
  @Prop iconSize: number = 24;
  @Prop color: string = '#FF000000';
  @StorageLink('themeMode') @Watch('onThemeModeChange') themeMode: ThemeMode = 'light';
  @State theme: Theme = buildTheme('light');

  aboutToAppear(): void {
    this.theme = buildTheme(this.themeMode);
  }

  onThemeModeChange(): void {
    this.theme = buildTheme(this.themeMode);
  }

  build() {
    Image(this.theme.mode === 'dark' ? $r('app.media.xiaoai_dark') : $r('app.media.xiaoai_light'))
      .width(this.iconSize)
      .height(this.iconSize)
      .objectFit(ImageFit.Contain)
      .colorFilter(tintMatrix(this.color));
  }
}
