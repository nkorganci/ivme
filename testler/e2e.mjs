// Uçtan uca tarayıcı testi (başsız Chrome + CDP). Gereksinim: Chrome, Node >= 22,
// çalışan arka yüz (8081) ve ön yüz (5173) — uygulama\baslat.bat.
// Kullanım: node uygulama/testler/e2e.mjs [çıktı klasörü] [--mobil]
// Akış: kayıt → koleksiyonlar → soru → sınav → sonuç → geçmiş → geri bildirim; kimlik bilgileri verilirse ayrı rol ekranları.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BASE = process.env.YKS_SITE || 'http://localhost:5173';
if (!['localhost', '127.0.0.1'].includes(new URL(BASE).hostname)) {
  throw new Error('E2E kayıt/geri bildirim üretir; yalnız yerel test sunucusunda çalıştır.');
}
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const mobil = process.argv.includes('--mobil');
const out = path.resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'hedefyks-e2e'));
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9300 + Math.floor(Math.random() * 300);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hedefyks-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-gpu', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

let wsUrl;
for (let i = 0; i < 80 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page')?.webSocketDebuggerUrl; }
  catch { await sleep(250); }
}
const ws = new WebSocket(wsUrl);
let seq = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') problems.push('İSTİSNA ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
  if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) {
    problems.push(d.params.type + ' ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
  }
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') problems.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'ifade hatası: ' + expression);
  return r.result?.result?.value;
};
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
// "Sayfadan ayrılmak istiyor musun?" (sınav sayfasındaki beforeunload) penceresi otomatik kabul edilir
const onDialog = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true });
};
ws.addEventListener('message', onDialog);
await send('Emulation.setDeviceMetricsOverride', mobil
  ? { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
  : { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const checks = [];
const ok = (name, cond, extra = '') => { checks.push(cond); console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : ' ' + extra)); };
const text = () => ev('document.body.innerText');
const waitFor = async (expr, what, ms = 8000) => {
  for (let t = 0; t < ms; t += 150) { if (await ev(`!!(${expr})`)) return true; await sleep(150); }
  ok('Bekleme: ' + what, false, '(zaman aşımı) sayfa: ' + (await ev('location.pathname')) + ' — ' + String(await text()).slice(0, 200).replace(/\n/g, ' | ') + ' — ' + problems.slice(-2).join(' | ').slice(0, 500));
  return false;
};
const waitText = (t, ms) => waitFor(`document.body.innerText.includes(${JSON.stringify(t)})`, `"${t}" metni`, ms);
const shot = async (name) => {
  const s = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(out, `${mobil ? 'm-' : ''}${name}.png`), Buffer.from(s.result.data, 'base64'));
};
const go = async (p) => { await send('Page.navigate', { url: BASE + p }); await sleep(700); };
const clickText = async (label, sel = 'button, a') => {
  const done = await ev(`(() => { const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.offsetParent && e.innerText.trim().includes(${JSON.stringify(label)}) && !e.disabled); if (!el) return false; el.click(); return true; })()`);
  if (!done) ok(`Tıklanacak öğe bulundu: "${label}"`, false);
  return done;
};
const fill = async (label, value) => {
  const found = await ev(`(() => { const l = [...document.querySelectorAll('label')].find(l => l.innerText.trim().startsWith(${JSON.stringify(label)})); const el = l && document.getElementById(l.htmlFor); if (!el) return false; el.focus(); el.select && el.select(); return true; })()`);
  if (!found) { ok(`Alan bulundu: "${label}"`, false); return; }
  await send('Input.insertText', { text: String(value) });
};

const stamp = Date.now().toString(36);
const user = `test${stamp}`;
const pass = `E2e-${randomBytes(18).toString('base64url')}`;
const phone = `+905${Date.now().toString().slice(-9)}`;

console.log(`E2E başladı (${mobil ? 'mobil' : 'masaüstü'}) → ${out}`);

// ---------------------------------------------------------------- giriş / kayıt
await go('/cikmis-sorular');                        // oturumsuz → girişe yönlenmeli, geri dönülmeli
await waitFor("location.pathname === '/giris'", 'girişe yönlendirme');
ok('Oturumsuz kullanıcı /giris sayfasına yönlendirildi', (await ev('location.pathname')) === '/giris');
await shot('01-giris');
await clickText('Kayıt', 'a');
await waitFor("location.pathname === '/kayit'", 'kayıt sayfası');
await fill('Kullanıcı adı', user); await fill('E-posta', `${user}@example.com`); await fill('Cep telefonu', phone); await fill('Şifre', pass); await fill('Şifre (tekrar)', pass);
await shot('02-kayit');
await clickText('Kayıt ol', 'button');
await waitFor("location.pathname !== '/kayit'", 'kayıt sonrası yönlenme', 10000);
await go('/');
await waitText('Merhaba,', 8000);
let t = await text();
ok('Kayıttan sonra ana sayfa kişisel başlıkla açıldı', t.includes('Merhaba,') && t.toLowerCase().includes(user), t.slice(0, 160));
ok('Sekme başlığı kullanıcı adını ve uygulama adını içeriyor', (await ev('document.title')).toLowerCase().includes(user) && (await ev('document.title')).includes('Hedef YKS'), await ev('document.title'));
await shot('03-ana-sayfa');
// sol menü: masaüstünde sabit menü, mobilde hamburger ile açılan çekmece (öğeler DOM'da her durumda vardır)
if (mobil) { await clickText('', 'header.mobilebar button'); await sleep(300); }
const menuLabels = await ev("[...document.querySelectorAll('.sidebar .sidenav a')].map((a) => a.getAttribute('aria-label'))");
ok('Sol menü öğeleri sırasıyla geldi', ['Ana Sayfa', 'AYT-TYT Çıkmış Sorular', 'Soru Bankası', 'Sınav Başlat', 'Geçmişim', 'Geri Bildirim'].every((l, i) => menuLabels[i] === l), JSON.stringify(menuLabels));
await shot('03b-sol-menu');
if (mobil) await ev("document.querySelector('.scrim')?.click()");

