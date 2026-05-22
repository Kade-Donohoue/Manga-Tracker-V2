import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: 'src/background/index.ts',
        content: 'src/content/index.ts',
        popup: 'src/popup/index.ts',
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'background') return 'background.js';
          if (chunk.name === 'content') return 'content.js';
          if (chunk.name === 'popup') return 'popup.js';
          return '[name].js';
        },
      },
    },
  },
});
