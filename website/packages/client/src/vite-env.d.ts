/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_ID: string;
  readonly VITE_APPLICATION_ID: string;
  readonly VITE_SERVER_URL: string;
  readonly VITE_DISCORD_INVITE
  // add env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