// ---------------------------------------------------------------- AYT-TYT Çıkmış Sorular ve soru çözme
await go('/cikmis-sorular');
await waitText('TYT-0001', 8000);
t = await text();
ok('Çıkmış sorular listesi geldi (kod görünüyor)', t.includes('TYT-0001'));
await shot('04-cikmis-sorular');
await go('/sorular?examType=TYT');                 // eski adres yeni rotaya, sorgu korunarak yönlenir
await waitFor("location.pathname === '/cikmis-sorular'", 'eski /sorular adresinin yönlenmesi');
ok('Eski /sorular adresi /cikmis-sorular rotasına yönlendi', (await ev('location.pathname + location.search')) === '/cikmis-sorular?examType=TYT', await ev('location.pathname + location.search'));
await go('/soru/TYT-0001');
await waitFor("document.querySelector('.choices')", 'şık düğmeleri');
await sleep(800);
ok('Soru görseli yüklendi', await ev("(() => { const i = document.querySelector('img[src*=\"/api/questions/\"][src$=\"/image\"]'); return !!i && i.complete && i.naturalWidth > 50; })()"));
await clickText('', '.choice');                                            // ilk şık (A)
await ev("document.querySelector('.choice').click()");
await clickText('Cevabı Kontrol Et');
await waitFor("document.querySelector('.choice.correct')", 'doğru şık işareti');
ok('Cevap kontrolünde doğru şık vurgulandı', await ev("!!document.querySelector('.choice.correct')"));
ok('Video çözüm bağlantısı göründü', (await text()).includes('Video'));
await shot('05-soru-detay');
// değerlendirme: Zor + 4 yıldız → Kaydet → topluluk özeti güncellenir (yan paneldeki katlanır bölümler önce açılır)
await ev("document.querySelectorAll('.qside details').forEach((d) => { d.open = true; })");
await sleep(200);
await ev("document.querySelectorAll('.segmented input[type=radio]')[2].click()");
await ev("document.querySelector('button[aria-label=\"4 yıldız\"]').click()");
await clickText('Kaydet', 'button');
await waitText('Değerlendirmen kaydedildi', 6000);
ok('Soru değerlendirmesi kaydedildi', (await text()).includes('Değerlendirmen kaydedildi'));
await shot('05b-degerlendirme');
await clickText('Sonraki');
await sleep(900);
ok('Sonraki soruya geçildi', (await ev('location.pathname')) !== '/soru/TYT-0001', await ev('location.pathname'));

// ---------------------------------------------------------------- Soru Bankası (OGM koleksiyonu)
await go('/soru-bankasi');
await waitText('sb-20139', 8000);
ok('Soru Bankası listesi geldi (sb-20139 kodu görünüyor)', (await text()).includes('sb-20139'));
await shot('05c-soru-bankasi');
await go('/soru/sb-20139?bank=OGM');
await waitFor("document.querySelector('.choices')", 'Soru Bankası sorusunun şıkları');
await sleep(600);
t = await text();
ok('Soru Bankası sorusu açıldı (geri bağlantısı koleksiyon adını söylüyor)', t.includes('← Soru Bankası'), t.slice(0, 160).replace(/\n/g, ' | '));
await shot('05d-soru-bankasi-soru');

