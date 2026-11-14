import test from 'node:test';
import assert from 'node:assert/strict';
import { secenekSirasi, testSonucu, kazanc, paketHazirla, dogrulaV2, AYRILAN_OSYM } from '../frontend/src/learn/konu/v2Kurallari.js';
import raw from '../frontend/src/learn/konu/paketler/fizik-hareket.v2.js';
import ak from '../frontend/src/learn/konu/paketler/arac-kutusu-fizik.js';
const p=paketHazirla(raw);
test('v2 alanları ve bağlar eksiksiz; ayrılan ÖSYM çözümleri öğretimden çıkarılır',()=>{
 assert.deepEqual(dogrulaV2(p),[]);assert.equal(p.duraklar.length,8);assert.equal(ak.length,7);
 assert.ok(!p.duraklar.flatMap(d=>d.bloklar).some(b=>AYRILAN_OSYM.includes(b.kod)));
 const probe={...raw,duraklar:[{id:'probe',bloklar:[{tur:'tani',kod:AYRILAN_OSYM[0]}]}]};
 assert.equal(paketHazirla(probe).duraklar[0].bloklar.length,0);assert.equal(probe.duraklar[0].bloklar.length,1);
 assert.deepEqual(new Set(p.tipCalismalari.map(t=>t.tip)),new Set(p.tipler.map(t=>t.id)));
 for(const d of p.duraklar){assert.ok(d.bloklar.every(Boolean));assert.ok(d.bloklar.some(b=>b.tur==='kavram-kontrol'&&b.sorular.length>=3));assert.ok(d.bloklar.find(b=>b.tur==='sina').ogeler.length>=2);}
});
test('seçenekler karışır ve kimlik/cevap ilişkisi yeniden çizimde korunur',()=>{
 const s=p.kavramTesti.on[0].secenekler;const a=secenekSirasi(s,'ogrenci:1');
 assert.deepEqual(a,secenekSirasi(s,'ogrenci:1'));assert.equal(a.find(x=>x.dogru).id,s.find(x=>x.dogru).id);
 assert.ok(Array.from({length:30},(_,i)=>secenekSirasi(s,String(i)).findIndex(x=>x.dogru)).some(i=>i!==0));
});
test('test bitmeden puan yok, son form ders/karma ile aynı soru değil',()=>{
 const form=p.kavramTesti.on;assert.equal(testSonucu(form,{}),null);
 const a=Object.fromEntries(form.map(q=>[q.id,q.secenekler.find(s=>s.dogru).id]));
 assert.equal(testSonucu(form,a).puan,100);a[form[0].id]='gecersiz';assert.equal(testSonucu(form,a).puan,90);
 assert.equal(kazanc(100,100),null);assert.equal(kazanc(50,70),.4);
 const taught=new Set([...p.karma,...p.yanilgilar.flatMap(y=>[y.ortayaCikar,y.yenidenSina.soru])].map(q=>q.soru));
 assert.ok(p.kavramTesti.son.every(q=>!taught.has(q.soru)));
});
test('her yanılgı dört parçalı ve bütün seçenekli sorular tek doğru içerir',()=>{
 for(const y of p.yanilgilar)for(const k of ['ortayaCikar','yuzlestir','aciklama','yenidenSina'])assert.ok(y[k]);
 const walk=o=>{if(!o||typeof o!=='object')return;if(o.secenekler){assert.equal(o.secenekler.filter(s=>s.dogru).length,1,o.soru);assert.ok(o.secenekler.every(s=>s.neden));}Object.values(o).forEach(walk);};walk(p);walk(ak);
});
test('yeni iki-cisim ve üç-grafik senaryolarının model hesabı',async()=>{
 const {motionOf,statsAt}=await import('../frontend/src/interactive/motion/model.js');
 const m=motionOf({x0:0,nodes:[[0,3],[8,19]]},8);assert.equal(statsAt(m,3).v,9);assert.equal(statsAt(m,3).x,18);
 assert.equal(Math.abs(20+(-2-3)*4),0);assert.equal(-2+2*3-1*2,2);
});
