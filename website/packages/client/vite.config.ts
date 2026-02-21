import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['/favicon.ico', '/robots.txt'],
        manifest: {
          name: 'Tomari, Manga Tracker',
          short_name: 'Tomari',
          start_url: '/tracked',
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          icons: [
            {
              src: '/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/icon.png',
              sizes: '1024x1024',
              type: 'image/png',
            },
          ],
        },
      }),
    ],
    base: './',
    define: {
      VITE_SERVER_URL: JSON.stringify(env.VITE_SERVER_URL),
    },
    envDir: '../../',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
      host: '0.0.0.0', // Allow external access through cloudflared
      port: 3000, // Main app still runs on 5173
      hmr: {
        protocol: 'wss', // WebSocket over HTTPS
        host: 'devmanga.kdonohoue.com', // Cloudflare tunnel domain
        // clientPort: 443, // Client (browser) connects to port 443
      },
    },
    preview: {
      port: 3000,
      strictPort: true,
    },
  };
});
