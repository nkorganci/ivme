import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api requests → Spring Boot (8081)
const api = {
  '/api': {
    target: 'http://127.0.0.1:8081',
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq, req) => {
        if (req.headers.host) {
          proxyReq.setHeader('X-Forwarded-Host', req.headers.host);
        }
      });
    },
  },
};

export default defineConfig({
  plugins: [react()],

  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,

    proxy: api,

    allowedHosts: ['net.ivme.dev'],

    // Yerel geliştirmede açık sayfa kaynak değişince güncellensin.
    hmr: true,
  },

  preview: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: api,
    allowedHosts: ['net.ivme.dev'],
  },

  build: {
    outDir: 'dist',
  },
});
