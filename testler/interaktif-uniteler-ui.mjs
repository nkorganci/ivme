// İnteraktif Öğrenme: bütün modül ünitelerinin duman denetimi (yerel 1010).
// Her dersin sekmesinden üniteleri bulur; laboratuvarı açar, her sınav sorusunu laboratuvara aktarır,
// bir şık seçip sonucu gösterir, kalıplar ve çıkmış sorular sekmelerini açar. Konsol hatası ve taşma raporlanır.
// Kullanım: node testler/interaktif-uniteler-ui.mjs [ders/ünite ...]   (ör. matematik/fonksiyonlar)
import fs from 'node:fs';
import { join } from 'node:path';
import { pause, tarayiciAc } from './lib/tarayici.mjs';

const only = process.argv.slice(2);
const out = 'veri/ui-denetim/interaktif-uniteler';
fs.mkdirSync(out, { recursive: true });
const browser = await tarayiciAc();
const { cdp, evalJs, wait, goto } = browser;
const report = { units: [], problems: [] };

async function shot(name, width = 1440) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await pause(200);
  const height = await evalJs('Math.ceil(document.documentElement.scrollHeight)');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: Math.min(height, 6000), deviceScaleFactor: 1, mobile: width < 600 });
  await pause(400);
  await browser.screenshot(join(out, name));
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
}
const errorsBefore = () => browser.errors.length;

try {
  await browser.login('student');
  await goto('/interaktif-ogrenme');
  await wait('document.querySelector(".il-subject-tabs")');
  const subjects = await evalJs(`[...document.querySelectorAll('.il-subject-tabs a')].map(a => new URL(a.href).searchParams.get('ders'))`);
  const units = [];
  for (const subject of subjects) {
    await goto(`/interaktif-ogrenme?ders=${subject}`);
    await wait('document.querySelector(".il-units")');
    units.push(...await evalJs(`[...document.querySelectorAll('.il-unit a.btn')].map(a => new URL(a.href).pathname.replace('/interaktif-ogrenme/', ''))`));
  }
  for (const unit of units) {
    if (unit === 'fizik/hareket' || (only.length && !only.includes(unit))) continue;
    const entry = { unit, questions: 0, answered: 0, errors: [] };
    const start = errorsBefore();
    const slug = unit.replace('/', '-');
    await goto(`/interaktif-ogrenme/${unit}?tab=lab`);
    await wait('document.querySelector(".mu-lab") && !document.querySelector(".loading")', 30000);
    await pause(400);
    await shot(`${slug}-1-lab.png`);
    await goto(`/interaktif-ogrenme/${unit}?tab=sorular`);
    await wait('document.querySelector(".qr")', 30000);
    const count = await evalJs('document.querySelectorAll(".st-list-item").length');
    entry.questions = count;
    for (let i = 0; i < count; i += 1) {
      await evalJs(`document.querySelectorAll('.st-list-item')[${i}].click()`);
      await pause(250);
      await evalJs(`[...document.querySelectorAll('.qr .st-option')][0].click()`);
      await evalJs(`[...document.querySelectorAll('.qr-build .btn')][0].click()`);
      await pause(250);
      await evalJs(`[...document.querySelectorAll('.qr .btn-primary')].find(b => b.textContent.includes('Sonucu'))?.click()`);
      await wait('document.querySelector(".qr .st-ok, .qr .st-bad")');
      entry.answered += 1;
      if (i === 0) await shot(`${slug}-2-soru.png`);
    }
    for (const tab of ['kaliplar', 'cikmis']) {
      await goto(`/interaktif-ogrenme/${unit}?tab=${tab}`);
      await wait(tab === 'kaliplar' ? 'document.querySelector(".pm-grid")' : 'document.querySelector(".mu-past")', 30000);
    }
    await goto(`/interaktif-ogrenme/${unit}?tab=lab`);
    await wait('document.querySelector(".mu-lab")', 30000);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
    await pause(500);
    const overflow = await evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    if (overflow > 1) entry.errors.push(`mobil taşma ${overflow}px`);
    await shot(`${slug}-3-mobil.png`, 390);
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    entry.errors.push(...browser.errors.slice(start));
    if (entry.errors.length) report.problems.push(`${unit}: ${entry.errors.join(' | ').slice(0, 400)}`);
    report.units.push(entry);
  }
  report.status = report.problems.length ? 'SORUN' : 'TAMAM';
} catch (error) {
  report.status = 'HATA';
  report.error = error.message;
  try { await browser.screenshot(join(out, 'hata.png')); } catch {}
  process.exitCode = 1;
} finally {
  report.failedRequests = browser.failedRequests.filter((r) => !/favicon/.test(r.url) && !(r.status === 401 && /\/api\/auth\/me$/.test(r.url)));
  browser.close();
  console.log(JSON.stringify(report, null, 2));
}
