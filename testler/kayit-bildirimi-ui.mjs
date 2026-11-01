// TAS-10 UI acceptance. Notification fetches are replaced in this browser only;
// no real registration, outbox mutation or external email is produced.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tarayiciAc } from './lib/tarayici.mjs';

const reports = [];
for (const mobile of [false, true]) {
  const browser = await tarayiciAc({ mobile });
  try {
    await browser.goto('/giris'); // Avoid racing the home page's automatic student login.
    await browser.login('admin');
    const source = `(() => {
      const original = window.fetch.bind(window);
      const now = new Date().toISOString();
      const recent = ['FAILED','PENDING','PROCESSING','RETRY','ACCEPTED'].map((status, i) => ({
        id: i + 1, userId: i + 100, status, attempts: 1, nextAttemptAt: now, createdAt: now,
        errorCode: status === 'FAILED' ? 'HTTP_401' : null,
        providerMessageId: status === 'ACCEPTED' ? 'fake-provider-id' : null,
      }));
      window.__notificationRetries = 0;
      window.fetch = async (input, options = {}) => {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('/api/admin/accounts/registration-notifications')) {
          if (options.method === 'POST') {
            if (!url.endsWith('/1/retry')) throw Error('Unexpected fake retry: ' + url);
            window.__notificationRetries++;
            recent[0].status = 'RETRY';
            return new Response(null, { status: 204 });
          }
          return new Response(JSON.stringify({ configured: false, waiting: 3 + window.__notificationRetries,
            failed: 1 - window.__notificationRetries, accepted: 1, recent }),
            { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        return original(input, options);
      };
    })()`;
    await browser.cdp('Page.addScriptToEvaluateOnNewDocument', { source });
    await browser.goto('/yonetim');
    await browser.wait(`document.body.innerText.includes('3 gönderim bekliyor')`);
    assert.ok(await browser.evalJs(`document.body.innerText.includes('E-posta kurulumu bekleniyor')`));
    await browser.evalJs(`document.querySelector('[aria-label="Yeni kayıt bildirimleri"] summary').click()`);
    await browser.wait(`document.querySelector('[aria-label="Yeni kayıt bildirimleri"] .ag-row')`);
    const text = await browser.evalJs(`document.querySelector('[aria-label="Yeni kayıt bildirimleri"]').innerText`);
    for (const label of ['Başarısız', 'Gönderim bekliyor', 'Gönderiliyor', 'Tekrar denenecek', 'Sağlayıcı kabul etti'])
      assert.ok(text.includes(label), label);
    await browser.evalJs(`document.querySelectorAll('[aria-label="Yeni kayıt bildirimleri"] .ag-body-horizontal-scroll-viewport').forEach(el => { el.scrollLeft = el.scrollWidth; });`);
    await browser.wait(`[...document.querySelectorAll('[aria-label="Yeni kayıt bildirimleri"] button')].some(b => b.textContent === 'Yeniden dene')`);
    await browser.evalJs(`[...document.querySelectorAll('[aria-label="Yeni kayıt bildirimleri"] button')].find(b => b.textContent === 'Yeniden dene').click()`);
    await browser.wait(`window.__notificationRetries === 1 && document.body.innerText.includes('4 gönderim bekliyor')`);
    assert.equal(await browser.evalJs(`document.documentElement.scrollWidth > innerWidth + 1`), false, 'Page overflow');
    assert.deepEqual(browser.errors, []);
    // Existing shell permission gap: SecurityConfig routes preferences to USER only.
    // Keep it visible in the report; it is unrelated to the notification API.
    const knownFailures = browser.failedRequests.filter(r => r.status === 403 && r.url?.endsWith('/api/preferences/sidebar-rail'));
    const failures = browser.failedRequests.filter(r => !r.url?.includes('/api/auth/me') && !r.url?.endsWith('/favicon.ico') && !knownFailures.includes(r));
    assert.deepEqual(failures, []);
    reports.push({ viewport: mobile ? 'mobile' : 'desktop', ok: true, statuses: 5, retried: 1, knownFailures });
    console.log(JSON.stringify(reports.at(-1)));
  } catch (error) {
    console.error(JSON.stringify({ viewport: mobile ? 'mobile' : 'desktop', error: error.message,
      page: await browser.evalJs(`({ path: location.pathname, notification: document.querySelector('[aria-label="Yeni kayıt bildirimleri"]')?.innerText })`),
      consoleErrors: browser.errors, failedRequests: browser.failedRequests }));
    throw error;
  } finally { browser.close(); }
}
fs.mkdirSync('veri/ui-denetim', { recursive: true });
fs.writeFileSync('veri/ui-denetim/kayit-bildirimi.json', JSON.stringify(reports, null, 2) + '\n');
console.log(JSON.stringify(reports));
