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

export async function resolveTrackUrl(trackId: string, quality: Quality, path?: string): Promise<string> {
  // 对齐 mobile/desktop/mini 的 buildTrackPlaybackUrl：外部源曲目的 path 是 http(s)
  // 直链，客户端直接播放原地址，不走 /track/stream 服务端代理。
  if (path && (path.startsWith('http://') || path.startsWith('https://'))) {
    return path;
  }
  // 本地曲目：直接用 baseURL 拼出绝对流媒体地址。
  // 后端 playback-qualities 返回的 url 可能是相对路径，AVPlayer 无法直接播放，
  // 从而导致点了播放但系统没有声音。
  return trackApi.streamUrl(trackId, quality);
}
