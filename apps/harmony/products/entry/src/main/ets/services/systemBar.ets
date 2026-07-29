import { window } from '@kit.ArkUI';
import { buildTheme } from 'features_ui';
import type { ThemeMode } from 'features_ui';
import { Logger } from 'audiodock_common';

// 持有主窗口引用，供主题切换时同步系统状态栏 / 底部小横条区域背景色。
let mainWindow: window.Window | null = null;

export function setSystemBarWindow(win: window.Window): void {
  mainWindow = win;
}

/**
 * 把系统状态栏与底部导航（小横条）区域的背景色设为当前主题的 background，
 * 图标使用主题文字反差色。在启动与每次切换主题时调用。
 */
export function applySystemBar(mode: ThemeMode): void {
  if (!mainWindow) {
    return;
  }
  const theme = buildTheme(mode);
  const props: window.SystemBarProperties = {
    statusBarColor: theme.colors.background,
    navigationBarColor: theme.colors.background,
    statusBarContentColor: theme.colors.text,
    navigationBarContentColor: theme.colors.text,
  };
  mainWindow.setWindowSystemBarProperties(props)
    .catch((e: Error) => Logger.w('SystemBar', `apply failed: ${e.message}`));
  // 窗口背景色同步到最底层，确保底部小横条（home indicator）区域也跟随主题
  mainWindow.setWindowBackgroundColor(theme.colors.background);
}
