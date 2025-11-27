/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PLATFORM: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
