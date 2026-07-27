export interface SpacingType {
  xxs: number;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

export interface RadiusType {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  pill: number;
}

export const Spacing: SpacingType = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius: RadiusType = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
};