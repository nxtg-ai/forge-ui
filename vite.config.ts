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
    // Loopback unless FORGE_UI_HOST opts in (same variable as the API server).
    // For phone/LAN access: FORGE_UI_HOST=0.0.0.0 plus ALLOWED_ORIGINS.
    host: process.env.FORGE_UI_HOST || '127.0.0.1',
    port: 5050, // NXTG-Forge dedicated UI port
    strictPort: true, // FAIL if port in use - do NOT auto-increment
    open: true,
    // Vite injects /@vite/client ahead of index.html's referrer <meta>, so the
    // policy must also come as a header (DIRECTIVE-NXTG-20261008-03).
    // `vite preview` inherits server.headers.
    headers: { 'Referrer-Policy': 'strict-origin' },
    // The dev server serves files from the repo root, which in dev is also the
    // API's working directory. Serve only what the app needs (allow), and refuse
    // project state, logs, build output, docs and server code inside it (deny):
    // any client of :5050 could read them without a credential (forge-pm
    // security finding al:802d7317c90eb745). The first four deny entries are
    // Vite's defaults, which this list replaces.
    fs: {
      allow: ['src', 'public', 'node_modules', 'index.html'],
      deny: [
        '.env',
        '.env.*',
        '*.{crt,pem}',
        '**/.git/**',
        '**/.claude/**',
        '**/.forge/**',
        '**/.asif/**',
        '**/.github/**',
        '**/*.md',
        '**/src/server/**',
        '**/dist/**',
        '**/logs/**',
        '**/data/**',
        '**/coverage/**',
        '**/scripts/**',
        '**/docs/**',
      ],
    },
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
