import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '../../')

  console.log(mode)
  console.log(env.VITE_SERVER_URL)
  return {
    plugins: [react()],
    envDir: '../../',
    server: {
      proxy: {
        '/api': {
          target: env.VITE_SERVER_URL,
          changeOrigin: true,
          secure: false,
          ws: true,
          // rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
      hmr: {
        clientPort: 443,
      },
    },
  }
});
