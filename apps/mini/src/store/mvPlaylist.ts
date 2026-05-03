import type { Mv } from '@soundx/services'

interface MvPlaylistState {
  list: Mv[]
  currentIndex: number
}

let state: MvPlaylistState = { list: [], currentIndex: 0 }
let listeners: Array<() => void> = []

const notify = () => listeners.forEach(fn => fn())

export const mvPlaylistStore = {
  getState: () => state,

  setPlaylist: (list: Mv[], startIndex = 0) => {
    state = { list, currentIndex: startIndex }
    notify()
  },

  getCurrent: (): Mv | null => state.list[state.currentIndex] ?? null,

  hasNext: () => state.currentIndex < state.list.length - 1,

  hasPrev: () => state.currentIndex > 0,

  next: (): Mv | null => {
    if (state.currentIndex < state.list.length - 1) {
      state = { ...state, currentIndex: state.currentIndex + 1 }
      notify()
      return state.list[state.currentIndex]
    }
    return null
  },

  prev: (): Mv | null => {
    if (state.currentIndex > 0) {
      state = { ...state, currentIndex: state.currentIndex - 1 }
      notify()
      return state.list[state.currentIndex]
    }
    return null
  },

  clear: () => {
    state = { list: [], currentIndex: 0 }
    notify()
  },

  subscribe: (fn: () => void) => {
    listeners.push(fn)
    return () => {
      listeners = listeners.filter(l => l !== fn)
    }
  },
}
