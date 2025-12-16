import { create } from "zustand";
import type { Album } from "../models";

interface ListCacheState {
  listMap: Record<string, Album[]>;
  loadCountMap: Record<string, number>;
  scrollMap: Record<string, number>;
  setList: (key: string, data: Album[]) => void;
  setLoadCount: (key: string, loadCount: number) => void;
  setScroll: (key: string, scroll: number) => void;
}

export const useAlbumListCache = create<ListCacheState>((set) => ({
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
