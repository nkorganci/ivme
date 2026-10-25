// Ekran görüntüsü yerine yapılandırılmış sayfa denetimi: bir sayfayı yerel test
// hesabıyla açar ve AI'nın okuyacağı kısa JSON üretir. Ekran görüntüsü yalnız sorun
// bulunduğunda (veya --ekran ile) kaydedilir.
//
//   node testler/sayfa-denetle.mjs /dersler-ve-konular [--rol student|admin|teacher|parent|operator]
//        [--mobil] [--bekle "metin"] [--icerir "metin" ...] [--metin 1500] [--ekran] [--tablo-tara]
import fs from 'node:fs';
import { join } from 'node:path';
import { tarayiciAc } from './lib/tarayici.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const options = (name) => args.flatMap((arg, i) => arg === name ? [args[i + 1]] : []);
const valued = new Set(['--rol', '--bekle', '--icerir', '--metin']);
// İlk seçenek olmayan argüman yoldur. Git Bash '/yol' argümanını 'C:/Program Files/Git/yol'
// yapabilir; o önek geri alınır (scripts/ivme.py üzerinden çağrıda bu sorun yoktur).
const rawPath = args.find((arg, i) => !arg.startsWith('--') && !valued.has(args[i - 1])) || '/';
const path = '/' + rawPath.replace(/^[A-Za-z]:\/.*?\/Git\//, '').replace(/^\/+/, '');
const role = option('--rol', 'student');
const mobile = args.includes('--mobil');
const waitFor = option('--bekle');
const mustContain = options('--icerir');
const textLimit = Number(option('--metin', 1500));

const browser = await tarayiciAc({ mobile });
const report = { path, role, viewport: mobile ? '390x844 mobil' : '1280x900', ok: true, problems: [] };
try {
  await browser.goto('/');
  if (role !== 'yok') await browser.login(role);
  await browser.goto(path);
  await browser.wait(waitFor ? `document.body.innerText.includes(${JSON.stringify(waitFor)})`
    : 'document.querySelector("main, #root > *") && !document.querySelector(".loading, [aria-busy=true]")');
  await browser.wait('!document.querySelector(".ag-root-wrapper") || document.querySelector('
    + '".ag-row, .ag-overlay-no-rows-wrapper")', 15000).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 600));
  Object.assign(report, await browser.evalJs(`(() => {
    const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const overflow = [...document.querySelectorAll('body *')].filter(el => visible(el)
      && el.getBoundingClientRect().right > innerWidth + 2 && !el.closest('.ag-root-wrapper, [data-allow-overflow]'))
      .slice(0, 8).map(el => (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''))
        + ' sağ=' + Math.round(el.getBoundingClientRect().right));
    return {
      url: location.pathname + location.search,
      title: document.title,
      headings: [...document.querySelectorAll('h1, h2, h3')].filter(visible).map(h => h.textContent.trim()).slice(0, 15),
      buttons: [...document.querySelectorAll('button')].filter(visible).map(b => b.textContent.trim()).filter(Boolean).slice(0, 25),
      grids: [...document.querySelectorAll('.ag-root-wrapper')].map(g => ({
        headers: [...g.querySelectorAll('.ag-header-cell-text')].map(h => h.textContent.trim()),
        renderedRows: new Set([...g.querySelectorAll('.ag-row')].map(r => r.getAttribute('row-index'))).size })),
      horizontalPageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      overflowingElements: overflow,
      text: (document.querySelector('main') || document.body).innerText.replace(/\\n{2,}/g, '\\n').slice(0, ${textLimit}),
    };
  })()`));
  if (args.includes('--tablo-tara')) report.gridClipping = await browser.clippedGridCells();
} catch (error) {
  report.problems.push('Açılış: ' + error.message);
}
report.consoleErrors = browser.errors.slice(0, 10);
report.failedRequests = browser.failedRequests.filter(r => !/\/api\/auth\/me|favicon\.ico/.test(r.url || '')).slice(0, 10);
for (const text of mustContain) if (!report.text?.includes(text)) report.problems.push(`Metin yok: ${text}`);
if (report.consoleErrors.length) report.problems.push(`${report.consoleErrors.length} konsol hatası`);
if (report.failedRequests.length) report.problems.push(`${report.failedRequests.length} başarısız istek`);
if (report.horizontalPageOverflow) report.problems.push('Sayfa yatay taşıyor');
for (const grid of report.gridClipping || []) if (grid.clipped) report.problems.push(`Tablo ${grid.grid}: ${grid.clipped} kırpılmış hücre`);
report.ok = report.problems.length === 0;
if (!report.ok || args.includes('--ekran')) {
  const dir = join(process.cwd(), 'veri', 'ui-denetim');
  fs.mkdirSync(dir, { recursive: true });
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}${mobile ? '-mobil' : ''}.png`;
  try { report.screenshot = await browser.screenshot(join(dir, name)); } catch {}
}
browser.close();
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
