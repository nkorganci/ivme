// İnteraktif Öğrenme UI kabulü (yerel 1010): giriş, laboratuvar, soru stüdyosu (iki soru uçtan uca),
// görevler ve kalıp haritası. Tam sayfa görüntüleri veri/ui-denetim/interaktif/ altına yazılır.
// Kullanım: node testler/interaktif-ogrenme-ui.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join } from 'node:path';
import { pause, tarayiciAc } from './lib/tarayici.mjs';

const out = 'veri/ui-denetim/interaktif';
fs.mkdirSync(out, { recursive: true });
const browser = await tarayiciAc();
const { cdp, evalJs, wait, goto } = browser;
const report = { checks: [], shots: [] };
const ok = (name) => report.checks.push(name);

async function shot(name, width = 1440, mobile = false) {
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile });
  await pause(200);
  const height = await evalJs('Math.ceil(document.documentElement.scrollHeight)');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: Math.min(height, 7000), deviceScaleFactor: 1, mobile });
  await pause(350);
  await browser.screenshot(join(out, name));
  await cdp('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile });
  report.shots.push(name);
}
const click = (expression) => evalJs(`(() => { const e = ${expression}; if (!e) throw Error('Öğe yok: ' + ${JSON.stringify(expression)}); e.click(); return true; })()`);
const byText = (selector, text) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.textContent.includes(${JSON.stringify(text)}))`;
async function pressOnNode(index, key, times) {
  for (let i = 0; i < times; i += 1) {
    await evalJs(`(() => { const n = document.querySelectorAll('.ml-graph-v .ml-node')[${index}]; n.focus();
      n.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); })()`);
    await pause(25);
  }
}
async function dragNode(index, dyPixels) {
  const box = await evalJs(`(() => { const c = document.querySelectorAll('.ml-graph-v .ml-node circle:last-child')[${index}];
    c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  for (let step = 1; step <= 8; step += 1) {
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y + (dyPixels * step) / 8, button: 'left', buttons: 1 });
    await pause(20);
  }
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y + dyPixels, button: 'left', clickCount: 1 });
  await pause(100);
}

