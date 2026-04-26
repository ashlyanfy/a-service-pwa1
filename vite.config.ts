import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'public'),
  resolve: {
    alias: {
      '/src': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        admin: resolve(__dirname, 'public/admin.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      allow: ['..'],
    },
  },
});
