import assert from 'node:assert/strict';
import { tarayiciAc, pause } from './lib/tarayici.mjs';
import raw from '../frontend/src/learn/konu/paketler/fizik-hareket.v2.js';
import ak from '../frontend/src/learn/konu/paketler/arac-kutusu-fizik.js';
import { paketHazirla } from '../frontend/src/learn/konu/v2Kurallari.js';
const b=await tarayiciAc({mobile:process.argv.includes('--mobil')});
const p=paketHazirla(raw), sets=p.sinavSeti.duzeyler.flatMap(d=>d.sorular), checks=[];
let key;
const text=()=>b.evalJs(`document.querySelector('.kp-v2-ana')?.innerText`);
async function open(id){await b.goto('/konuyu-ogrenelim/ogren/fizik-hareket?bolum='+id);await b.wait('document.querySelector(".kp-v2-ana")');await pause(80);}
async function fixture(state,id){await b.evalJs(`localStorage.setItem(${JSON.stringify(key)},${JSON.stringify(JSON.stringify(state))})`);await open(id);}
async function click(label){assert.equal(await b.evalJs(`(()=>{const x=[...document.querySelectorAll('.kp-v2-ana button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!x||x.disabled)return false;x.click();return true})()`),true,label);await pause(80);}
async function choose(q,option){assert.equal(await b.evalJs(`(()=>{const e=[...document.querySelectorAll('.kp-v2-ana .kp-soru')].find(e=>e.querySelector('.kp-kok')?.textContent.trim()===${JSON.stringify(q)});const x=e&&[...e.querySelectorAll('button.kp-secenek')].find(x=>x.querySelector('span:last-child')?.textContent.trim()===${JSON.stringify(option)});if(!x||x.disabled)return false;x.click();return true})()`),true,q+' => '+option);await pause(80);}
const stored=()=>b.evalJs(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`);
const base=()=>({on:{sonuc:{puan:50}},ak:Object.fromEntries(ak.map(a=>[a.id,true]))});
const full=()=>({...base(),...Object.fromEntries(p.duraklar.map(d=>[d.id,Object.fromEntries(d.bloklar.map((_,i)=>[i,{ilk:true}]))])),tip:Object.fromEntries(p.tipCalismalari.map(t=>[t.tani.id,true])),karma:Object.fromEntries(p.karma.map(q=>[q.id,true])),gecikmeli:{Y2:true,Y11:true,Y13:true},osym:Object.fromEntries(['TYT-0910','TYT-0912','TYT-0913'].map(k=>[k,{ilk:true}]))});
const postDisabled=()=>b.evalJs(`[...document.querySelectorAll('.kp-yol button')].find(x=>x.textContent==='Son test').disabled`);
async function yargi(oge){await b.evalJs(`(()=>{const li=[...document.querySelectorAll('.kp-yargilar>li')];${JSON.stringify(oge.yargilar.map(y=>y.dogru))}.forEach((v,i)=>[...li[i].querySelectorAll('button')].find(b=>b.textContent===(v?'Doğru':'Yanlış')).click())})()`);await click('Kontrol et');}
try{
 await b.goto('/');await b.login('student');await open('son');await b.wait(`document.body.innerText.includes('Başlamadan önce')`);
 const u=await b.evalJs(`(async()=>{const r=await(await fetch('/api/auth/me')).json();return r.user||r})()`);key=`ivme:konu-paketi:fizik-hareket:${u.id}:v2:r3`;
 const old=key.replace(':r3','');await b.evalJs(`localStorage.setItem(${JSON.stringify(old)},'{"onceki":"korunacak"}')`);
 assert.equal(await postDisabled(),true);checks.push('URL ile son test kilidi');
 await fixture(base(),'kime-gore');const pred=p.duraklar[0].bloklar[0].tahmin;
 await choose(pred.soru,pred.secenekler.find(s=>!s.dogru).metin);
 assert.equal(await b.evalJs(`!!document.querySelector('.kp-v2-ana .kp-geri')`),false);
 await click('Tahminimi kaydet ve deneyi aç');assert.ok((await text()).includes('Gözlemledim, açıklamayı aç'));
 assert.equal(await b.evalJs(`!!document.querySelector('.kp-v2-ana .kp-geri')`),false);
 await click('Gözlemledim, açıklamayı aç');await choose('Gözlemine göre doğru açıklama hangisi?',pred.gerekce.secenekler.find(s=>s.dogru).metin);checks.push('Yanlış tahmin → deney → açıklama/gerekçe');
 await fixture(full(),'set');const q=sets[0];await choose(q.soru,q.secenekler.find(s=>!s.dogru).metin);await open('set');
 assert.ok(Object.values((await stored())._sorular).includes(true));
 await choose(q.soru,q.secenekler.find(s=>s.dogru).metin);assert.equal((await stored()).set[q.id],false);checks.push('Yenilemede ilk yanlış korunur');
 for(let i=1;i<sets.length;i++){if(i===1)await choose(sets[i].soru,sets[i].secenekler.find(s=>!s.dogru).metin);await choose(sets[i].soru,sets[i].secenekler.find(s=>s.dogru).metin);}
 assert.equal(await postDisabled(),true);checks.push('10/12 doğru, iki eksik tip → son test kilitli');
 await click('Gerekçeleri inceleyip yeni tur başlat');assert.equal((await stored())._setTur,1);assert.equal((await stored())._setGecmisi[0].cevaplar[q.id],false);await open('set');
 const ikizler=[1,2,3].flatMap(d=>p.tipCalismalari.filter(t=>t.bagimsiz.duzey===d).map(t=>t.ikiz));for(const q of ikizler)await choose(q.soru,q.secenekler.find(s=>s.dogru).metin);
 assert.equal(await postDisabled(),false);assert.equal((await stored())._setTur,1);assert.ok((await stored())._kayit.some(k=>k.kapi==='set'&&k.tur===1&&k.ilk===true));assert.ok((await stored())._kayit.some(k=>k.kapi==='set'&&k.tur===0&&k.ilk===false));checks.push('Açık yeni tur yenilemede korunur; her tip doğruysa geçer');
 await fixture({...full(),osym:{}},'set');assert.equal(await postDisabled(),true);checks.push('Düzey 4 ÖSYM tamamlanmadan son test kilitli; yeni turda ikiz maddeler ve tur kaydı');
 await fixture({...full(),karma:{}},'karma');assert.equal(await b.evalJs(`document.querySelectorAll('.kp-karma-oge .kp-soru').length`),0);
 const tip=p.tipler.find(t=>t.id===p.karma[0].tip);await click(tip.ad);assert.equal(await b.evalJs(`document.querySelectorAll('.kp-karma-oge .kp-soru').length`),1);checks.push('Karma: tip seçmeden çözüm açılmaz');
 const mapD=p.duraklar.find(d=>d.id==='xt'), mapI=mapD.bloklar.findIndex(q=>q.verilen?.tur==='harita');
 await fixture({...base(),xt:Object.fromEntries(mapD.bloklar.slice(0,mapI).map((_,i)=>[i,{ilk:true}]))},'xt');
 assert.equal(await b.evalJs(`document.querySelector('.kp-v2-gorsel svg').getAttribute('aria-label').startsWith('Hareket haritası')`),true);
 assert.equal(await b.evalJs(`document.querySelector('.kp-v2-gorsel svg').querySelectorAll('polyline').length`),0);checks.push('Gerçek hareket haritası');
 const tipI=mapD.bloklar.findIndex(q=>q.tur==='tipler');await fixture({...base(),xt:Object.fromEntries(mapD.bloklar.slice(0,tipI).map((_,i)=>[i,{ilk:true}]))},'xt');assert.ok((await text()).includes('KOŞUL'));assert.ok((await text()).includes('TUZAK'));checks.push('Tip kartı koşul/tuzak görünür');
 const numericD=p.duraklar[0], ni=numericD.bloklar.findIndex(q=>q.tur==='nicel-kontrol'), nq=numericD.bloklar[ni].ogeler;
 await fixture({...base(),[numericD.id]:Object.fromEntries(numericD.bloklar.slice(0,ni).map((_,i)=>[i,{ilk:true}]))},numericD.id);
 const numericLocked=()=>b.evalJs(`[...document.querySelectorAll('.kp-v2-ana button')].find(b=>b.textContent==='Sonraki →').disabled`);
 assert.equal(await numericLocked(),true);await choose(nq[0].soru,nq[0].secenekler.find(s=>s.dogru).metin);await open(numericD.id);assert.equal(await numericLocked(),true);await choose(nq[1].soru,nq[1].secenekler.find(s=>s.dogru).metin);assert.equal(await numericLocked(),false);assert.equal((await stored())[numericD.id][ni].ilk,true);checks.push('Nicel kapı: örnekler yetmez; iki ayrı ilk doğru yenilemeyle korunur');
 const first=p.duraklar[0], exitI=first.bloklar.findIndex(q=>q.tur==='sina'), exit=first.bloklar[exitI];
 await fixture({...base(),[first.id]:Object.fromEntries(first.bloklar.slice(0,exitI).map((_,i)=>[i,{ilk:true}]))},first.id);
 await yargi(exit.ogeler[0]);const eq=exit.ogeler[1];await choose(eq.soru,eq.secenekler.find(s=>!s.dogru).metin);await open(first.id);await choose(eq.soru,eq.secenekler.find(s=>s.dogru).metin);
 assert.ok((await text()).includes('Yeni deneme'));await open(first.id);assert.ok((await text()).includes('Yeni deneme'));await click('Yeni deneme');await open(first.id);await yargi(exit.ogeler[0]);await choose(eq.soru,eq.secenekler.find(s=>s.dogru).metin);assert.equal((await stored())[first.id][exitI].ilk,true);assert.ok(Object.keys((await stored())[first.id+':hatalar']).length);checks.push('Durak çıkışı: örnekler yetmez, yanlış/yenileme/yeni tur ve iki doğru');
 for(const [kod,expected] of [['Y4','K hızı: +3'],['Y5','İlk parçanın sayacı'],['Y10','Büyük sabit hız']]){const d=p.duraklar.find(d=>d.bloklar.some(b=>b.tur==='yanilgi'&&b.kod===kod));const i=d.bloklar.findIndex(b=>b.tur==='yanilgi'&&b.kod===kod);await fixture({...base(),[d.id]:Object.fromEntries(d.bloklar.slice(0,i).map((_,j)=>[j,{ilk:true}]))},d.id);const q=p.yanilgilar.find(y=>y.kod===kod).ortayaCikar;await choose(q.soru,q.secenekler[0].metin);await click('Tahminimi kaydet ve deneyi aç');assert.ok((await text()).includes(expected));}checks.push('Y4/Y5/Y10 yönergeye uygun modeller');
 assert.equal(await b.evalJs(`localStorage.getItem(${JSON.stringify(old)})`),'{"onceki":"korunacak"}');assert.deepEqual(b.errors,[]);
 console.log(JSON.stringify({status:'PASS',checks,errors:b.errors}));
}finally{await b.close()}
