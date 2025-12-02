import { create } from "zustand";
import { type Track } from "../models";
import { addAlbumToHistory, addToHistory, toggleLike } from "../services/user";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  playMode: "sequence" | "loop" | "shuffle" | "single";
  volume: number;
  currentTime: number;
  duration: number;
  currentAlbumId: number | null; // Track which album is currently playing

  // Actions
  play: (track?: Track, albumId?: number) => void;
  pause: () => void;
  setPlaylist: (tracks: Track[]) => void;
  next: () => void;
  prev: () => void;
  setMode: (mode: "sequence" | "loop" | "shuffle" | "single") => void;
  setVolume: (volume: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  toggleLike: (trackId: number) => Promise<void>;
}

// Load cached track from localStorage
const getCachedTrack = (): Track | null => {
  try {
    const cached = localStorage.getItem("currentTrack");
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.error("Failed to load cached track", e);
    return null;
  }
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: getCachedTrack(),
  isPlaying: false,
  playlist: [],
  playMode: "sequence",
  volume: 70,
  currentTime: 0,
  duration: 0,
  currentAlbumId: null,

  play: async (track, albumId) => {
    const { currentTrack, currentAlbumId } = get();
    if (track) {
      if (currentTrack?.id !== track.id) {
        set({ currentTrack: track, isPlaying: true });

        // Cache the current track to localStorage
        try {
          localStorage.setItem("currentTrack", JSON.stringify(track));
        } catch (e) {
          console.error("Failed to cache track", e);
        }

        // Add track to history
        try {
          await addToHistory(track.id);
        } catch (e) {
          console.error("Failed to add track to history", e);
        }

        // Add album to history if it's a new album
        if (albumId && albumId !== currentAlbumId) {
          set({ currentAlbumId: albumId });
          try {
            await addAlbumToHistory(albumId);
          } catch (e) {
            console.error("Failed to add album to history", e);
          }
        }
      } else {
        set({ isPlaying: true });
      }
    } else {
      if (currentTrack) {
        set({ isPlaying: true });
      }
    }
  },

  pause: () => set({ isPlaying: false }),

  setPlaylist: (tracks: Track[]) => set({ playlist: tracks }),
  next: () => {
    const { playlist, currentTrack, playMode } = get();
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((t: Track) => t.id === currentTrack.id);
    let nextIndex = currentIndex + 1;

    if (playMode === "shuffle") {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else if (playMode === "loop") {
      if (nextIndex >= playlist.length) {
        if (playMode === "loop") {
          nextIndex = 0;
        } else {
          return; // Stop
        }
      }
    } else {
      // sequence
      if (nextIndex >= playlist.length) return;
    }

    const nextTrack = playlist[nextIndex];
    set({ currentTrack: nextTrack, isPlaying: true });

    // Cache the current track to localStorage
    try {
      localStorage.setItem("currentTrack", JSON.stringify(nextTrack));
    } catch (e) {
      console.error("Failed to cache track", e);
    }

    addToHistory(nextTrack.id);
  },
  prev: () => {
    const { playlist, currentTrack } = get();
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((t: Track) => t.id === currentTrack.id);
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return;

    const prevTrack = playlist[prevIndex];
    set({ currentTrack: prevTrack, isPlaying: true });

    // Cache the current track to localStorage
    try {
      localStorage.setItem("currentTrack", JSON.stringify(prevTrack));
    } catch (e) {
      console.error("Failed to cache track", e);
    }

    addToHistory(prevTrack.id);
  },
  setMode: (mode: "sequence" | "loop" | "shuffle" | "single") => set({ playMode: mode }),
  setVolume: (volume: number) => set({ volume }),
  setCurrentTime: (time: number) => set({ currentTime: time }),
  setDuration: (duration: number) => set({ duration }),
  toggleLike: async (trackId: number) => {
    // Optimistic update could be implemented here if we tracked like status in the store
    // For now, just call the API
    try {
      await toggleLike(trackId);
    } catch (e) {
      console.error("Failed to toggle like", e);
    }
  }
}));
