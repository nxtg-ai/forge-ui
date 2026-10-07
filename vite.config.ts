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
      // 127.0.0.1, not localhost: the API binds IPv4 loopback only, and
      // `localhost` can resolve to ::1 first.
      '/api': {
        target: 'http://127.0.0.1:5051',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:5051',
        ws: true,
        changeOrigin: true,
      },
      '/terminal': {
        target: 'ws://127.0.0.1:5051',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist-ui',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-motion': ['framer-motion'],
          'vendor-ui': ['lucide-react', 'class-variance-authority', 'tailwind-merge', 'clsx'],
        },
      },
    },
  },
});
