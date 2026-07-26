export interface TextStyle {
  fontSize: number;
  fontWeight: FontWeight;
  lineHeight: number;
}

export enum FontWeight {
  Regular = 400, Medium = 500, SemiBold = 600, Bold = 700,
}

export const Typography = {
  h1: { fontSize: 28, fontWeight: FontWeight.Bold, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: FontWeight.SemiBold, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: FontWeight.SemiBold, lineHeight: 26 },
  body: { fontSize: 15, fontWeight: FontWeight.Regular, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: FontWeight.Medium, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: FontWeight.Regular, lineHeight: 18 },
  micro: { fontSize: 11, fontWeight: FontWeight.Regular, lineHeight: 16 },
} as const;