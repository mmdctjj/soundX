import { type Track } from "@soundx/db";
import { create } from "zustand";
import { addToHistory, toggleLike } from "../services/user";

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  playlist: Track[];
  playMode: "sequence" | "loop" | "shuffle" | "single";
  volume: number;
  currentTime: number;
  duration: number;

  // Actions
  play: (track?: Track) => void;
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

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  playlist: [],
  playMode: "sequence",
  volume: 70,
  currentTime: 0,
  duration: 0,

  play: async (track) => {
    const { currentTrack } = get();
    if (track) {
      if (currentTrack?.id !== track.id) {
        set({ currentTrack: track, isPlaying: true });
        // Add to history
        try {
          // Assuming we have a way to get current user ID, or the service handles it
          // For now, we'll just call the service. 
          // Note: In a real app, we might want to debounce this or check if already added recently.
          await addToHistory(track.id);
        } catch (e) {
          console.error("Failed to add to history", e);
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
      // If "loop" means "repeat one", then nextIndex = currentIndex.
      // If "loop" means "repeat list", then we handle end of list.
      // Let's assume "loop" is repeat one (single loop) based on icon usually, or we have "sequence" (list loop).
      // Actually usually: sequence (stop at end), loop (list loop), shuffle, single (repeat one).
      // The UI has: sequence, shuffle, loop, single.
      // Let's map:
      // sequence: next track, stop at end.
      // shuffle: random.
      // loop: next track, loop to start at end.
      // single: repeat current track.

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

    set({ currentTrack: playlist[nextIndex], isPlaying: true });
    addToHistory(playlist[nextIndex].id);
  },
  prev: () => {
    const { playlist, currentTrack } = get();
    if (!currentTrack || playlist.length === 0) return;

    const currentIndex = playlist.findIndex((t: Track) => t.id === currentTrack.id);
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return;

    set({ currentTrack: playlist[prevIndex], isPlaying: true });
    addToHistory(playlist[prevIndex].id);
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
