export * from '@prisma/client';

// Explicitly export TrackType for frontend compatibility
// Prisma generates this as an enum, but we need to export it explicitly for ES modules
export const TrackType = {
  MUSIC: 'MUSIC',
  AUDIOBOOK: 'AUDIOBOOK',
} as const;

export type TrackType = typeof TrackType[keyof typeof TrackType];

