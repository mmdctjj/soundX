import { invoke } from "@tauri-apps/api/core";
import { getBaseURL } from "../https";
import type { Track } from "../models";
import { useAuthStore } from "../store/auth";
import { useSettingsStore } from "../store/settings";
import { isTauri } from "../utils/platform";

interface TrackMetadata {
  id: number | string;
  path: string;
  name: string;
  artist: string;
  album: string;
  albumId?: number | string;
  duration: number | null;
  type: string;
  cover?: string | null;
  lyrics?: string | null;
  localPath?: string;
}

export const downloadTrack = async (track: Track): Promise<boolean> => {
  if (!isTauri()) return false;

  const settings = useSettingsStore.getState();
  const downloadPath = settings.download.downloadPath;
  const token = useAuthStore.getState().token;
  const albumName = track.albumEntity?.name || track.album || "Unknown Album";

  let remoteUri = "";
  if (track.path) {
    remoteUri = track.path.startsWith("http")
      ? track.path
      : `${getBaseURL()}${track.path}`;
  }

  if (!remoteUri) return false;

  const metadata: TrackMetadata = {
    id: track.id,
    path: track.path,
    name: track.name,
    artist: track.artist,
    album: albumName,
    albumId: track.albumEntity?.id || (track as any).albumId,
    duration: track.duration,
    type: track.type,
    cover: track.cover ? (track.cover.startsWith('http') ? track.cover : `${getBaseURL()}${track.cover}`) : null,
    lyrics: track.lyrics
  };

  try {
    const res = await invoke("cache_download", {
      trackId: track.id,
      url: remoteUri,
      downloadPath,
      trackType: track.type,
      albumName,
      metadata,
      token,
    }) as string | null;
    return !!res;
  } catch (error) {
    console.error(`[DownloadManager] Failed to download track ${track.id}`, error);
    return false;
  }
};

export const downloadTracks = async (tracks: Track[], onProgress?: (completed: number, total: number) => void): Promise<void> => {
  let completed = 0;
  const total = tracks.length;

  // We can do them in batches or one by one. One by one is safer for simple progress.
  for (const track of tracks) {
    await downloadTrack(track);
    completed++;
    if (onProgress) {
        onProgress(completed, total);
    }
  }
};
