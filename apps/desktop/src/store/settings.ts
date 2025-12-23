import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SettingsState {
  general: {
    autoLaunch: boolean;
    minimizeToTray: boolean;
    language: string;
    theme: 'system' | 'light' | 'dark';
  };
  desktopLyric: {
    enable: boolean;
    lockPosition: boolean;
    fontSize: number;
    fontColor: string;
    shadow: boolean;
    alwaysOnTop: boolean;
  };
  download: {
    downloadPath: string;
    quality: '128k' | '320k' | 'flac';
    concurrentDownloads: number;
  };

  updateGeneral: (key: keyof SettingsState['general'], value: any) => void;
  updateDesktopLyric: (key: keyof SettingsState['desktopLyric'], value: any) => void;
  updateDownload: (key: keyof SettingsState['download'], value: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      general: {
        autoLaunch: false,
        minimizeToTray: true,
        language: 'zh-CN',
        theme: 'system',
      },
      desktopLyric: {
        enable: true,
        lockPosition: false,
        fontSize: 28,
        fontColor: '#ffffff',
        shadow: true,
        alwaysOnTop: true,
      },
      download: {
        downloadPath: '~/Music/Downloads',
        quality: '320k',
        concurrentDownloads: 3,
      },

      updateGeneral: (key, value) => {
        set((state) => ({
          general: { ...state.general, [key]: value },
        }));

        if ((window as any).ipcRenderer) {
          if (key === 'autoLaunch') {
            (window as any).ipcRenderer.invoke('set-auto-launch', value);
          }
          if (key === 'minimizeToTray') {
            (window as any).ipcRenderer.send('settings:update-minimize-to-tray', value);
          }
        }
      },
      updateDesktopLyric: (key, value) =>
        set((state) => ({
          desktopLyric: { ...state.desktopLyric, [key]: value },
        })),
      updateDownload: (key, value) =>
        set((state) => ({
          download: { ...state.download, [key]: value },
        })),
    }),
    {
      name: 'soundx-settings',
    }
  )
);
