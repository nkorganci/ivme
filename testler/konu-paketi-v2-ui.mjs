// Yerel, yalıtılmış tarayıcı: ekran kapsamı için ilerleme fixture olarak eklenir; öğrenci kabul testi değildir.
import assert from 'node:assert/strict';
import { tarayiciAc } from './lib/tarayici.mjs';
import p from '../frontend/src/learn/konu/paketler/fizik-hareket.v2.js';
import {paketHazirla} from '../frontend/src/learn/konu/v2Kurallari.js';
import ak from '../frontend/src/learn/konu/paketler/arac-kutusu-fizik.js';
const b=await tarayiciAc({mobile:process.argv.includes('--mobil')});
try{
 await b.goto('/');await b.login('student');await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket');await b.wait('document.body.innerText.includes("Başlamadan önce")');
 const checks=[];
 checks.push(await b.evalJs(`({locked:[...document.querySelectorAll('.kp-yol button')].filter(b=>b.disabled).length,feedback:!!document.querySelector('.kp-v2-ana .kp-geri')})`));
 const button = label => `[...document.querySelectorAll('.kp-v2-ana button')].find(b=>b.textContent===${JSON.stringify(label)})`;
 assert.equal(await b.evalJs(`${button('Geri')}.disabled`),true);
 assert.equal(await b.evalJs(`${button('Bitir')}.disabled`),true);
 for(let i=0;i<p.kavramTesti.on.length;i++){
  await b.wait(`document.querySelector('.kp-test-sayac').textContent.startsWith('Soru ${i+1} / ${p.kavramTesti.on.length}')`);
  assert.equal(await b.evalJs(`document.querySelectorAll('.kp-v2-ana .kp-soru').length`),1);
  await b.evalJs(`document.querySelector('.kp-v2-ana .kp-secenekler button').click()`);
  await b.wait(`document.querySelector('.kp-v2-ana .kp-secenek[aria-pressed=true]')`);
  if(i===0){
   await b.evalJs(`${button('İleri')}.click()`);
   await b.wait(`document.querySelector('.kp-test-sayac').textContent.startsWith('Soru 2 /')`);
   await b.evalJs(`${button('Geri')}.click()`);
   await b.wait(`document.querySelector('.kp-v2-ana .kp-secenek[aria-pressed=true]')`);
   await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket');
   await b.wait(`document.querySelector('.kp-v2-ana .kp-secenek[aria-pressed=true]')`);
  }
  if(i+1<p.kavramTesti.on.length)await b.evalJs(`${button('İleri')}.click()`);
 }
 assert.equal(await b.evalJs(`${button('İleri')}.disabled`),true);
 assert.equal(await b.evalJs(`${button('Bitir')}.disabled`),false);
 checks.push(await b.evalJs(`({feedback:!!document.querySelector('.kp-v2-ana .kp-geri')})`));
 await b.evalJs(`${button('Bitir')}.click()`);
 await b.wait(`document.querySelector('.kp-v2-ana').textContent.includes('Test tamamlandı')`);

 await b.wait(`!document.querySelectorAll('.kp-yol button')[1].disabled`);
 const state={on:{sonuc:{puan:50,dogru:5,toplam:10}},ak:Object.fromEntries(ak.map(a=>[a.id,true]))};
 for(const d of paketHazirla(p).duraklar)state[d.id]=Object.fromEntries(d.bloklar.map((_,i)=>[i,{ilk:true}]));
 await b.evalJs(`(async()=>{const r=await(await fetch('/api/auth/me')).json();const u=r.user||r;localStorage.setItem('ivme:konu-paketi:fizik-hareket:'+u.id+':v2:r3',${JSON.stringify(JSON.stringify(state))});location.reload()})()`);
 await b.wait(`document.querySelector('.kp-yol button')`);
 for(const d of paketHazirla(p).duraklar){
 await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket?bolum='+d.id);await b.wait('document.body.innerText.includes('+JSON.stringify(d.baslik)+')');
 for(let i=0;i<d.bloklar.length;i++){
  await new Promise(r=>setTimeout(r,25));
  checks.push(await b.evalJs(`({text:document.querySelector('.kp-v2-ana')?.innerText.slice(0,80),empty:!document.querySelector('.kp-v2-ana')?.innerText.trim(),overflow:document.documentElement.scrollWidth>innerWidth+1})`));
  const clicked=await b.evalJs(`(()=>{const b=[...document.querySelectorAll('.kp-v2-ana .kp-gezin button')].find(b=>b.textContent==='Sonraki →');if(b&&!b.disabled){b.click();return true}return false})()`);if(!clicked)break;
 }
 }
 if(checks.length !== 2 + paketHazirla(p).duraklar.reduce((n,d)=>n+d.bloklar.length,0) || checks.some(c=>c.empty||c.overflow)||b.errors.length)throw Error('Ekran denetimi başarısız');
 console.log(JSON.stringify({checks:checks.length,initial:checks.slice(0,2),empty:checks.filter(c=>c.empty).length,overflow:checks.filter(c=>c.overflow).length,errors:b.errors,failedRequests:b.failedRequests}));
}finally{await b.close()}
