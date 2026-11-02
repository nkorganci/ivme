import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
test('yüzde modelleri: taban dönüşümü, ağırlık ve madde korunumu',()=>{
 for(const a of range(20,200,20))for(const p of range(0,100,5)){const m=model('yk-taban',{a,p});close(m.total*(1-m.back/100),a);}
 for(const a of range(20,200,5))for(const b of range(5,100,5))for(const p of range(0,100,5))for(const q of range(0,100,5)){
  const m=model('yk-agirlik',{a,b,p,q});assert.ok(m.pct>=Math.min(p,q)-1e-9&&m.pct<=Math.max(p,q)+1e-9);close(m.sugar,m.pct*m.total/100);if(a===b)close(m.pct,(p+q)/2);
 }
 for(const p of range(10,80,10))for(const q of range(0,80,5))for(const op of [0,1,2]){
  const m=model('yk-islem',{p,q,op});assert.ok(m.sugar>=0&&m.sugar<=m.total);assert.ok(m.pct>=0&&m.pct<=100);assert.ok(m.total>0);
  if(op===2){assert.equal(m.sugar,p);assert.ok(m.actual<=100-p);}else{assert.equal(m.total,100);close(m.sugar,p-p*q/100+(op===1?q:0));}
 }
});
test('yüzde gerçek soruları ve benzerleri: yüzde tabanı ve dakika dönüşümü',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/yuzde-karisim.ders',import.meta.url),'utf8'),'yuzde-karisim');
 for(const [code,answer]of [['TYT-0661','D'],['TYT-0698','A'],['TYT-0662','E']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code));}
 assert.equal((60/.4+60)/70+(120/.75+120)/70,7);assert.equal((80/.4+80)/70,4);
 const start=15*60+108*.25-108;assert.equal(Math.floor(start/60),13);assert.equal(start%60,39);
 assert.equal(16*60+120*.25-120,14*60+30);
 assert.deepEqual(range(1,150).filter(n=>Number.isInteger(n*12/25)&&Number.isInteger(n*3/25)).slice(0,3),[25,50,75]);
});
test('yeni örnekler: değişen toplam ve korunan maddeyi bağımsız hesapla',()=>{
 close(360*.25*.4,36);close(180*.2,144*.25);close(1.2*.75*1.1,.99);
 assert.equal(14+8+10+8,40);close((60*.2+30*.5)/90,.3);
 close((40*.15+60*.4)/100,.3);close((100-20+100)/500,.36);
 close(40*(3/4)**2,22.5);close(27/(150-42),.25);close((300*.24+10)/(300+10-60),.328);
 for(const total of range(20,100,10))for(const pct of range(10,80,10)){
  const sugar=total*pct/100;close((sugar*.5)/(total*.5),pct/100);
  if(pct<=50)assert.ok(sugar/(total*.5)>pct/100);
 }
});
