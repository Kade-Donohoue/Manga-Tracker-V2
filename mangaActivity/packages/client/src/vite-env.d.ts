/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIENT_ID: string;
  readonly VITE_DISCORD_API_BASE: string;
  readonly VITE_APPLICATION_ID: string;
  readonly VITE_SERVER_URL: string;
  readonly VITE_CLIENT_URL: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  // add env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