// ---------------------------------------------------------------- sınav
await go('/sinav/yeni');
await waitText('Sınavı Başlat', 8000);
await shot('06-sinav-baslat');
await fill('Soru sayısı', '5');
await clickText('Sınavı Başlat', 'button');
await waitFor("/^\\/sinav\\/\\d+$/.test(location.pathname)", 'sınav sayfası', 10000);
await waitFor("document.querySelector('.choices')", 'sınav şıkları');
await sleep(600);
const examPath = await ev('location.pathname');
ok('Sınav oluşturuldu: ' + examPath, /^\/sinav\/\d+$/.test(examPath));
await shot('07-sinav');
await ev("document.querySelector('.choice').click()");                      // 1. soru: A
await sleep(400);
await clickText('Sonraki', 'button'); await sleep(300);
await ev("document.querySelectorAll('.choice')[1].click()");                // 2. soru: B
await sleep(500);
ok('Sınav sırasında doğru cevap görünmüyor', !(await ev("!!document.querySelector('.choice.correct, .choice.wrong')")));
await shot('08-sinav-cevapli');
await clickText('Sınavı Bitir', 'button');
await sleep(400);
await shot('09-sinav-bitir-onay');
await clickText('Evet, bitir', 'button');
await waitFor("/\\/sonuc$/.test(location.pathname)", 'sonuç sayfası', 10000);
await sleep(500);
t = await text();
ok('Sonuç sayfası doğru/yanlış/boş sayılarını gösteriyor', /Doğru/.test(t) && /Yanlış/.test(t) && /Boş/.test(t), t.slice(0, 200));
ok('Sonuç başlığı kullanıcı adını içeriyor', t.toLowerCase().includes(user));
await shot('10-sonuc');

// ---------------------------------------------------------------- geçmiş, geri bildirim, hesap
await go('/gecmis');
await waitText('soru', 8000);
t = await text();
ok('Sınav geçmişinde kayıt var (soru / doğru / yanlış / boş)', /\d+ soru/.test(t) && /\d+ doğru/.test(t) && /\d+ yanlış/.test(t) && /\d+ boş/.test(t), t.slice(0, 300));
await shot('11-gecmis');
await go('/geri-bildirim');
await waitText('görüş', 8000);
await fill('Mesaj', 'Arayüz çok güzel, sade ve anlaşılır olmuş.');
await clickText('Gönder', 'button');
await waitText('Teşekkür', 8000);
ok('Genel geri bildirim gönderildi', (await text()).includes('Teşekkür'));
await shot('12-geri-bildirim');
await go('/hesap'); await sleep(500); await shot('13-hesap');

// ---------------------------------------------------------------- yönetici
// Yetkili hesaplar yalnız açıkça ortam değişkeniyle verilirse denenir; parolalar çıktı dosyasına yazılmaz.
if (process.env.YKS_E2E_YONETICI && process.env.YKS_E2E_YONETICI_SIFRE) {
await ev("fetch('/api/auth/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN': (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '' } })");
await sleep(400);
await go('/giris');
await waitFor("document.querySelector('input')", 'giriş formu');
await fill('Kullanıcı adı veya e-posta', process.env.YKS_E2E_YONETICI); await fill('Şifre', process.env.YKS_E2E_YONETICI_SIFRE);
await clickText('Giriş yap', 'button');
await waitFor("location.pathname === '/yonetim'", 'yönetici girişi', 10000);
await go('/yonetim');
await waitText('Kullanıcı', 8000);
await sleep(600);
ok('Yönetim özeti açıldı', /Kullanıcı/.test(await text()) && /Soru/.test(await text()));
await shot('14-yonetim-ozet');
}
if (process.env.YKS_E2E_OPERATOR && process.env.YKS_E2E_OPERATOR_SIFRE) {
await ev("fetch('/api/auth/logout', { method: 'POST', headers: { 'X-XSRF-TOKEN': (document.cookie.match(/XSRF-TOKEN=([^;]+)/) || [])[1] || '' } })");
await sleep(400);
await go('/giris');
await waitFor("document.querySelector('input')", 'operatör giriş formu');
await fill('Kullanıcı adı veya e-posta', process.env.YKS_E2E_OPERATOR); await fill('Şifre', process.env.YKS_E2E_OPERATOR_SIFRE);
await clickText('Giriş yap', 'button');
await waitFor("location.pathname === '/icerik-bakimi'", 'operatör girişi', 10000);
await go('/icerik-bakimi?sekme=sorular');
await waitText('TYT-0001', 8000);
await shot('15-yonetim-sorular');
await clickText('Düzenle');
await sleep(800);
ok('Soru düzenleme paneli açıldı (doğru cevap alanı var)', (await text()).includes('Doğru cevap'));
await shot('16-yonetim-duzenle');
await go('/icerik-bakimi?sekme=bildirimler'); await sleep(1200);
ok('Bildirimler listesinde kullanıcının mesajı var', (await text()).includes('Arayüz çok güzel'));
await shot('17-yonetim-bildirimler');
await go('/icerik-bakimi?sekme=iceaktar'); await sleep(600); await shot('18-yonetim-iceaktar');
}

// ---------------------------------------------------------------- sonuç
const hatalar = problems.filter((p) => !/Failed to load resource.*(401|404)/.test(p));
ok('Konsolda hata yok', hatalar.length === 0, '\n    ' + hatalar.slice(0, 8).join('\n    '));
const basarisiz = checks.filter((c) => !c).length;
console.log(`\n${checks.length - basarisiz}/${checks.length} denetim başarılı. Ekran görüntüleri: ${out}`);
ws.close(); chrome.kill();
setTimeout(() => process.exit(basarisiz ? 1 : 0), 300);
