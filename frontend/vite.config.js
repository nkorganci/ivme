import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const branch = execFileSync('git', ['branch', '--show-current'], {
  cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8',
}).trim();
const localPort = branch === 'main' ? 9090 : 9091;

const localApiTargetFile = fileURLToPath(new URL('../.codex/dev-api-target.txt', import.meta.url));
function localApiTarget() {
  if (process.env.IVME_API_TARGET) {
    if (!/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(process.env.IVME_API_TARGET))
      throw new Error('IVME_API_TARGET must be a loopback HTTP address.');
    return process.env.IVME_API_TARGET;
  }
  try {
    const target = readFileSync(localApiTargetFile, 'utf8').trim();
    if (/^http:\/\/127\.0\.0\.1:\d{1,5}$/.test(target)) return target;
  } catch { /* A normal development launch uses port 8081. */ }
  return 'http://127.0.0.1:8081';
}

// A local override allows an updated backend to run alongside an older development instance.
const api = {
  '/api': {
    target: localApiTarget(),
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
  plugins: [react(), {
    name: 'local-api-target',
    configureServer(server) {
      const reload = (_event, path) => {
        if (resolve(path) === resolve(localApiTargetFile))
          server.restart().catch((error) => server.config.logger.error(error.message));
      };
      server.watcher.add(localApiTargetFile);
      server.watcher.on('all', reload);
      server.httpServer?.once('close', () => server.watcher.off('all', reload));
    },
  }],

  server: {
    // The same controlled vocabulary is consumed by the API and the teacher UI.
    fs: { allow: [fileURLToPath(new URL('.', import.meta.url)), fileURLToPath(new URL('../backend/src/main/resources/review-vocabulary.json', import.meta.url))] },
    host: '127.0.0.1',
    port: localPort,
    strictPort: true,

    proxy: api,

    allowedHosts: ['net.ivme.dev'],

    // Yerel geliştirmede açık sayfa kaynak değişince güncellensin.
    hmr: true,
  },

  preview: {
    host: '127.0.0.1',
    port: localPort,
    strictPort: true,
    proxy: api,
    allowedHosts: ['net.ivme.dev'],
  },

  build: {
    outDir: 'dist',
  },
});
