import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../');

  return {
    plugins: [react()],
    base: './',
    define: {
      'process.env': {
        VITE_SERVER_URL: env.VITE_SERVER_URL,
      },
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
    },
  };
});
