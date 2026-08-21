import { ConfigurationConstant, common } from '@kit.AbilityKit';
import { Logger } from 'audiodock_common';
import type { ThemeMode } from 'features_ui';
import { applySystemBar } from '../services/systemBar';

/**
 * ThemeAutoStore — 「自动主题」开关的全局控制中心。
 *
 * 对齐 mobile 端 SettingsContext 的 autoTheme 语义：开启后 themeMode 跟随系统色
 * 实时切换（light ↔ dark）。注意 festive 是农历新年主题，不会被系统色覆盖。
 *
 * 实现说明（比 Web mediaquery 更可靠）：
 * - 系统色变化通过 EntryAbility.onConfigurationUpdate(newConfig) 回调接住，
 *   这是 HarmonyOS 系统级标准回调，100% 可信。
 * - 读当前系统色用 `context.config.colorMode === ConfigurationConstant.ColorMode.COLOR_MODE_DARK`。
 * - 不在 SettingsPage onPageShow 里做：切后台再回前台要持续响应，必须跨页面生命周期。
 * - EntryAbility 启动时调 init(ctx) + restore()，onDestroy 时调 stop()。
 */
class ThemeAutoStore {
  private ctx: common.UIAbilityContext | null = null;

  /**
   * 注入 context。仅 EntryAbility.initialize() 调用一次。
   */
  init(ctx: common.UIAbilityContext): void {
    this.ctx = ctx;
  }

  /**
   * 应用启动时调用：根据 kvStore 的 autoTheme 决定是否立即同步当前系统色到 themeMode。
   * 通常在 EntryAbility.initialize() 末尾同步调用。
   */
  restore(): void {
    if (AppStorage.get<boolean>('autoTheme') === true) {
      this.applyCurrentSystemMode();
    }
  }

  /**
   * 设置页切自动主题开关时调用。
   * - 开启：立即把 themeMode 同步成当前系统色
   * - 关闭：什么都不做（保留当前 themeMode，用户手动选择不变；
   *        onConfigurationUpdate 回调里会校验 autoTheme 自动停止覆盖）
   */
  setEnabled(enabled: boolean): void {
    if (enabled) {
      this.applyCurrentSystemMode();
    }
  }

  /**
   * EntryAbility.onConfigurationUpdate(newConfig) 回调时调用。
   * 系统色变化时（系统设置里切换深浅色），按 autoTheme 状态决定是否同步 themeMode。
   * 同步完 themeMode 后立即调 applySystemBar 刷新系统状态栏 / 小横跳区域背景色，
   * 否则 UI 内容会跟随但系统区域不跟随（要清理重进才生效）。
   * colorMode 可能为 undefined（SDK 类型定义 optional），默认按 light 处理。
   */
  onSystemColorChanged(colorMode: ConfigurationConstant.ColorMode | undefined): void {
    if (AppStorage.get<boolean>('autoTheme') !== true) return;
    const currentMode = AppStorage.get<ThemeMode>('themeMode') ?? 'light';
    // festive 是春节主题，不参与自动切换；只有 light/dark 才被系统色驱动
    if (currentMode === 'festive') return;
    const resolved: ConfigurationConstant.ColorMode =
      colorMode ?? ConfigurationConstant.ColorMode.COLOR_MODE_LIGHT;
    const target: ThemeMode =
      resolved === ConfigurationConstant.ColorMode.COLOR_MODE_DARK ? 'dark' : 'light';
    if (target !== currentMode) {
      AppStorage.setOrCreate<ThemeMode>('themeMode', target);
      // 系统状态栏 / 小横跳区域背景色同步（applySystemBar 内部有 mainWindow 兜底，
      // 启动期 mainWindow 还没 set 时会 noop，但 onWindowStageCreate 之后会重新调一次）
      applySystemBar(target);
    }
  }

  /** 应用销毁时（如有）调用，解除引用避免泄漏 */
  stop(): void {
    this.ctx = null;
  }

  /**
   * 读取当前系统颜色方案，写入 AppStorage('themeMode')。
   * 仅在 autoTheme 是 true 时写（防止关闭瞬间系统又变了一下错把 themeMode 改了）。
   * 不会覆盖 festive。
   */
  private applyCurrentSystemMode(): void {
    if (!this.ctx) {
      Logger.w('ThemeAutoStore', 'applyCurrentSystemMode: ctx not initialized');
      return;
    }
    if (AppStorage.get<boolean>('autoTheme') !== true) return;
    const colorMode = this.ctx.config.colorMode;
    this.onSystemColorChanged(colorMode);
  }
}

export const themeAutoStore: ThemeAutoStore = new ThemeAutoStore();