import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@core': path.resolve(__dirname, './src/core'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    host: '0.0.0.0', // Bind to all interfaces for mobile/external access
    port: 5050, // NXTG-Forge dedicated UI port
    strictPort: true, // FAIL if port in use - do NOT auto-increment
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5051',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:5051',
        ws: true,
        changeOrigin: true,
        rewriteWsOrigin: true,
      },
      '/terminal': {
        target: 'ws://localhost:5051',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist-ui',
    sourcemap: true,
  },
});
