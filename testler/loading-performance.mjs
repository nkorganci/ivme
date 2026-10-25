// Read-only local page/API timing probe. Usage: node testler/loading-performance.mjs [output.json]
import fs from 'node:fs';
import { dirname } from 'node:path';
import { tarayiciAc, pause } from './lib/tarayici.mjs';

const browser = await tarayiciAc();
const result = { pages: [], apis: [] };
try {
  await browser.goto('/');
  await browser.login('student');
  for (const path of ['/calisma/yeni', '/soru-bankasi', '/dersler-ve-konular']) {
    const started = performance.now();
    await browser.goto(path);
    await pause(300);
    let controlsMs;
    if (path !== '/dersler-ve-konular') {
      await browser.wait(`location.pathname === ${JSON.stringify(path)}
        && document.querySelector('.branch-picker select:not(:disabled)')
        && !document.querySelector('.branch-picker:disabled')`, 60000);
      controlsMs = Math.round(performance.now() - started);
    }
    await browser.wait(`location.pathname === ${JSON.stringify(path)} && document.querySelector('main')
      && !document.querySelector('.spinner, [aria-busy="true"]')
      && ![...document.querySelectorAll('[role="status"]')].some(el => /yükleniyor/i.test(el.textContent))`, 60000);
    result.pages.push({ path, controlsMs, readyMs: Math.round(performance.now() - started),
      ...await browser.evalJs(`({requests: performance.getEntriesByType('resource')
        .filter(r => r.name.includes('/api/')).map(r => ({path: new URL(r.name).pathname + new URL(r.name).search,
          ms: Math.round(r.duration), bytes: r.decodedBodySize, transferredBytes: r.encodedBodySize})), alerts: [...document.querySelectorAll('[role="alert"]')].map(el => el.textContent)})`) });
  }
  result.apis = await browser.evalJs(`Promise.all([
    '/api/learning-resources/metadata', '/api/questions/category-counts?bank=OGM',
    '/api/questions/availability?bank=OGM', '/api/questions/filters?bank=OGM', '/api/questions/pool-summary'
  ].map(async path => {
    const start = performance.now(); const response = await fetch(path); const text = await response.text();
    return {path, status: response.status, ms: Math.round(performance.now() - start), bytes: text.length};
  }))`);
  result.errors = browser.errors;
  result.failedRequests = browser.failedRequests.filter(r => !/\/api\/auth\/me|favicon\.ico/.test(r.url || ''));
} finally { browser.close(); }
const output = process.argv[2];
if (output) { fs.mkdirSync(dirname(output), {recursive: true}); fs.writeFileSync(output, JSON.stringify(result, null, 2)); }
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.errors?.length || result.failedRequests?.length || result.pages.some(p => p.alerts.length) ? 1 : 0;
