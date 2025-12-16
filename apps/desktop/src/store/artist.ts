import { create } from "zustand";
import type { Artist } from "../models";

interface ListCacheState {
  listMap: Record<string, Artist[]>;
  loadCountMap: Record<string, number>;
  scrollMap: Record<string, number>;
  setList: (key: string, data:  Artist[]) => void;
  setLoadCount: (key: string, loadCount: number) => void;
  setScroll: (key: string, scroll: number) => void;
}

export const useArtistListCache = create<ListCacheState>((set) => ({
  listMap: {},
  loadCountMap: {},
  scrollMap: {},
  setList: (key, data) =>
    set((state) => ({
      listMap: {
        ...state.listMap,
        [key]: data,
      },
    })),
  setLoadCount: (key, loadCount) =>
    set((state) => ({
      loadCountMap: {
        ...state.loadCountMap,
        [key]: loadCount,
      },
    })),
  setScroll: (key, scroll) =>
    set((state) => ({
      scrollMap: {
        ...state.scrollMap,
        [key]: scroll,
      },
    })),
}));
