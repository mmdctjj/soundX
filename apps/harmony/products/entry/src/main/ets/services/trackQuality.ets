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
  // 对齐 mobile buildTrackPlaybackUrl：直接用 baseURL 拼出绝对流媒体地址。
  // 后端 playback-qualities 返回的 url 可能是相对路径，AVPlayer 无法直接播放，
  // 从而导致点了播放但系统没有声音。
  return trackApi.streamUrl(trackId, quality);
}
