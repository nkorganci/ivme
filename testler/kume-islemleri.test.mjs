// Küme işlemleri dersi: keşif modelleri somut kümelerle, gerçek sorular ve yeni örnekler bağımsız taramayla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {CONDS} from '../frontend/src/learn/derin/kume-islemleri.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const pairs=(a)=>a.flatMap((x,i)=>a.slice(i+1).map((y)=>[x,y]));

test('üç küme keşfi: bölgelerden somut kümeler',()=>{
 for(const a of [10,20,30])for(const b of [10,15,30])for(const c of [10,25])for(const ab of [0,4,10])for(const ac of [2,6])for(const bc of [0,8])for(const abc of [0,2,4]){
  const r=model('ki-uc',{a,b,c,ab,ac,bc,abc});if(!r.valid)continue;
  // Bölgelere etiketli elemanlar koyup kümeleri gerçekten kur.
  const A=new Set(),B=new Set(),C=new Set();let id=0;const put=(n,...S)=>{for(let i=0;i<n;i++){id++;S.forEach((s)=>s.add(id));}};
  put(r.r.a,A);put(r.r.b,B);put(r.r.c,C);put(r.r.ab,A,B);put(r.r.ac,A,C);put(r.r.bc,B,C);put(r.r.abc,A,B,C);
  assert.equal(A.size,a);assert.equal(B.size,b);assert.equal(C.size,c);assert.equal(new Set([...A,...B,...C]).size,r.union);
  assert.equal([...A].filter((x)=>B.has(x)).length,ab);
 }
});

test('sınır keşfi: kesişimin bütün olası değerleri',()=>{
 for(const e of [10,15,20])for(let a=1;a<=e;a++)for(let b=1;b<=e;b++){
  const r=model('ki-sinir',{e,a,b});const possible=[];
  for(let k=0;k<=Math.min(a,b);k++)if(a+b-k<=e)possible.push(k);
  assert.equal(r.lo,Math.min(...possible));assert.equal(r.hi,Math.max(...possible));
 }
});

test('kartezyen keşfi: hücre sayımı',()=>{
 for(let na=1;na<=6;na++)for(let nb=1;nb<=6;nb++)CONDS.forEach(([,f],c)=>{let n=0;for(let a=1;a<=na;a++)for(let b=1;b<=nb;b++)if(f(a,b))n++;assert.equal(model('ki-kartezyen',{na,nb,c}).count,n);});
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/kume-islemleri.ders',import.meta.url),'utf8'),'kume-islemleri');
 for(const [code,answer] of [['TYT-0757','D'],['TYT-0760','B'],['TYT-0761','E']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0760: 1..9 sayılarını üç bölgeye dağıt.
 const sums=new Set();for(let m=0;m<3**9;m++){const reg=[[],[],[]];let x=m;for(let d=1;d<=9;d++){reg[x%3].push(d);x=Math.floor(x/3);}
  const [AB,I,BA]=reg;if(!pairs(AB).some(([p,q])=>p+q===8)||!pairs(I).some(([p,q])=>Math.abs(p-q)===8)||!pairs(BA).some(([p,q])=>p*q===8))continue;
  const s=(a)=>a.reduce((t,v)=>t+v,0);if(s(AB)!==s(BA))continue;sums.add(s(I));}
 assert.deepEqual([...sums],[17]);
 // TYT-0757: eksik harf sayısı > 3 olan tek seçenek.
 const core=new Set('askerm');const need=(w)=>new Set([...w].filter((ch)=>!core.has(ch))).size;
 assert.deepEqual(['şair','hekim','memur','sanatçı','sekreter'].filter((w)=>need(w)>3),['sanatçı']);
 // TYT-0761
 const ok=(B)=>B(8)&&!B(10);assert.deepEqual([(x)=>x%2===0,(x)=>x>=0&&x<=9,(x)=>x%4===0].map(ok),[false,true,true]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 const ok=(A)=>A(5)&&!A(12);assert.deepEqual([(x)=>x%2===1,(x)=>x>=0&&x<10,(x)=>x%3===0].map(ok),[true,true,false]);
 const core=new Set('kalems');const need=(w)=>new Set([...w].filter((ch)=>!core.has(ch))).size;
 assert.deepEqual(['salam','sele','kitap','kalemlik'].filter((w)=>need(w)>2),['kitap']);
 { const E=[1,2,3,4,5,6,7,8],A=E.filter((x)=>![1,2,7,8].includes(x)),B=E.filter((x)=>![2,3,4,8].includes(x));
   assert.deepEqual(A.filter((x)=>B.includes(x)),[5,6]);assert.deepEqual(A.filter((x)=>!B.includes(x)),[3,4]); }
 const ok2=(A)=>A(3)&&A(6)&&!A(9);assert.deepEqual([(x)=>x%3===0,(x)=>x%2===0&&x<10,(x)=>x>=1&&x<=6].map(ok2),[false,false,true]);
 // s2b
 const sols=[];for(let m=0;m<3**8;m++){const reg=[[],[],[]];let x=m;for(let d=1;d<=8;d++){reg[x%3].push(d);x=Math.floor(x/3);}
  const [AB,I,BA]=reg,s=(a)=>a.reduce((t,v)=>t+v,0);if(pairs(AB).some(([p,q])=>p+q===7)&&pairs(I).some(([p,q])=>Math.abs(p-q)===6)&&pairs(BA).some(([p,q])=>p*q===6)&&s(AB)===s(BA))sols.push(s(I));}
 assert.deepEqual(sols,[22]);
 assert.equal(18+15+12-6-5-4+2,32);assert.equal(40-32,8);assert.equal((6-2)+(5-2)+(4-2)+2,11);
 assert.equal((18-6-5+2)+(15-6-4+2)+(12-5-4+2),21);assert.equal(25+20-35,10);assert.equal(20+14+10-6-4-3+2,33);
 // s3b
 assert.deepEqual([Math.max(0,12+8-15),Math.min(12,8)],[5,8]);assert.equal(40-25,15);assert.equal(25+18-40,3);
 assert.equal(35+30-50,15);assert.equal((22+17-30)+17,26);
 // s4b
 let lt=0;for(const a of [1,2,3,4])for(const b of [2,3,5])if(a<b)lt++;assert.equal(lt,7);
 let ev=0;for(const a of [1,2,3,4,5])for(const b of [1,2,3])if((a+b)%2===0)ev++;assert.equal(ev,8);
 { const A=[1,2,3],B=[2,3,4,5],AB=A.flatMap((a)=>B.map((b)=>a+','+b)),BA=B.flatMap((b)=>A.map((a)=>b+','+a));assert.equal(AB.filter((p)=>BA.includes(p)).length,4); }
 assert.equal([1,2].length*[3,4].length,4);assert.equal(2*[1].length,2);
 assert.deepEqual([[3,4],[4,3]].filter(([a,b])=>a>b).map(([a])=>a*a),[16]);
});
