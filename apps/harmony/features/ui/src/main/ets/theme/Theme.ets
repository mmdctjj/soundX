import type { ColorPalette, ThemeMode } from './ColorTokens';
import { lightColors, darkColors, festiveColors } from './ColorTokens';
import { Spacing, Radius, type SpacingType, type RadiusType } from './Spacing';
import { Typography, type TypographyType } from './Typography';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: SpacingType;
  radius: RadiusType;
  typography: TypographyType;
}

export function buildTheme(mode: ThemeMode): Theme {
  const colors = mode === 'dark' ? darkColors : mode === 'festive' ? festiveColors : lightColors;
  return { mode, colors, spacing: Spacing, radius: Radius, typography: Typography };
}

export const defaultTheme = buildTheme('light');

/** AppStorage 中主题模式的 key，配合 @StorageLink 实现一键切换主题 */
export const THEME_MODE_KEY = 'themeMode';