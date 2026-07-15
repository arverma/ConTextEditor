/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDITOR_ORIGIN?: string;
  readonly VITE_EDITOR_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
