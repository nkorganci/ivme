// Polinom dersi: keşif modelleri açılımla, gerçek soruların modelleri ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const P=(c,x)=>c.reduce((s,a)=>s*x+a,0);

test('kök keşfi: çarpanlar ve katsayılar aynı polinom',()=>{
 for(const r1 of range(-3,3))for(const r2 of range(-3,3))for(const r3 of range(-3,3)){const r=model('po-kok',{r1,r2,r3});
  for(const x of range(-4,4))assert.equal(P(r.c,x)+0,(x-r1)*(x-r2)*(x-r3)+0);assert.equal(r.p0+0,-r1*r2*r3+0);}
});

test('bölme keşfi: P = (x − a)·B + K',()=>{
 for(const b of range(-3,3))for(const c of range(-3,3))for(const d of range(-3,3))for(const a of range(-3,3)){const r=model('po-bolme',{b,c,d,a});
  for(const x of range(-3,3))assert.equal(P([1,b,c,d],x),(x-a)*P(r.q,x)+r.r);}
});

test('katsayı keşfi: açılım ve toplamlar',()=>{
 for(const p of range(1,3))for(const q of range(-3,3))for(const n of range(1,4)){const r=model('po-katsayi',{p,q,n});
  for(const x of [-2,-1,0,1,2])assert.equal(P(r.c,x),(p*x+q)**n);
  const deg=r.c.length-1;let even=0,odd=0;r.c.forEach((a,i)=>{((deg-i)%2===0)?even+=a:odd+=a;});assert.equal(r.even,even);assert.equal(r.odd,odd);}
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/polinom-islemleri.ders',import.meta.url),'utf8'),'polinom-islemleri');
 for(const [code,answer] of [['AYT_Sayisal-0087','A'],['AYT_Sayisal-0090','A'],['AYT_Sayisal-0091','B']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // AYT-0087: kalan kökler (−3, 4) aralığında, çarpımları −6
 const pairs=[];for(const r of range(-2,3))for(const s of range(r+1,3))if(r*s===-6)pairs.push([r,s]);assert.deepEqual(pairs,[[-2,3]]);
 assert.equal((1+3)*(1-4)*(1+2)*(1-3),72);assert.equal(3*(-4)*2*(-3)*(-1)*(-1),72);
 // AYT-0090: (P−R)(x)=k(x−2)(x−6), (P−R)(1)=10
 const k=10/((1-2)*(1-6));assert.equal(k,2);assert.equal(k*(0-2)*(0-6),24);
 // AYT-0091
 const Q=(x)=>2*(x-1)**2*(x-3)**2,Pf=(x)=>Q(x)+x;assert.deepEqual([Pf(1),Pf(2),Pf(3)],[1,4,3]);assert.equal(Pf(4),22);
 for(let x=-5;x<=8;x+=0.5)assert.ok(Pf(x)>=x);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 { const p=(x)=>(x+2)*(x-1)*(x-3);assert.equal(p(0),6);assert.equal(p(2),-4); }
 { const p=(x)=>x*x-4,R=(x)=>p(p(x));assert.equal(R(0),12);assert.ok(Math.abs(R(Math.SQRT2))<1e-9);assert.notEqual(R(2),0); }
 { const Qf=(x)=>3*x*x*(x-2)**2,p=(x)=>Qf(x)+2*x+1;assert.deepEqual([p(0),p(2),p(1),p(3)],[1,5,6,34]); }
 { const p=(x)=>(x*x-1)*(x*x-16);assert.equal(p(2),-36); }
 { const p=(x)=>2*(x+1)*(x-2)*(x-3);assert.equal(p(0),12);assert.equal(p(1),8); }
 { const p=(x)=>x**3-6*x*x+11*x-6;assert.deepEqual([1,2,3].map(p),[0,0,0]);assert.equal(p(6),60); }
 { const p=(x)=>(x-1)*(x-2)*(x+3);assert.equal(p(0)+p(-1),18); }
 // s2b
 { const k=-6/((2-1)*(2-4));assert.equal(k,3);assert.equal(k*(0-1)*(0-4),12); }
 { const d=(x)=>(2*x*x+3*x-1)-(2*x*x-x+7);assert.equal(d(2),0);assert.equal(d(10),32); }
 { const k=8/(5-3);assert.equal(k*(0-3),-12); }
 assert.deepEqual(range(-5,5).filter((a)=>8+4*a-8+4===0),[-1]);
 { const k=6/((0-1)*(0-2));assert.equal(k*(3-1)*(3-2),6); }
 // s3b
 assert.equal(P([2,-3,1,-4],2),2);assert.equal(P([2,1,3],2)*(2-2)+2,2);
 { const m=(10-4)/(3-1),n=4-m;assert.deepEqual([m,n],[3,1]); }
 assert.deepEqual(range(-10,10).filter((a)=>-1+a+1+2===6),[4]);assert.equal(5*4+4-3,21);
 { const m=(5-(-1))/3,n=5-2*m;assert.deepEqual([m,n],[2,1]); }
 { const m=(7-3)/(2-1),n=3-m;assert.deepEqual([m,n],[4,-1]); }
 // s4b
 { const p=(x)=>(x*x-x+2)**3;assert.equal(p(1),8);assert.equal(p(0),8);assert.equal((p(1)+p(-1))/2,36); }
 assert.equal(2*2+2+1,7);
 { const p=(x)=>x**4-3*x**3+2*x*x+5*x-1;assert.equal((p(1)-p(-1))/2,2); }
 assert.equal(1-5+3,-1);
 { const p=(x)=>(3*x-2)**5;assert.equal(p(1),1);assert.equal((p(1)+p(-1))/2,-1562); }
 { const p=(x)=>(x*x+x-1)**4;assert.equal((p(1)+p(-1))/2,1); }
});
