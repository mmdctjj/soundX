/**
 * MV 播放列表 store（对齐 mobile apps/mobile/src/store/mvPlaylist.ts）。
 *
 * 跳转 MV 详情页之前先 setPlaylist(mvs, idx)，详情页订阅此 store
 * 即可实现「从同一入口（艺人/专辑/库）进入后能上一首/下一首切换」连续播放。
 *
 * 单例：模块级 state + listeners 集合，页面用 aboutToAppear 订阅、
 * aboutToDisappear 退订，避免 ArkUI 状态追踪不到外部单例的问题。
 */
import type { MVDto } from 'features_network';

interface MvPlaylistState {
  list: MVDto[];
  currentIndex: number;
}

let state: MvPlaylistState = { list: [], currentIndex: 0 };
let listeners: Array<() => void> = [];

function notify(): void {
  listeners.forEach((fn) => fn());
}

export class MvPlaylistStore {
  /** 当前快照（list + currentIndex）。 */
  view(): MvPlaylistState {
    return state;
  }

  setPlaylist(list: MVDto[], startIndex: number = 0): void {
    const safeIdx = list.length === 0 ? 0 : Math.max(0, Math.min(startIndex, list.length - 1));
    state = { list: list.slice(), currentIndex: safeIdx };
    notify();
  }

  /** 在已有列表中切换到指定 mv（点击列表项时调用）。 */
  selectById(id: string): MVDto | null {
    const idx = state.list.findIndex((m) => m.id === id);
    if (idx < 0) return null;
    if (idx === state.currentIndex) return state.list[idx];
    state = { list: state.list.slice(), currentIndex: idx };
    notify();
    return state.list[idx];
  }

  getCurrent(): MVDto | null {
    return state.list[state.currentIndex] ?? null;
  }

  hasNext(): boolean {
    return state.currentIndex < state.list.length - 1;
  }

  hasPrev(): boolean {
    return state.currentIndex > 0;
  }

  next(): MVDto | null {
    if (!this.hasNext()) return null;
    state = { list: state.list.slice(), currentIndex: state.currentIndex + 1 };
    notify();
    return state.list[state.currentIndex];
  }

  prev(): MVDto | null {
    if (!this.hasPrev()) return null;
    state = { list: state.list.slice(), currentIndex: state.currentIndex - 1 };
    notify();
    return state.list[state.currentIndex];
  }

  clear(): void {
    state = { list: [], currentIndex: 0 };
    notify();
  }

  subscribe(fn: () => void): () => void {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  }
}

export const mvPlaylistStore: MvPlaylistStore = new MvPlaylistStore();
