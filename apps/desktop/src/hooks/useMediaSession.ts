import { useEffect } from "react";
import { type Track } from "../models";
import { resolveArtworkUri } from "../services/trackResolver";

interface UseMediaSessionProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (time: number) => void;
}

export const useMediaSession = ({
  currentTrack,
  isPlaying,
  play,
  pause,
  next,
  prev,
  seekTo,
}: UseMediaSessionProps) => {
  // Update metadata
  useEffect(() => {
    if (!currentTrack) {
      if (navigator.mediaSession) {
        navigator.mediaSession.metadata = null;
      }
      return;
    }

    if (navigator.mediaSession) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.name,
        artist: currentTrack.artist,
        album: currentTrack.album,
        artwork: [
          {
            // 声明的是 image/jpeg，所以显式指定 jpeg 格式，避免拿到 webp 后
            // 系统播控（OS 层，不是 webview）解码失败。
            src:
              resolveArtworkUri(currentTrack, { width: 600, format: "jpeg" }) ||
              "https://picsum.photos/seed/music/300/300",
            sizes: "512x512",
            type: "image/jpeg",
          },
        ],
      });
    }
  }, [currentTrack]);

  // Update playback state
  useEffect(() => {
    if (navigator.mediaSession) {
      navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
    }
  }, [isPlaying]);

  // Set action handlers
  useEffect(() => {
    if (!navigator.mediaSession) return;

    navigator.mediaSession.setActionHandler("play", () => {
      play();
    });

    navigator.mediaSession.setActionHandler("pause", () => {
      pause();
    });

    navigator.mediaSession.setActionHandler("previoustrack", () => {
      prev();
    });

    navigator.mediaSession.setActionHandler("nexttrack", () => {
      next();
    });

    navigator.mediaSession.setActionHandler("seekto", (details) => {
      if (details.seekTime !== undefined) {
        seekTo(details.seekTime);
      }
    });

    return () => {
      if (navigator.mediaSession) {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekto", null);
      }
    };
  }, [play, pause, next, prev, seekTo]);
};
