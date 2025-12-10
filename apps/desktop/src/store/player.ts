import { create } from "zustand";
import { TrackType, type Track } from "../models";
import { addAlbumToHistory, addToHistory, toggleLike, toggleUnLike } from "../services/user";
import { getPlayMode } from "../utils/playMode";

interface PlayerModeState {
  currentTrack: Track | null;
  playlist: Track[];
  currentTime: number;
  duration: number;
  currentAlbumId: number | null;
}

interface PlayerState {
  // Active State (Proxy for UI)
  currentTrack: Track | null;
  playlist: Track[];
  currentTime: number;
  duration: number;
  currentAlbumId: number | null;

  // Global State
  isPlaying: boolean;
  playMode: "sequence" | "loop" | "shuffle" | "single";
  volume: number;
  activeMode: TrackType;

  // Persisted States
  modes: Record<TrackType, PlayerModeState>;

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
  toggleLike: (trackId: number, type: "like" | "unlike") => Promise<void>;

  // Internal/System Actions
  syncActiveMode: (mode: TrackType) => void;
  _saveCurrentStateToMode: () => void;
}

const DEFAULT_MODE_STATE: PlayerModeState = {
  currentTrack: null,
  playlist: [],
  currentTime: 0,
  duration: 0,
  currentAlbumId: null,
};

