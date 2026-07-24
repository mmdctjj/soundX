import { theme } from 'antd';
import type { ThemeConfig } from 'antd/es/config-provider';
import {
  GLOBAL_TO_ANTD_TOKEN,
  type ThemeTokens,
  type UiThemePlugin,
} from './uiPluginSchema';

/**
 * global token 覆盖合并 antd token。
 * 未知 key 已在校验阶段被忽略，因此这里只需要白名单内键直接应用。
 */
const mergeGlobalTokens = (
  base: Record<string, unknown>,
  tokens: ThemeTokens | undefined,
): Record<string, unknown> => {
  if (!tokens?.global) return base;
  const out = { ...base };
  for (const [k, v] of Object.entries(tokens.global)) {
    const antdKey = GLOBAL_TO_ANTD_TOKEN[k];
    if (antdKey) out[antdKey] = v;
  }
  return out;
};

export const getThemeConfig = (
  mode: 'light' | 'dark',
  plugin?: UiThemePlugin | null,
): ThemeConfig => {
  const isDark = mode === 'dark';
  const tokens = plugin?.[mode];
  const baseToken = {
    colorPrimary: isDark ? '#ffffff' : '#000000',
    colorTextLightSolid: isDark ? '#000000' : '#ffffff',
    colorBgContainer: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
    colorBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  };
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: mergeGlobalTokens(baseToken, tokens),
    components: {
      Layout: {
        colorBgBody: 'transparent',
        colorBgHeader: 'transparent',
      },
      Button: {
        colorPrimaryText: isDark ? '#000' : '#fff',
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        activeBarBorderWidth: 0,
      },
      Drawer: {
        colorBgElevated: isDark ? 'rgba(24, 24, 36, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      },
      Popover: {
        colorBgElevated: isDark ? 'rgba(30, 30, 40, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        colorTextLightSolid: '#ffffff', 
        colorBorder: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
      },
      Tooltip: {
        colorBgSpotlight: isDark ? 'rgba(30, 30, 40, 0.9)' : 'rgba(50, 50, 50, 0.9)',
        colorTextLightSolid: '#ffffff', 
      },
    },
  };
};
