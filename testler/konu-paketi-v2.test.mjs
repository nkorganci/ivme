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

test('yüzde80 tek başına geçiş değildir; her tipten ilk doğru gerekir, yabancı kimlikler puana girmez',async()=>{
 const {sinavGecisi}=await import('../frontend/src/learn/konu/v2Kurallari.js');
 const set=p.sinavSeti.duzeyler.flatMap(d=>d.sorular);const cevap=Object.fromEntries(set.map(q=>[q.id,true]));
 cevap[set[0].id]=false;cevap[set[1].id]=false;
 const r=sinavGecisi(set,cevap);assert.ok(r.oran>=.8);assert.equal(r.gecti,false);assert.equal(r.eksikTipler.length,2);
 for(let i=0;i<100;i++)cevap['yabanci'+i]=true;assert.equal(sinavGecisi(set,cevap).oran,10/12);
 cevap[set[0].id]=true;cevap[set[1].id]=true;assert.equal(sinavGecisi(set,cevap).gecti,true);
});
test('kavram kapısı çıkış sorularını önceden ifşa etmez',()=>{
 for(const d of p.duraklar){const gate=d.bloklar.find(b=>b.tur==='kavram-kontrol');const exit=d.bloklar.filter(b=>b.tur==='sina').flatMap(b=>b.ogeler);
 assert.equal(gate.sorular.length,3);assert.ok(gate.sorular.every(q=>!exit.some(e=>e.soru===q.soru)));}
 assert.ok(p.karma.every(q=>p.tipler.some(t=>t.id===q.tip)));
});
test('eşit sürat/zıt hız, eşit yol süre sayaçları ve büyük sabit hız deneyleri',async()=>{
 const {deneySenaryosu,deneyVarsayilanlari,esitYolDurumu}=await import('../frontend/src/learn/konu/v2DeneyModeli.js');
 const {motionOf,statsAt}=await import('../frontend/src/interactive/motion/model.js');
 const y4=deneySenaryosu('esit-surat',deneyVarsayilanlari('esit-surat'));assert.equal(y4.bodies.length,2);assert.equal(y4.bodies[0].nodes[0][1],-y4.bodies[1].nodes[0][1]);
 const y5=esitYolDurumu({yol:60,v1:20,v2:60},4);assert.equal(y5.t1,3);assert.equal(y5.t2,1);assert.equal(y5.konum,120);assert.equal(y5.ortalama,30);assert.throws(()=>esitYolDurumu({yol:60,v1:0,v2:60}),RangeError);
 const y10=deneySenaryosu('sabit-buyuk',deneyVarsayilanlari('sabit-buyuk'));const m=motionOf(y10.bodies[0],8);assert.equal(statsAt(m,4).v,100);assert.equal(statsAt(m,4).a,0);
});
test('hız kesişimi konum farkını belirlemez: eşit ve farklı konum karşı örnekleri',()=>{
 const t=1;const vK=2+(t-1)*(3*t-1),vL=2;const xK=2*t+t*(t-1)**2,xL=2*t;
 assert.equal(vK,vL);assert.equal(xK,xL);
 assert.equal(t+1,vL);assert.notEqual(t+t*t/2,xL);
 const tahmin=p.duraklar.find(d=>d.id==='vt').bloklar.find(b=>b.tur==='neden').tahmin;
 assert.match(tahmin.secenekler.find(s=>s.dogru).metin,/belirlenemez/);
});

test('her durakta nicel kazanıma ayrılmış iki farklı madde zorunlu',()=>{
 for(const d of p.duraklar){const n=d.bloklar.find(b=>b.tur==='nicel-kontrol');assert.equal(n.basamak,4);assert.equal(n.ogeler.length,2);assert.equal(new Set(n.ogeler.map(q=>q.id)).size,2);
 const exposed=d.bloklar.filter(b=>b.tur!=='nicel-kontrol').flatMap(b=>[b.soru,b.tahmin?.soru,...(b.sorular||[]).map(q=>q.soru),...(b.ogeler||[]).map(q=>q.soru)]);assert.ok(n.ogeler.every(q=>!exposed.includes(q.soru)));
 assert.ok(d.bloklar.indexOf(n)<d.bloklar.findIndex(b=>b.tur==='tipler'));}
 const noGate={...p,duraklar:p.duraklar.map(d=>({...d,bloklar:d.bloklar.filter(b=>b.tur!=='nicel-kontrol')}))};assert.equal(dogrulaV2(noGate).filter(e=>e.startsWith('nicel:')).length,8);
});
