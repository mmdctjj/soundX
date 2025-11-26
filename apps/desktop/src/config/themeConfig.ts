import { theme } from 'antd';
import type { ThemeConfig } from 'antd/es/config-provider';

export const getThemeConfig = (mode: 'light' | 'dark'): ThemeConfig => {
  const isDark = mode === 'dark';
  return {
    algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#ffffff' : '#000000',
      colorBgContainer: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)',
      colorBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
    components: {
      Layout: {
        colorBgBody: 'transparent',
        colorBgHeader: 'transparent',
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        activeBarBorderWidth: 0,
      },
      Drawer: {
        colorBgElevated: isDark ? 'rgba(24, 24, 36, 0.8)' : 'rgba(255, 255, 255, 0.8)',
      }
    },
  };
};
