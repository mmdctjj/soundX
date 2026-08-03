import { fileCache } from 'features_storage';
import type { TrackDto } from 'features_network';
import { getInternalQuality, getExternalQuality, resolveTrackUrl } from './trackQuality';
import type { Track } from '../context/PlayerStore';

export async function resolveTrackToPlayer(track: TrackDto, isExternal: boolean): Promise<Track> {
  const ext = track.ext ?? 'mp3';
  if (await fileCache.hasAudio(track.id, ext)) {
    return toPlayerTrack(track, await fileCache.audioPath(track.id, ext));
  }
  const q = isExternal ? await getExternalQuality() : await getInternalQuality();
  const url = await resolveTrackUrl(track.id, q, track.path);
  return toPlayerTrack(track, url);
}

function toPlayerTrack(t: TrackDto, url: string): Track {
  // PlayerStore.Track 是播放器内部模型，沿用 title/coverUrl；
  // 后端 TrackDto 的字段是 name/cover，在这里做一次映射。
  return {
    id: t.id, title: t.name, artist: t.artist, album: t.album,
    duration: t.duration, coverUrl: t.cover, ext: t.ext, url,
    lyrics: t.lyrics, contentType: t.type,
  };
}
