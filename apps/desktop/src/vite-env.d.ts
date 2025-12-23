/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  ipcRenderer: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    off: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    getName: () => Promise<string>;
    openExternal: (url: string) => Promise<void>;
    selectDirectory: () => Promise<string>;
  };
}
