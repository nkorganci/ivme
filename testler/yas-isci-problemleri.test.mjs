import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/yas-isci-problemleri.ders',import.meta.url),'utf8'),'yas-isci-problemleri');
test('yaş, grup ve iş keşifleri: bütün kontrol aralıklarında fiziksel ve matematiksel sınırlar',()=>{
  for(const a of range(20,60))for(const d of range(5,35))for(const t of range(-15,20)){
    const m=model('yi-zaman',{a,d,t});assert.ok(m.small>=0);assert.equal(m.big-m.small,m.d);assert.equal(m.sum,2*a-m.d+2*m.t);
  }
  for(const n of range(2,8))for(const m of range(10,40))for(const t of range(0,10)){
    const x=model('yi-grup',{n,m,t});assert.equal(x.total,n*(m+t));assert.equal(x.total/n,x.avg);
  }
  for(const a of range(4,20))for(const b of range(4,20))for(const t of range(0,6)){
    const m=model('yi-is',{a,b,t});assert.equal(m.done+m.left,m.L);assert.ok(m.left>=0&&m.done<=m.L);
    assert.ok(Math.abs(m.done/m.L-Math.min(1,t/a+t/b))<1e-12);
  }
});
test('gerçek yaş soruları: bağımsız aday taraması ve ders bağı',()=>{
  const cases=[['TYT-0650','A'],['TYT-0681','D'],['TYT-0683','C'],['TYT-0741','E']];
  for(const [code,answer]of cases){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code));}
  assert.deepEqual(range(0,60).filter(t=>2*(60+3*t)-90===120),[15]);
  assert.deepEqual(range(1,100).filter(n=>7*(n+10)+5===10*n),[25]);
  assert.deepEqual(range(1,100).filter(x=>2020-x-300===39*x),[43]);
  const pairs=[];for(const a of range(1,100))for(const c of range(1,a))if(a-12+c-12===a&&a-26===c)pairs.push([a,c]);
  assert.deepEqual(pairs,[[50,24]]);assert.equal(pairs[0][0]+pairs[0][1],74);
});
test('benzer sorular ve kaynak kalıpları: zaman ve birim dönüşümü',()=>{
  assert.deepEqual(range(0,60).filter(t=>2*(66+3*t)-90===150),[18]);
  assert.deepEqual(range(1,100).filter(n=>8*(n+8)+4===10*n),[34]);
  assert.deepEqual(range(1,100).filter(x=>2024-x-144===39*x),[47]);
  assert.equal(44-10+20-10,44);assert.equal(44-24,20);
  assert.equal((78+3*5+3)/4,24);assert.equal(48+15,18+3*15);
  assert.equal(16*1.75*1.5*1.5*4,252);assert.equal(108/(4*(36/36+72/36)),9);
  assert.ok(Math.abs(2/(1/10+1/12+1/15)-8)<1e-12);
  assert.equal(1/(1/12-1/36),18);
  assert.ok(Math.abs((1-1/3)/(1/6-1/9)-12)<1e-12);
  assert.equal(30/(10-8),15);assert.equal(.5/(1/6)+.5/(1/6-1/12),9);
  // Dönüşümlü işte son günü kesirli hesapla; sıranın etkisini bağımsız simüle et.
  const alternating=(work,rates)=>{let t=0;while(work>1e-9){const rate=rates[t%2];if(work<=rate)return t+work/rate;work-=rate;t++;}};
  assert.equal(alternating(12,[2,1]),8);assert.equal(alternating(11,[2,1]),7);assert.equal(alternating(11,[1,2]),7.5);
});
