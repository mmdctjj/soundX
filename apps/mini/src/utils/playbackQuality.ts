import type { AudioQuality } from '../services/trackQuality';

export const getCurrentPlaybackQualityPreference = (qualities: {
  externalPlaybackQuality: AudioQuality;
}) => qualities.externalPlaybackQuality;
