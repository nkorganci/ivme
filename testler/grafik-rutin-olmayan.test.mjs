// Rutin olmayan problemler dersi: keşif modelleri kaba kuvvetle, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const band=(x)=>x>=1&&x<=32?0:x>=33&&x<=65?1:x>=66&&x<=100?2:-1;
const sum=(a)=>a.reduce((s,x)=>s+x,0);

test('aralık keşfi: ortak kısım kaba kuvvetle aynı',()=>{
 for(const p of range(1,30))for(const q of range(1,30))for(const b1 of [0,1,2])for(const b2 of [0,1,2]){
  const r=model('gr-aralik',{p,q,b1,b2});
  assert.deepEqual(r.list,range(1,100).filter(L=>band(L+p)===b1&&band(L-q)===b2));
 }
});

test('pul keşfi: bütün doğal sayı çözümleri',()=>{
 for(const a of range(2,9))for(const b of range(3,12))for(const t of range(10,100)){
  const r=model('gr-pul',{a,b,t});const brute=[];
  for(let x=0;x*a<=t;x++)for(let y=0;x*a+y*b<=t;y++)if(x*a+y*b===t)brute.push([x,y]);
  assert.deepEqual([...r.list].sort((u,v)=>u[0]-v[0]||u[1]-v[1]),brute.sort((u,v)=>u[0]-v[0]||u[1]-v[1]));
 }
});

test('kumbara keşfi: gün gün toplam, ilk ulaşılan gün',()=>{
 for(const w of range(10,40,5))for(const e of range(10,50,5))for(const t of range(100,800,50))for(const s of range(0,6)){
  const r=model('gr-kumbara',{w,e,t,s});let total=0,n=0;
  while(total<t){total+=((s+n)%7)>=5?e:w;n++;}
  assert.equal(r.days.length,n);assert.equal(r.days[n-1].total,total);
  if(n>1)assert.ok(r.days[n-2].total<t);
 }
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/grafik-rutin-olmayan.ders',import.meta.url),'utf8'),'grafik-rutin-olmayan');
 for(const [code,answer] of [['TYT-0692','A'],['TYT-0670','E'],['TYT-0704','D']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0692: 07–08 arası 24→36, 08–09 arası 36→30; bir saat önce aynı süre.
 const f=(m)=>m<=60?24+12*m/60:36-6*(m-60)/60;
 const u=range(60,120).filter(m=>Math.abs(f(m)-f(m-60))<1e-9);assert.deepEqual(u,[100]);assert.equal(100+f(100),132);// 07.00 + 132 dk = 09.12
 // TYT-0670
 assert.equal(sum(range(1,100).filter(L=>band(L+17)===2&&band(L-18)===0)),99);
 // TYT-0704: yalnız perşembe başlangıcı cumartesi bitirir.
 const reach=(s,w,e,t)=>{let tot=0,n=0;for(;;n++){tot+=((s+n)%7)>=5?e:w;if(tot>=t)return (s+n)%7;}};
 assert.deepEqual(range(0,6).filter(s=>reach(s,20,25,500)===5),[3]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b: benzer, f(x)=2 ve sıfırlar
 const g=(m)=>m<=60?20+12*m/60:32-6*(m-60)/60;
 assert.deepEqual(range(60,120).filter(m=>Math.abs(g(m)-g(m-60))<1e-9),[100]);assert.equal(100+g(100),128);// 07.00 + 128 dk = 09.08
 const P=[[-3,0],[-1,4],[2,4],[5,-2],[7,2]];
 const roots=(k)=>{const out=new Set();for(let i=0;i<P.length-1;i++){const [x1,y1]=P[i],[x2,y2]=P[i+1];if(y1===y2)continue;const x=x1+(k-y1)*(x2-x1)/(y2-y1);if(x>=x1-1e-9&&x<=x2+1e-9)out.add(+x.toFixed(9));}return [...out].sort((a,b)=>a-b);};
 assert.deepEqual(roots(2),[-2,3,7]);assert.deepEqual(roots(0),[-3,4,6]);assert.deepEqual(roots(0).map(x=>x+2),[-1,6,8]);
 assert.equal(Math.min(...P.map(p=>p[1])),-2);assert.equal(Math.max(...P.map(p=>p[1])),4);
 const Q=[[0,1],[2,5],[4,1],[6,5]];let c=0;for(let i=0;i<3;i++){const [,y1]=Q[i],[,y2]=Q[i+1];if((3-y1)*(3-y2)<0)c++;}assert.equal(c,3);
 // s2b
 const bat=(x)=>x>=1&&x<=25?0:x>=26&&x<=60?1:x>=61&&x<=100?2:-1;
 assert.equal(sum(range(1,100).filter(L=>bat(L+11)===2&&bat(L-26)===0)),101);
 const park=range(1,600).map(m=>m/100).filter(t=>t<=3&&t+2>3&&t+2<=6);assert.ok(park.every(t=>t>1&&t<=3));assert.ok(park.some(t=>t<=2));
 { const lo=245+125,hi=255+135;const shown=new Set();for(let s=lo;s<hi;s+=0.5)shown.add(Math.round(s/10)*10);assert.deepEqual([...shown].sort(),[370,380,390]); }
 assert.deepEqual(range(0,100).filter(p=>p+6>=85&&p-10>=70&&p<=84&&p>=70),[80,81,82,83,84]);
 assert.equal(sum(range(0,100).filter(p=>p-8<50&&p-5>=50)),168);
 // s3b
 const sols=(a,b,t)=>{const o=[];for(let y=0;y*b<=t;y++)if((t-y*b)%a===0)o.push([(t-y*b)/a,y]);return o;};
 assert.deepEqual(sols(3,5,47).map(([x,y])=>x+y),[15,13,11]);
 assert.deepEqual(sols(4,5,31),[[4,3]]);
 assert.equal(Math.min(...sols(7,4,100).map(([y,x])=>x+y)),16);
 assert.equal(Math.min(...sols(6,9,75).map(([x,y])=>x+y)),9);
 assert.deepEqual(range(0,10).filter(y=>y+0.5*(10-y)===7.5),[5]);
 assert.equal(Math.max(...sols(5,8,71).map(([x,y])=>x+y)),13);
 // s4b
 const reach=(s,w,e,t)=>{let tot=0,n=0;for(;;n++){tot+=((s+n)%7)>=5?e:w;if(tot>=t)return (s+n)%7;}};
 assert.deepEqual(range(0,6).filter(s=>reach(s,15,30,400)===6),[0]);
 assert.equal(range(1,50).find(n=>n%3===0&&n%7===0),21);
 assert.equal((4+61)%7,2);// cuma (4) + 61 gün = çarşamba (2)
 assert.equal((2+100)%7,4);// çarşamba + 100 = cuma
 assert.equal((0*24+7+9*8)/24|0,3);
 assert.equal((3+45)%7,6);// perşembe (3) + 45 = pazar (6)
});
