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
}

export const lightColors: ColorPalette = {
  background: '#FFFFFFFF',
  surface: '#F7F7F7FF',
  surfaceAlt: '#EEEEEEFF',
  primary: '#FF5722FF',
  onPrimary: '#FFFFFFFF',
  text: '#1A1A1AFF',
  textSecondary: '#666666FF',
  border: '#E0E0E0FF',
  accent: '#FF9800FF',
  error: '#E53935FF',
  success: '#43A047FF',
  warning: '#FFB300FF',
  tabBar: '#FFFFFFFF',
  tabBarActive: '#FF5722FF',
  tabBarInactive: '#999999FF',
};

export const darkColors: ColorPalette = {
  background: '#121212FF',
  surface: '#1E1E1EFF',
  surfaceAlt: '#2A2A2AFF',
  primary: '#FF7043FF',
  onPrimary: '#FFFFFFFF',
  text: '#F0F0F0FF',
  textSecondary: '#AAAAAAFF',
  border: '#333333FF',
  accent: '#FFB74DFF',
  error: '#EF5350FF',
  success: '#66BB6AFF',
  warning: '#FFCA28FF',
  tabBar: '#1A1A1AFF',
  tabBarActive: '#FF7043FF',
  tabBarInactive: '#888888FF',
};

export const festiveColors: ColorPalette = {
  background: '#FFF8F1FF',
  surface: '#FFEEDBFF',
  surfaceAlt: '#FFE0C2FF',
  primary: '#D32F2FFF',
  onPrimary: '#FFEB3BFF',
  text: '#3E2723FF',
  textSecondary: '#795548FF',
  border: '#FFCCBCFF',
  accent: '#FFB300FF',
  error: '#C62828FF',
  success: '#388E3CFF',
  warning: '#F57C00FF',
  tabBar: '#FFEBE0FF',
  tabBarActive: '#D32F2FFF',
  tabBarInactive: '#A1887FFF',
};