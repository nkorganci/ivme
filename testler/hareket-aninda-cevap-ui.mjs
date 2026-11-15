import assert from 'node:assert/strict';
import { tarayiciAc, pause } from './lib/tarayici.mjs';
import { practiceFixture } from './lib/practice-fixture.mjs';
// Practice API'si tarayıcıda taklit edilir; cevap/REVEAL kayıtları DB'ye yazılmaz.
const b = await tarayiciAc({ mobile: process.argv.includes('--mobil') });
try {
  await practiceFixture(b);
  await b.goto('/'); await b.login('student');
  await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket?bolum=osym');
  await b.wait('Array.isArray(window.__practiceEvents)');
  await b.wait(`document.querySelector('.kp-v2-ana .choices button:not(:disabled)')`);
  await b.evalJs(`document.querySelector('.kp-v2-ana .choices button').click()`);
  await b.wait(`document.querySelector('.kp-v2-ana .kp-geri')?.textContent.includes('Doğru cevap: C')`);
  assert.deepEqual(await b.evalJs('window.__practiceEvents'), ['ANSWER','REVEAL']);
  await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket?bolum=gercek');
  await b.wait(`document.querySelector('.kp-kod-liste a')`);
  assert.ok(await b.evalJs(`[...document.querySelectorAll('.kp-kod-liste a')].every(a=>a.search==='?ogrenme=fizik-hareket')`));
  for (const mode of ['normal','hareket','retry']) {
    await b.goto('/soru/TYT-0910' + (mode === 'normal' ? '' : '?ogrenme=fizik-hareket'));
    await b.wait('Array.isArray(window.__practiceEvents)');
    await b.wait(`document.querySelector('.choices button:not(:disabled)')`);
    if (mode === 'retry') await b.evalJs('window.__failReveal = true');
    await b.evalJs(`document.querySelector('.choices button').click()`);
    if (mode === 'normal') {
      await pause(400);
      assert.deepEqual(await b.evalJs('window.__practiceEvents'),['ANSWER']);
    } else {
      if (mode === 'retry') {
        await b.wait(`window.__practiceEvents.includes('REVEAL')`); await pause(400);
        assert.deepEqual(await b.evalJs('window.__practiceEvents'),['ANSWER','REVEAL']);
        await b.evalJs(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Cevabı göster').click()`);
      }
      await b.wait(`document.querySelector('.choices .correct')?.textContent.includes('C')`);
      assert.deepEqual(await b.evalJs('window.__practiceEvents'),mode === 'retry' ? ['ANSWER','REVEAL','REVEAL'] : ['ANSWER','REVEAL']);
    }
  }
  assert.deepEqual(b.errors, []);
  console.log(JSON.stringify({status:'PASS',checks:['ÖSYM seçimi sonrası cevap','Gerçek soru bağlantılarında Hareket kapsamı','Hareket soru sayfasında otomatik cevap','Normal soru sayfasında mevcut davranış','Geçici cevap hatasında döngüsüz yeniden deneme'],dbWrites:0}));
} finally { await b.close(); }
