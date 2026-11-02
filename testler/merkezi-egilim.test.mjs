// Merkezi eğilim dersi: keşif modelleri kaba kuvvetle, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-9,msg??`${a} ≠ ${b}`);
const med=(a)=>{const s=[...a].sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2;};
const sum=(a)=>a.reduce((s,x)=>s+x,0);

test('çıkarma keşfi: somut listeyle yeni ortalama',()=>{
 for(const n of range(3,30))for(const m of range(10,80,5))for(const x of range(0,150,5)){
  const r=model('me-cikar',{n,m,x});const list=[x,...Array(n-1).fill((n*m-x)/(n-1))];
  close(sum(list)/n,m);close(r.nm,sum(list.slice(1))/(n-1));assert.equal(Math.sign(r.d),Math.sign(m-x));
 }
});

test('ortanca keşfi: her silme kaba kuvvetle',()=>{
 for(const l of [0,1,2])for(const k of range(1,9)){
  const r=model('me-ortanca',{l,k});const rest=r.list.filter((_,i)=>i!==k-1);
  assert.equal(r.before,med(r.list));assert.equal(r.after,med(rest));
  r.list.forEach((_,i)=>assert.equal(r.keep[i],med(r.list.filter((_,j)=>j!==i))===r.before));
 }
});

test('en büyük keşfi: beş farklı pozitif tam sayının kaba taraması',()=>{
 for(const m of range(4,16))for(const c of range(3,16)){
  const r=model('me-en-buyuk',{m,c});const S=5*m,es=[];
  for(let a=1;a<c;a++)for(let b=a+1;b<c;b++)for(let d=c+1;d<S;d++){const e=S-a-b-c-d;if(e>d)es.push(e);}
  if(!es.length){assert.equal(r.lo,null);continue;}
  assert.equal(r.lo,Math.min(...es));assert.equal(r.hi,Math.max(...es));
  for(const set of [r.minSet,r.maxSet]){assert.equal(sum(set),S);assert.equal(set[2],c);for(let i=1;i<5;i++)assert.ok(set[i]>set[i-1]);assert.ok(set[0]>=1);}
 }
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/merkezi-egilim.ders',import.meta.url),'utf8'),'merkezi-egilim');
 for(const [code,answer] of [['TYT-0799','B'],['TYT-0801','B'],['TYT-0810','D']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 assert.deepEqual(range(2,40).filter((n)=>{const T=1+45*(n-1);return T-92===38*(n-1);}),[14]);
 const team=[[18,1.76],[17,1.79],[18,1.82],[19,1.84],[20,1.84],[21,1.88],[17,1.90],[20,1.92],[19,1.96]];
 const ok=team.filter((_,i)=>{const r=team.filter((_,j)=>j!==i);return Math.abs(med(r.map((p)=>p[0]))-med(team.map((p)=>p[0])))<1e-9&&Math.abs(med(r.map((p)=>p[1]))-med(team.map((p)=>p[1])))<1e-9;});
 assert.deepEqual(ok,[[17,1.90]]);
 const tops=[];for(let a=0;a<=100;a++)for(let b=a;b<=84;b++)for(let d=84;d<=100;d++)for(let e=d;e<=100;e++){const s=[a,b,84,d,e];if(sum(s)!==425||e-a!==15)continue;const counts=Object.values(s.reduce((o,x)=>(o[x]=(o[x]||0)+1,o),{}));if(counts.includes(3)&&counts.filter((c)=>c>1).length===1)tops.push(e);}
 assert.deepEqual([...new Set(tops)],[94]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 assert.deepEqual(range(2,40).filter((n)=>{const T=5+40*(n-1);return T-75===35*(n-1);}),[15]);
 assert.equal(8*30-7*28,44);close(sum([3,3,4,4,30])/5,8.8);assert.equal(med([3,3,4,4,30]),4);
 { const T=50*10,rest=(T-104)/8;assert.ok(rest<50); }assert.equal(10*24-8*25,40);
 // s2b
 const crew=[[15,160],[17,163],[16,167],[16,170],[18,170],[16,174],[17,178]];
 const keep=crew.filter((_,i)=>{const r=crew.filter((_,j)=>j!==i);return med(r.map((p)=>p[0]))===med(crew.map((p)=>p[0]))&&med(r.map((p)=>p[1]))===med(crew.map((p)=>p[1]));});
 assert.deepEqual(keep,[[17,163]]);
 const sols=[];for(let x=-20;x<=40;x++)for(let y=-20;y<=40;y++){const d=[3,8,x,x+2,12,y,2*y-4];if(sum(d)!==70)continue;const c={};d.forEach((v)=>c[v]=(c[v]||0)+1);const mx=Math.max(...Object.values(c));const modes=Object.keys(c).filter((k)=>c[k]===mx).map(Number);if(modes.length===1&&modes[0]===8)sols.push(med(d));}
 assert.deepEqual(sols,[10]);
 const L=[3,5,5,6,8,8,9,11,12];assert.deepEqual([...new Set(L.filter((_,i)=>med(L.filter((_,j)=>j!==i))===8))],[3,5,6]);
 const L2=[2,4,4,7,9,9,9,12,15];assert.deepEqual([...new Set(L2.filter((_,i)=>med(L2.filter((_,j)=>j!==i))===9))],[2,4,7]);
 assert.equal(med([2,3,5,6,8,9,1200]),6);
 { const D=[2,2,2,3,3,4,4,4,6,6];let best=Infinity;for(let i=0;i<D.length;i++)for(let j=i+1;j<D.length;j++){const r=D.filter((_,k)=>k!==i&&k!==j),c={};r.forEach((v)=>c[v]=(c[v]||0)+1);const mx=Math.max(...Object.values(c)),modes=Object.keys(c).filter((k)=>c[k]===mx);if(modes.length===1&&modes[0]==='4')best=Math.min(best,D[i]+D[j]);}assert.equal(best,4); }
 // s3b
 const t2=[];for(let a=0;a<=100;a++)for(let b=a;b<=72;b++)for(let d=72;d<=100;d++)for(let e=d;e<=100;e++){const s=[a,b,72,d,e];if(sum(s)!==350||e-a!==20)continue;const c={};s.forEach((v)=>c[v]=(c[v]||0)+1);if(Object.values(c).includes(3)&&Object.values(c).filter((k)=>k>1).length===1)t2.push(e);}
 assert.deepEqual([...new Set(t2)],[77]);
 assert.equal(100-1-2-18-19,60);assert.equal((2+6+9+12+16)/5,9);assert.equal(60-1-2-10-11,36);
 assert.equal(sum([20,20,80,80,100])/5,60);
 // s4b
 assert.equal((1400+2400)/50,76);assert.equal(62+(86-36)/25,64);assert.equal((320+140+180)/8,80);
 close((2160-810)/20,67.5);close(50/6-10/6,40/6);assert.equal((12*60+8*75)/20,66);
});
