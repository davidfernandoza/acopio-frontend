/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="@types/google.maps" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_MAPS_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
