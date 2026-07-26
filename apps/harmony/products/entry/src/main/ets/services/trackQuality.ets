import { kvStore } from 'features_storage';
import { trackApi } from 'features_network';

export type Quality = 'lossless' | 'high' | 'standard';

function asQuality(raw: string | null, fallback: Quality): Quality {
  if (raw === 'lossless' || raw === 'high' || raw === 'standard') return raw;
  return fallback;
}

export async function getInternalQuality(): Promise<Quality> {
  return asQuality(await kvStore.get('internalPlaybackQuality'), 'high');
}

export async function getExternalQuality(): Promise<Quality> {
  return asQuality(await kvStore.get('externalPlaybackQuality'), 'standard');
}

export async function resolveTrackUrl(trackId: string, quality: Quality): Promise<string> {
  const all = await trackApi.playbackQualities(trackId);
  const pick = all.find((q) => q.level === quality) ?? all[0];
  if (!pick) throw new Error(`no playback quality for ${trackId}`);
  return pick.url;
}
