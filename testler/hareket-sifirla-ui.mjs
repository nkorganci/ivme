import assert from 'node:assert/strict';
import { tarayiciAc } from './lib/tarayici.mjs';
import { practiceFixture } from './lib/practice-fixture.mjs';
const b = await tarayiciAc({ mobile: process.argv.includes('--mobil') });
const path = '/konuyu-ogrenelim/ogren/fizik-hareket';
try {
  await practiceFixture(b);
  await b.goto('/'); await b.login('student'); await b.goto(path);
  await b.wait(`document.querySelector('.kp-test-sayac')`);
  await b.wait('Array.isArray(window.__practiceEvents)');
  const user = await b.evalJs(`(async()=>{const r=await(await fetch('/api/auth/me')).json();return (r.user||r).id})()`);
  const key = `ivme:konu-paketi:fizik-hareket:${user}:v2:r3`;
  const preserved = [key.replace(':r3',':r2'),key.replace(String(user)+':v2','other-user:v2'),key.replace('fizik-hareket','diger-konu')];
  const fixture = {on:{sira:5,cevaplar:{a:'b'},sonuc:{puan:50}},son:{sonuc:{puan:70}},ak:{'AK-1':true},'kime-gore':{0:{ilk:true}},_sorular:{sample:'selected'},_setTur:2,_setGecmisi:[{tur:1}],_kayit:[{ilk:false}],osym:{sample:{ilk:true}}};
  async function seed(section='on') {
    await b.evalJs(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(fixture))});${JSON.stringify(preserved)}.forEach(k=>localStorage.setItem(k,'korunacak'))`);
    await b.goto(path+'?bolum='+section); await b.wait(`document.querySelector('.kp-v2-ana')`);
  }
  async function click(label) {
    await b.evalJs(`(()=>{const x=[...document.querySelectorAll('button')].find(b=>b.textContent===${JSON.stringify(label)});if(!x||x.disabled)throw Error('Düğme yok: '+${JSON.stringify(label)});x.click()})()`);
  }
  const stored=()=>b.evalJs(`localStorage.getItem(${JSON.stringify(key)})`);
  await seed();
  await click('İlerlemeyi sıfırla'); await b.wait(`document.querySelector('[role=dialog]')`);
  assert.ok(await b.evalJs('document.documentElement.scrollWidth<=innerWidth+1'));
  await click('Vazgeç'); await b.wait(`!document.querySelector('[role=dialog]')`);
  assert.deepEqual(JSON.parse(await stored()),fixture);
  for(const section of ['on','kime-gore','ak']) {
    await seed(section);
    await click('İlerlemeyi sıfırla'); await b.wait(`document.querySelector('[role=dialog]')`);
    await click('Sıfırla ve yeniden başla');
    await b.wait(`document.querySelector('.kp-test-sayac')?.textContent==='Soru 1 / 10 · 0 soru yanıtlandı'`);
    assert.equal(await stored(),null);
    assert.equal(await b.evalJs(`document.querySelectorAll('.kp-v2-ana [aria-pressed=true]').length`),0);
    assert.ok(await b.evalJs(`[...document.querySelectorAll('.kp-v2-ana button')].find(b=>b.textContent==='Bitir').disabled`));
    assert.equal(await b.evalJs(`document.querySelectorAll('.kp-yol button:disabled').length`),0);
    assert.ok(await b.evalJs(`${JSON.stringify(preserved)}.every(k=>localStorage.getItem(k)==='korunacak')`));
    await b.goto(path);await b.wait(`document.querySelector('.kp-test-sayac')?.textContent==='Soru 1 / 10 · 0 soru yanıtlandı'`);
  }
  await seed();
  await b.evalJs(`Storage.prototype.removeItem=function(){throw Error('fixture: storage denied')}`);
  await click('İlerlemeyi sıfırla');await b.wait(`document.querySelector('[role=dialog]')`);
  await click('Sıfırla ve yeniden başla');await b.wait(`document.querySelector('[role=dialog] [role=alert]')`);
  assert.deepEqual(JSON.parse(await stored()),fixture);
  await b.goto(path);
  await b.wait(`document.querySelector('.kp-v2-ana')`);
  assert.ok(await b.evalJs('document.documentElement.scrollWidth<=innerWidth+1'));
  assert.deepEqual(b.errors,[]);
  console.log(JSON.stringify({status:'PASS',checks:['Vazgeç ilerlemeyi korur','Ön test, durak ve araç kutusundan sıfırlama','Cevap, sonuç, soru ve tur kayıtları temizlenir','Diğer kullanıcı/konu ve eski pilot korunur','Yenilemede sıfır durum korunur','Depolama hatasında kayıt korunur'],dbWrites:0}));
} finally { await b.close(); }