try {
  await browser.login('student');
  await goto('/interaktif-ogrenme');
  await wait('document.querySelector(".il-unit.ready")');
  assert.ok(await evalJs(`!!${byText('.sidenav a', 'İnteraktif Öğrenme')}`), 'sol menüde bağlantı');
  ok('giriş sayfası ve menü bağlantısı');
  await shot('01-giris.png');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=lab&hazir=ayt2023');
  await wait('document.querySelectorAll(".ml-graph svg").length === 3 && document.querySelector(".ml-stage svg")');
  await click(byText('.ml-event-chip', 'hızlar eşit'));
  await pause(200);
  const gap = await evalJs(`document.querySelector('.ml-relation').textContent`);
  assert.match(gap, /100 m/, 'AYT 2023: t=20 s ara 100 m');
  ok('laboratuvar olay çipi: t = 20 s ara 100 m');
  await click(byText('.ml-layer', 'Eğim'));
  await shot('02-laboratuvar-ayt2023.png');
  const before = await evalJs(`document.querySelector('.ml-segments li:nth-child(1)').textContent`);
  await dragNode(1, -40);
  const after = await evalJs(`document.querySelector('.ml-segments li:nth-child(1)').textContent`);
  assert.notEqual(before, after, 'sürükleme modeli değiştirdi');
  ok('v–t düğümü fareyle sürüklenince model değişti');
  await click(byText('.ml-play', 'Oynat'));
  await pause(1200);
  const playing = await evalJs(`document.querySelector('.ml-time strong').textContent`);
  assert.notEqual(playing, '0', 'oynatma zamanı ilerletti');
  ok(`oynatma çalışıyor (t = ${playing})`);

  await goto('/interaktif-ogrenme/fizik/hareket?tab=studyo&soru=iki-arac-alan');
  await wait('document.querySelector(".st-question") && document.querySelector(".st-mc")');
  await wait('document.querySelector(".st-question img")?.complete');
  await shot('03-studyo-oku.png');
  await click(byText('.st-option', 'altında kalan alana'));
  await wait(`document.querySelector('.st-ok')`);
  await click(byText('.st-nav .btn', 'Tahmine geç'));
  for (const [row, label] of [[0, 'Doğru'], [1, 'Yanlış'], [2, 'Yanlış']]) {
    await click(`[...document.querySelectorAll('.st-predict-row')[${row}].querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)})`);
  }
  assert.match(await evalJs(`document.querySelector('.st-derived').textContent`), /A\) Yalnız I/);
  ok('yargı tahmini şıkka çevrildi (A)');
  await click(byText('.st-nav .btn', 'Tahminimi kaydet'));
  await wait('document.querySelectorAll(".ml-graph-v .ml-node").length === 3');
  await click(byText('.st-build-panel .btn', 'Kontrol et'));
  assert.match(await evalJs(`document.querySelector('.st-build-panel .st-bad').textContent`), /t = 15 s noktası/);
  ok('yanlış model ilk farklı noktayı söyledi');
  // Kilitli t = 0 düğümleri .ml-node değildir: sıra K(15 s), K(30 s), L(30 s).
  await pressOnNode(0, 'ArrowUp', 20);
  await pressOnNode(2, 'ArrowUp', 20);
  await shot('04-studyo-model-kur.png');
  await click(byText('.st-build-panel .btn', 'Kontrol et'));
  await wait(`document.querySelector('.st-build-panel .st-ok')`);
  ok('klavyeyle kurulan model soruyla uyuştu');
  await click(byText('.st-nav .btn', 'Simüle et'));
  for (let i = 0; i < 3; i += 1) { await click(`document.querySelectorAll('.st-observe li button')[${i}]`); await pause(150); }
  await wait(`document.querySelector('.st-report')`);
  ok('üç kilit an ve karne');
  await click(`document.querySelectorAll('.st-observe li button')[1]`);
  await pause(200);
  await shot('05-studyo-gozle.png');
  await click(byText('.st-nav .btn', 'Mantığı kur'));
  await click(byText('.st-option', 'hiç negatif olmadı'));
  await click(byText('.st-nav .btn', 'İkiz soruya'));
  await click(byText('.st-option', 'B) 10'));
  await wait(`document.querySelector('.st-ok')`);
  await click('document.querySelector(".st-twin-lab summary")');
  await pause(300);
  await shot('06-studyo-ikiz.png');
  ok('ikiz soru doğru ve kaydedildi');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=studyo&soru=kesinlikle-karsi-ornek');
  await wait('document.querySelector(".st-mc")');
  await click(byText('.st-option', 'karşı örnek'));
  await click(byText('.st-nav .btn', 'Tahmine geç'));
  for (const [row, label] of [[0, 'Kesin değil'], [1, 'Kesin'], [2, 'Kesin']]) {
    await click(`[...document.querySelectorAll('.st-predict-row')[${row}].querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)})`);
  }
  await click(byText('.st-nav .btn', 'Tahminimi kaydet'));
  await wait('document.querySelectorAll(".ml-graph-v .ml-node").length === 4');
  await pressOnNode(0, 'ArrowDown', 10);
  await wait(`document.querySelectorAll('.st-found li.done').length === 1`);
  ok('I için karşı örnek bulundu (hızlanarak ileri)');
  await pressOnNode(3, 'ArrowDown', 25);
  await wait(`document.querySelectorAll('.st-found li.done').length === 2`);
  ok('II bozulunca koşul da bozuldu');
  await shot('07-studyo-karsi-ornek.png');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=studyo&soru=top-ve-tuy');
  await wait('document.querySelector(".st-mc")');
  await wait('document.querySelector(".st-question img")?.complete && document.querySelector(".st-question img").naturalWidth > 0');
  await click(byText('.st-option', 'yer çekimi'));
  await click(byText('.st-nav .btn', 'Tahmine geç'));
  for (const [row, label] of [[0, 'Farklı'], [1, 'Eşit'], [2, 'Eşit']]) {
    await click(`[...document.querySelectorAll('.st-predict-row')[${row}].querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(label)})`);
  }
  await click(byText('.st-nav .btn', 'Tahminimi kaydet'));
  await wait('document.querySelector(".st-params")');
  await evalJs(`(() => { const set = (i, v) => { const input = document.querySelectorAll('.st-params input')[i];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, v); input.dispatchEvent(new Event('input', { bubbles: true })); };
    set(0, '5'); set(1, '0'); set(2, '10'); })()`);
  await click(byText('.st-params .btn', 'Modeli kur'));
  await wait(`document.querySelector('.field-error')`);
  ok('işaret hatası (a = +10) yakalandı');
  await evalJs(`(() => { const input = document.querySelectorAll('.st-params input')[2];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '−10'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(byText('.st-params .btn', 'Modeli kur'));
  await wait('document.querySelector(".ml-svg-vertical")');
  await click(byText('.st-nav .btn', 'Simüle et'));
  await click(`document.querySelectorAll('.st-observe li button')[1]`);
  await pause(200);
  assert.match(await evalJs(`document.querySelector('.ml-readouts').textContent`), /10 N/);
  ok('serbest düşme: dikey sahne ve net kuvvet okuması');
  await shot('08-studyo-serbest-dusme.png');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=gorevler&gorev=eslestir');
  await wait('document.querySelector(".tk-goal")');
  await click(byText('.tk-goal .btn', 'Bir çözüm göster'));
  await wait(`document.querySelector('.tk-goal.done')`);
  ok('grafik eşleştirme görevi çözümle tamamlandı');
  await shot('09-gorev-eslestir.png');
  await goto('/interaktif-ogrenme/fizik/hareket?tab=gorevler&gorev=en-uzak');
  await wait('document.querySelector(".tk-moment")');
  await evalJs(`(() => { const input = document.querySelector('.ml-time input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '6'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(byText('.tk-moment .btn', 'Bu an'));
  await wait(`document.querySelector('.tk-goal.done')`);
  ok('"Bu an!" görevi t = 6 s ile tamamlandı');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=kaliplar');
  await wait('document.querySelectorAll(".pm-card").length === 8');
  await shot('10-kalip-haritasi.png');
  ok('kalıp haritası 8 kart');

  await goto('/interaktif-ogrenme/fizik/hareket?tab=lab&hazir=donen');
  await wait('document.querySelectorAll(".ml-graph svg").length === 3');
  await shot('11-mobil-laboratuvar.png', 390, true);
  const overflow = await evalJs('document.documentElement.scrollWidth - document.documentElement.clientWidth');
  assert.ok(overflow <= 1, `mobilde yatay taşma ${overflow}px`);
  ok('mobil: yatay taşma yok');

  report.errors = browser.errors;
  // Girişten önceki /api/auth/me 401'i ve favicon beklenen isteklerdir.
  report.failedRequests = browser.failedRequests.filter((r) => !/favicon/.test(r.url) && !(r.status === 401 && /\/api\/auth\/me$/.test(r.url)));
  report.status = report.errors.length || report.failedRequests.length ? 'UYARI' : 'TAMAM';
} catch (error) {
  report.status = 'HATA';
  report.error = error.message;
  report.errors = browser.errors;
  report.failedRequests = browser.failedRequests;
  try { await browser.screenshot(join(out, 'hata.png')); } catch {}
  process.exitCode = 1;
} finally {
  browser.close();
  console.log(JSON.stringify(report, null, 2));
}
