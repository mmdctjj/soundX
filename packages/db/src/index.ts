// Re-export everything from Prisma Client except TrackType
export * from '@prisma/client';

// Override the Prisma-generated TrackType enum with a const object for better browser compatibility
// This works because const exports take precedence over type-only exports
export const TrackType = {
  MUSIC: 'MUSIC',
  AUDIOBOOK: 'AUDIOBOOK',
} as const;

// Re-export TrackType as a type (this will override the Prisma enum type)
export type TrackType = (typeof TrackType)[keyof typeof TrackType];
