// Veri grafikleri dersi: keşif modelleri somut veriyle, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg??`${a} ≠ ${b}`);

test('iki daire keşfi: somut toplarla birim ağırlık',()=>{
 for(const a1 of range(30,240,30))for(const b1 of range(30,240,30))for(const a2 of range(30,240,30))for(const b2 of range(30,240,30)){
  const r=model('vg-iki-daire',{a1,b1,a2,b2});
  if(a1+b1>=360||a2+b2>=360){assert.equal(r.valid,false);continue;}
  // 360 top, toplam ağırlık 720: her markanın gerçek birim ağırlığı ortalamanın (2) oran katı.
  const counts=[a1,b1,360-a1-b1],weights=[a2,b2,360-a2-b2].map((x)=>2*x);
  r.ratios.forEach(([,ratio],i)=>close(weights[i]/counts[i],2*ratio));
 }
});

test('iade keşfi: sayılar ve genel oran',()=>{
 for(const a of range(24,240,24))for(const b of range(24,240,24))for(const pa of [0,5,13,30])for(const pb of [0,7,20])for(const pc of [1,8,30]){
  const r=model('vg-iade',{a,b,pa,pb,pc});if(a+b>=360){assert.equal(r.valid,false);continue;}
  const sold=[a,b,360-a-b].map((x)=>1500*x/360),ret=sold[0]*pa/100+sold[1]*pb/100+sold[2]*pc/100;
  close(r.ret,ret);close(r.pct,100*ret/1500);assert.ok(r.pct>=Math.min(pa,pb,pc)-1e-9&&r.pct<=Math.max(pa,pb,pc)+1e-9);
 }
});

test('histogram keşfi: uç dağılımlar ve medyan grubu',()=>{
 for(const w of [5,10,15,20])for(const f1 of range(0,10,3))for(const f2 of range(0,10,2))for(const f3 of range(0,10,5))for(const f4 of [0,1,4]){
  const r=model('vg-histogram',{w,f1,f2,f3,f4});const f=[f1,f2,f3,f4];if(!f.some(Boolean))continue;
  const lows=f.flatMap((n,i)=>Array(n).fill(10+i*w)),highs=f.flatMap((n,i)=>Array(n).fill(10+(i+1)*w-1));
  const mean=(a)=>a.reduce((s,x)=>s+x,0)/a.length;close(r.minMean,mean(lows));close(r.maxMean,mean(highs));close(r.maxMean-r.minMean,w-1);
  assert.equal(r.maxRange,Math.max(...highs)-Math.min(...lows));
  // En az açıklık: ilk dolu grubu üst uca, son dolu grubu alt uca it.
  const full=f.map((n,i)=>n?i:-1).filter((i)=>i>=0),i0=full[0],i1=full[full.length-1];
  assert.equal(r.minRange,i0===i1?0:(10+i1*w)-(10+(i0+1)*w-1));
  const sorted=lows,n=sorted.length,ks=n%2?[(n+1)/2]:[n/2,n/2+1];
  assert.deepEqual(r.medianGroups,[...new Set(ks.map((k)=>{const lo=sorted[k-1];return lo+'–'+(lo+w-1);}))]);
 }
});

test('gerçek sorular: bağımsız hesap ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/veri-grafikleri.ders',import.meta.url),'utf8'),'veri-grafikleri');
 for(const [code,answer] of [['TYT-0796','E'],['TYT-0798','E'],['TYT-0809','D']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0796
 const k=[180/120,90/90,90/150];assert.ok(k[2]<k[1]&&k[1]<k[0]);
 // TYT-0798
 const B=168/0.14,total=(600+B)*360/240,C=total-600-B;close(600*0.07+C*0.12,150);
 // TYT-0809: y=1 → b+r=11, 2b+3r=29
 const sol=range(0,11).filter((r)=>2*(11-r)+3*r===29);assert.deepEqual(sol,[7]);close(3*7/30,0.7);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 const k=[60/90,180/150,120/120];assert.ok(k[0]<k[2]&&k[2]<k[1]);
 { const y=1,P=6*y;const r=range(0,5).filter((r)=>2*(5-r)+3*r===11);assert.deepEqual(r,[1]);assert.equal(P,6);close(3/12,0.25); }
 close(360/40*30,270);assert.equal(36/4,9);assert.equal(24/4,6);close(30*60/120,15);
 // s2b
 { const B=60/0.1,total=(400+B)*360/240,C=total-400-B;assert.equal(total,1500);close(400*0.05+C*0.08,60);close((20+60+40)/1500,0.08); }
 close(96/160*80,48);close(96/160*120,72);
 close(720*150/360*0.4+(720-300)*0.3,246);close((20+60)/2,40);close(30/3+15*2/3,20);
 // s3b
 assert.equal(99-24,75);close(10/20,0.5);close((40+100+30)/10,17);close((76+145+39)/10,26);assert.equal(30-19,11);
 { const f=[4,7,6,3];let acc=0;const cum=f.map((x)=>acc+=x);assert.ok(cum[0]<10&&cum[1]>=11); }
 close((2*9+3*14+5*19)/10,15.5);close((2*5+3*10+5*15)/10,11.5);
 // s4b
 close(360*16/40,144);assert.deepEqual([12,8,4].map((x)=>x/4),[3,2,1]);close((102-98)/98,4/98);
 close(400*0.3,120);close(300*0.3,90);close(360*15/36,150);close(360*37/72,185);
});
