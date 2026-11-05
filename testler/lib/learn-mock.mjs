// Shared isolated frontend host: in-memory read-only Learn API, never a student DB.
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, extname, sep } from 'node:path';
export async function startLearnMock(root) {
  const dist = process.env.IVME_TEST_DIST ? resolve(process.env.IVME_TEST_DIST) : join(root, 'frontend/dist');
  const categories = JSON.parse(readFileSync(join(root, 'frontend/src/data/curriculumIdentities.json'), 'utf8')).canonicalUnits;
  const writes = [];
  const server = createServer((req, res) => {
    const p = new URL(req.url, 'http://localhost').pathname;
    const json = value => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (p.startsWith('/api/konu-ogrenme') && req.method !== 'GET') writes.push({ path: p, method: req.method });
    if (p === '/api/auth/me') return json({ id: 7, username: 'student', role: 'USER', contactComplete: true, approved: true });
    if (p === '/api/exam-tracks') return json({ currentId: 'yks', tracks: [{ id: 'yks', name: 'YKS', family: 'YKS', status: 'ACTIVE', sections: [], readyFeatures: [] }] });
    if (p.startsWith('/api/preferences/')) return json({ value: p.endsWith('question-image-fit') });
    if (p === '/api/konu-ogrenme') return json({ profile: null, events: [], serverNow: new Date().toISOString() });
    if (p === '/api/learning-resources/metadata') return json({ summary: {}, branches: [], categories });
    if (p.startsWith('/api/')) return json(null);
    const path = resolve(dist, `.${decodeURIComponent(p)}`);
    const file = path.startsWith(dist + sep) && extname(path) && existsSync(path) ? path : join(dist, 'index.html');
    const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json', '.webp': 'image/webp', '.woff2': 'font/woff2' };
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  process.env.IVME_URL = `http://127.0.0.1:${server.address().port}`;
  return { categories, writes, close: () => new Promise(done => server.close(done)) };
}
