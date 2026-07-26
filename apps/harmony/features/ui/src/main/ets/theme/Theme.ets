import type { ColorPalette, ThemeMode } from './ColorTokens';
import { lightColors, darkColors, festiveColors } from './ColorTokens';
import { Spacing, Radius } from './Spacing';
import { Typography } from './Typography';

export interface Theme {
  mode: ThemeMode;
  colors: ColorPalette;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
}

export function buildTheme(mode: ThemeMode): Theme {
  const colors = mode === 'dark' ? darkColors : mode === 'festive' ? festiveColors : lightColors;
  return { mode, colors, spacing: Spacing, radius: Radius, typography: Typography };
}

export const defaultTheme = buildTheme('light');