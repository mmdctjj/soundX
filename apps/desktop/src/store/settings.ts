import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from "@tauri-apps/api/core";
import { emitTo } from "@tauri-apps/api/event";
import type { AudioQuality } from '../services/trackQuality';
import { isTauri } from "../utils/platform";

export interface SettingsState {
  general: {
    autoLaunch: boolean;
    minimizeToTray: boolean;
    language: string;
    theme: 'system' | 'light' | 'dark';
    acceptRelay: boolean;
    acceptSync: boolean;
    recommendationLikeRatio: number;
    experienceProgramEnabled: boolean;
    internalPlaybackQuality: AudioQuality;
    externalPlaybackQuality: AudioQuality;
  };
  desktopLyric: {
    enable: boolean;
    lockPosition: boolean;
    fontSize: number;
    fontColor: string;
    strokeWidth: number;
    strokeColor: string;
    shadow: boolean;
    alwaysOnTop: boolean;
    fontWeight: number;
    x?: number;
    y?: number;
  };
  download: {
    downloadPath: string;
    quality: '128k' | '320k' | 'flac';
    concurrentDownloads: number;
    cacheEnabled: boolean;
  };

  updateGeneral: (key: keyof SettingsState['general'], value: any) => void;
  updateDesktopLyric: (key: keyof SettingsState['desktopLyric'], value: any) => void;
  updateDownload: (key: keyof SettingsState['download'], value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      general: {
        autoLaunch: false,
        minimizeToTray: true,
        language: 'system',
        theme: 'system',
        acceptRelay: true,
        acceptSync: true,
        recommendationLikeRatio: 50,
        experienceProgramEnabled: true,
        internalPlaybackQuality: 'high',
        externalPlaybackQuality: 'standard',
      },
      desktopLyric: {
        enable: false,
        lockPosition: false,
        fontSize: 28,
        fontColor: '#ffffff',
        strokeWidth: 2,
        strokeColor: '#000000',
        shadow: true,
        alwaysOnTop: true,
        fontWeight: 500,
      },
      download: {
        downloadPath: '~/Music/Downloads',
        quality: '320k',
        concurrentDownloads: 3,
        cacheEnabled: true,
      },

      updateGeneral: (key, value) => {
        set((state) => ({
          general: { ...state.general, [key]: value },
        }));

        if (isTauri()) {
          if (key === 'autoLaunch') {
            invoke('set_auto_launch', { enable: value }).catch(console.error);
          }
          if (key === 'minimizeToTray') {
            // In Tauri, we handle minimize to tray via window events
            // The setting is read when window close event is triggered
          }
        }
      },
      updateDesktopLyric: (key, value) => {
        set((state) => ({
          desktopLyric: { ...state.desktopLyric, [key]: value },
        }));

        if (isTauri()) {
          if (key === "enable") {
            if (value) {
              invoke('create_lyric_window', { settings: get().desktopLyric }).catch(console.error);
            } else {
              invoke('close_lyric_window').catch(console.error);
            }
          }
          if (key === "lockPosition") {
            invoke('set_ignore_mouse_events', { ignore: value }).catch(console.error);
          }
          // Sync settings to lyric window via cross-window event
          emitTo('lyric', 'lyric:settings-update', { [key]: value }).catch(console.error);
        }
      },
      updateDownload: (key, value) => {
        set((state) => ({
          download: { ...state.download, [key]: value },
        }));

        if (key === 'downloadPath' && isTauri()) {
          // Keep the backend in sync: the local media streaming server resolves
          // cached audio files relative to this path.
          invoke('update_download_path', { path: value }).catch(console.error);
        }
      },
    }),
    {
      name: 'soundx-settings',
      version: 4,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          // Migration from version 0 to 1
          if (persistedState.general) {
            if (persistedState.general.acceptRelay === undefined) {
              persistedState.general.acceptRelay = true;
            }
            if (persistedState.general.acceptSync === undefined) {
              persistedState.general.acceptSync = true;
            }
          }
        }
        if (version <= 1) {
          // Migration to version 2
          if (persistedState.download && persistedState.download.cacheEnabled === undefined) {
            persistedState.download.cacheEnabled = true;
          }
        }
        if (version <= 2) {
          if (persistedState.general && persistedState.general.recommendationLikeRatio === undefined) {
            persistedState.general.recommendationLikeRatio = 50;
          }
        }
        if (version <= 3) {
          if (persistedState.general && persistedState.general.experienceProgramEnabled === undefined) {
            persistedState.general.experienceProgramEnabled = true;
          }
        }
        if (persistedState.general) {
          if (persistedState.general.internalPlaybackQuality === undefined) {
            persistedState.general.internalPlaybackQuality = 'high';
          }
          if (persistedState.general.externalPlaybackQuality === undefined) {
            persistedState.general.externalPlaybackQuality = 'standard';
          }
        }
        return persistedState;
      },
    }
  )
);
