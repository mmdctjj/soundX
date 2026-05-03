import { create } from "zustand";
import type { Mv } from "@soundx/services";

interface MvPlaylistState {
  list: Mv[];
  currentIndex: number;
  setPlaylist: (list: Mv[], startIndex?: number) => void;
  getCurrent: () => Mv | null;
  hasNext: () => boolean;
  hasPrev: () => boolean;
  next: () => Mv | null;
  prev: () => Mv | null;
  clear: () => void;
}

export const useMvPlaylistStore = create<MvPlaylistState>((set, get) => ({
  list: [],
  currentIndex: 0,

  setPlaylist: (list, startIndex = 0) => {
    set({ list, currentIndex: startIndex });
  },

  getCurrent: () => {
    const { list, currentIndex } = get();
    return list[currentIndex] ?? null;
  },

  hasNext: () => {
    const { list, currentIndex } = get();
    return currentIndex < list.length - 1;
  },

  hasPrev: () => {
    const { currentIndex } = get();
    return currentIndex > 0;
  },

  next: () => {
    const { list, currentIndex } = get();
    if (currentIndex < list.length - 1) {
      const nextIndex = currentIndex + 1;
      set({ currentIndex: nextIndex });
      return list[nextIndex];
    }
    return null;
  },

  prev: () => {
    const { list, currentIndex } = get();
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      set({ currentIndex: prevIndex });
      return list[prevIndex];
    }
    return null;
  },

  clear: () => {
    set({ list: [], currentIndex: 0 });
  },
}));