// Helper to load state from localStorage with safe defaults
const loadModeState = (mode: TrackType): PlayerModeState => {
  try {
    const key = `playerState_${mode}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_MODE_STATE, ...parsed };
    }
  } catch (e) {
    console.error(`Failed to load player state for ${mode}`, e);
  }
  return { ...DEFAULT_MODE_STATE };
};

const persistModeState = (mode: TrackType, state: PlayerModeState) => {
  try {
    localStorage.setItem(`playerState_${mode}`, JSON.stringify(state));
  } catch (e) {
    console.error(`Failed to persist player state for ${mode}`, e);
  }
};


export const usePlayerStore = create<PlayerState>((set, get) => {
  // Initialize
  const initialMode = getPlayMode(); // from utils
  const initialMusicState = loadModeState(TrackType.MUSIC);
  const initialAudiobookState = loadModeState(TrackType.AUDIOBOOK);

  const activeState = initialMode === TrackType.AUDIOBOOK ? initialAudiobookState : initialMusicState;

  return {
    // Spread active state properties to top level
    ...activeState,

    isPlaying: false,
    playMode: "sequence",
    volume: 70,
    activeMode: initialMode,

    modes: {
      [TrackType.MUSIC]: initialMusicState,
      [TrackType.AUDIOBOOK]: initialAudiobookState,
    },

    _saveCurrentStateToMode: () => {
      const state = get();
      const modeState: PlayerModeState = {
        currentTrack: state.currentTrack,
        playlist: state.playlist,
        currentTime: state.currentTime,
        duration: state.duration,
        currentAlbumId: state.currentAlbumId,
      };

      // Update the stored mode state in memory
      const newModes = { ...state.modes, [state.activeMode]: modeState };

      // Persist to localStorage
      persistModeState(state.activeMode, modeState);

      return newModes;
    },

    syncActiveMode: (newMode: TrackType) => {
      const state = get();
      if (state.activeMode === newMode) return;

      // 1. Save current active state to the old mode
      state._saveCurrentStateToMode(); // Valid because we called it, but we need to update state

      // Re-get updated modes (though _save returned them, simpler to just access properly if we were updating, but here we manually do it)
      // Actually _saveCurrentStateToMode above didn't set(); it just returned data or side-effected?? 
      // Let's refactor _save to just return the object to avoid side-effect confusion in 'set'

      const currentModeStateProxy: PlayerModeState = {
        currentTrack: state.currentTrack,
        playlist: state.playlist,
        currentTime: state.currentTime,
        duration: state.duration,
        currentAlbumId: state.currentAlbumId,
      };
      persistModeState(state.activeMode, currentModeStateProxy);

      const newModes = {
        ...state.modes,
        [state.activeMode]: currentModeStateProxy
      };

      // 2. Load state for new mode
      const nextModeState = newModes[newMode] || DEFAULT_MODE_STATE;

      set({
        activeMode: newMode,
        modes: newModes,
        // Apply next state
        currentTrack: nextModeState.currentTrack,
        playlist: nextModeState.playlist,
        currentTime: nextModeState.currentTime,
        duration: nextModeState.duration,
        currentAlbumId: nextModeState.currentAlbumId,
        isPlaying: false, // Pause on switch
      });
    },

    play: async (track, albumId) => {
      const { currentTrack, currentAlbumId, activeMode } = get();

      // If passing a track, logic is complex
      if (track) {
        if (currentTrack?.id !== track.id) {
          set({ currentTrack: track, isPlaying: true, currentTime: 0 });
          // Note: We don't explicitly save to modes[...] here on every frame, 
          // we rely on syncActiveMode or unmount to save, OR we should save on significant changes?
          // The request implies "store corresponding current audio", so persistence is key.
          // Let's persist currentTrack change immediately.
          const state = get();
          persistModeState(activeMode, {
            currentTrack: track,
            playlist: state.playlist,
            currentTime: 0,
            duration: 0,
            currentAlbumId: albumId || state.currentAlbumId
          });

          // History Logic
          try {
            await addToHistory(track.id);
          } catch (e) {
            console.error("Failed to add track to history", e);
          }

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

    pause: () => {
      set({ isPlaying: false });
      // Good time to save progress
      const s = get();
      persistModeState(s.activeMode, {
        currentTrack: s.currentTrack,
        playlist: s.playlist,
        currentTime: s.currentTime,
        duration: s.duration,
        currentAlbumId: s.currentAlbumId
      });
    },

    setPlaylist: (tracks: Track[]) => {
      set({ playlist: tracks });
      const s = get();
      persistModeState(s.activeMode, {
        ...s, // this spreads too much, but essentially we want current state properties
        currentTrack: s.currentTrack,
        playlist: tracks,
        currentTime: s.currentTime,
        duration: s.duration,
        currentAlbumId: s.currentAlbumId
      } as PlayerModeState);
    },

    next: () => {
      const { playlist, currentTrack, playMode, activeMode } = get();
      if (!currentTrack || playlist.length === 0) return;

      const currentIndex = playlist.findIndex((t: Track) => t.id === currentTrack.id);
      let nextIndex = currentIndex + 1;

      if (playMode === "shuffle") {
        nextIndex = Math.floor(Math.random() * playlist.length);
      } else if (playMode === "loop") {
        if (nextIndex >= playlist.length) {
          nextIndex = 0;
        }
      } else {
        if (nextIndex >= playlist.length) return;
      }

      const nextTrack = playlist[nextIndex];
      set({ currentTrack: nextTrack, isPlaying: true, currentTime: 0 });

      addToHistory(nextTrack.id);

      // Persist
      const s = get();
      persistModeState(activeMode, {
        currentTrack: nextTrack,
        playlist: s.playlist,
        currentTime: 0, // Reset time on new track
        duration: 0,
        currentAlbumId: s.currentAlbumId
      } as PlayerModeState);
    },

    prev: () => {
      const { playlist, currentTrack, activeMode } = get();
      if (!currentTrack || playlist.length === 0) return;

      const currentIndex = playlist.findIndex((t: Track) => t.id === currentTrack.id);
      const prevIndex = currentIndex - 1;

      if (prevIndex < 0) return;

      const prevTrack = playlist[prevIndex];
      set({ currentTrack: prevTrack, isPlaying: true, currentTime: 0 });

      addToHistory(prevTrack.id);

      // Persist
      const s = get();
      persistModeState(activeMode, {
        currentTrack: prevTrack,
        playlist: s.playlist,
        currentTime: 0,
        duration: 0,
        currentAlbumId: s.currentAlbumId
      } as PlayerModeState);
    },

    setMode: (mode) => set({ playMode: mode }),
    setVolume: (volume) => set({ volume }),

    setCurrentTime: (time) => {
      set({ currentTime: time });
      // Don't persist on every second, pointless & heavy. Persist on pause/change/unload.
    },

    setDuration: (duration) => set({ duration }),

    toggleLike: async (trackId, type) => {
      try {
        await (type === "like" ? toggleLike(trackId) : toggleUnLike(trackId));
        const { currentTrack } = get();
        if (currentTrack?.id === trackId) {
          set({
            currentTrack: {
              ...currentTrack,
              likedByUsers: type === "like"
                ? [...(currentTrack?.likedByUsers ?? []), 1]
                : (currentTrack?.likedByUsers ?? []).filter((id) => id !== 1)
            }
          });
        }
      } catch (e) {
        console.error("Failed to toggle like", e);
      }
    }
  };
});
