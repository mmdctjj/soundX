export type ThemeMode = 'light' | 'dark' | 'festive';

export interface ColorPalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  primary: string;
  onPrimary: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  error: string;
  success: string;
  warning: string;
  tabBar: string;
  tabBarActive: string;
  tabBarInactive: string;
  card: string;
}

// 与 apps/mobile/src/context/ThemeContext.tsx 保持一致
export const lightColors: ColorPalette = {
  background: '#FFFFFFFF',
  surface: '#FFF5F5F5',
  surfaceAlt: '#FFEEEEEE',
  primary: '#FF000000',
  onPrimary: '#FFFFFFFF',
  text: '#FF000000',
  textSecondary: '#FF666666',
  border: '#FFE0E0E0',
  accent: '#FFFF9800',
  error: '#FFE53935',
  success: '#FF43A047',
  warning: '#FFFFB300',
  tabBar: '#FFFFFFFF',
  tabBarActive: '#FF000000',
  tabBarInactive: '#FF888888',
  card: '#FFFFFFFF',
};

export const darkColors: ColorPalette = {
  background: '#FF000000',
  surface: '#FF1A1A1A',
  surfaceAlt: '#FF2A2A2A',
  primary: '#FFFFFFFF',
  onPrimary: '#FF000000',
  text: '#FFFFFFFF',
  textSecondary: '#FFAAAAAA',
  border: '#FF333333',
  accent: '#FFFFB74D',
  error: '#FFEF5350',
  success: '#FF66BB6A',
  warning: '#FFFFCA28',
  tabBar: '#FF000000',
  tabBarActive: '#FFFFFFFF',
  tabBarInactive: '#FF666666',
  card: '#FF1A1A1A',
};

export const festiveColors: ColorPalette = {
  background: '#FF8E1C1C',
  surface: '#FF9E2626',
  surfaceAlt: '#FFAE2E2E',
  primary: '#FFD4AF37',
  onPrimary: '#FF8E1C1C',
  text: '#FFD4AF37',
  textSecondary: '#FFBCA37F',
  border: '#FFD4AF37',
  accent: '#FFFFB300',
  error: '#FFEF5350',
  success: '#FF66BB6A',
  warning: '#FFFFCA28',
  tabBar: '#FF8E1C1C',
  tabBarActive: '#FFD4AF37',
  tabBarInactive: '#FFEF9A9A',
  card: '#FF9E2626',
};

/** 给 '#AARRGGBB' 颜色替换透明度，如 withAlpha(primary, '33') */
export function withAlpha(color: string, alphaHex: string): string {
  return '#' + alphaHex + color.substring(3);
}
