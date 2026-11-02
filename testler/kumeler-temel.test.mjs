// Kümeler temel dersi: keşif modelleri kaba sayımla, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {WORDS} from '../frontend/src/learn/derin/kumeler-temel.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const set=(w)=>new Set([...w]);
const sum=(a)=>a.reduce((s,x)=>s+x,0);
const subsetsOf=(arr)=>{const out=[];for(let m=0;m<2**arr.length;m++)out.push(arr.filter((_,i)=>m>>i&1));return out;};

test('harf keşfi: kümeler ve kesişim',()=>{
 WORDS.forEach((wa,a)=>WORDS.forEach((wb,b)=>{const r=model('ku-harf',{a,b});const A=set(wa),B=set(wb);
  assert.equal(r.A.length,A.size);assert.equal(r.B.length,B.size);assert.deepEqual(new Set(r.common),new Set([...A].filter((x)=>B.has(x))));}));
 assert.equal(set('MATEMATİK').size,6);assert.ok(set('MATEMATİK').has('İ')&&!set('MATEMATİK').has('I'));
});

test('ekleme keşfi: alt küme sayıları',()=>{
 for(let n=0;n<=8;n++)for(let k=1;k<=4;k++){const r=model('ku-ekle',{n,k});
  assert.equal(r.before,subsetsOf(Array.from({length:n},(_,i)=>i)).length);assert.equal(r.after,2**(n+k));assert.equal(r.inc,(2**k-1)*r.before);}
});

test('toplam keşfi: içeren alt kümeler ve toplamlar',()=>{
 for(let n=1;n<=6;n++)for(let e=1;e<=6;e++){const r=model('ku-toplam',{n,e});const A=Array.from({length:n},(_,i)=>i+1),S=subsetsOf(A),ee=Math.min(e,n);
  assert.equal(r.withE.length,S.filter((s)=>s.includes(ee)).length);assert.equal(r.sum,sum(S.map(sum)));assert.equal(r.sum,2**(n-1)*sum(A));}
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/kumeler-temel.ders',import.meta.url),'utf8'),'kumeler-temel');
 for(const [code,answer] of [['TYT-0756','B'],['TYT-0758','C'],['TYT-0759','E']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0756: bütün rakam kümesi seçeneklerini tara.
 const digits=[0,1,2,3,4,5,6,7,8,9],sols=new Set();
 for(const A of subsetsOf(digits))for(const B of subsetsOf(digits)){if(A.length!==9||B.length!==6)continue;const a=new Set(A),b=new Set(B);
  if(![0,5,7,2,3].every((d)=>a.has(d))||![0,5,9,4,1].every((d)=>b.has(d)))continue;const I=A.filter((d)=>b.has(d));if(I.join()!=='0,1,4,5,6')continue;sols.add(sum(A.filter((d)=>!b.has(d))));}
 assert.deepEqual([...sols],[20]);
 // TYT-0758
 const as=[];for(let a=-50;a<=50;a++){const B=new Set([2,4,8,a]);if(B.size!==4)continue;const D=new Set([...B].map((x)=>2*x));if([...B].filter((x)=>D.has(x)).length===3)as.push(a);}
 assert.equal(sum(as),17);assert.deepEqual(as,[0,1,16]);
 // TYT-0759
 const X=set('AYLİNBENSU'),base=set('AKINKENAN');
 const ok=['BARIŞ','BİLAL','BURAY','BULUT','BURAK'].filter((nm)=>{const Y=new Set([...base,...nm]);return [...X].filter((x)=>Y.has(x)).sort().join()==='A,B,E,N,U';});
 assert.deepEqual(ok,['BURAK']);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 const X=set('DERYASELMA'),base=set('OKANEMRE');
 assert.deepEqual(['DURSUN','SELİM','DOĞAN'].filter((nm)=>{const Y=new Set([...base,...nm]);return [...X].filter((x)=>Y.has(x)).sort().join()==='A,D,E,M,R,S';}),['DURSUN']);
 const digits=[0,1,2,3,4,5,6,7,8,9],sols=new Set();
 for(const A of subsetsOf(digits))for(const B of subsetsOf(digits)){if(A.length!==8||B.length!==6)continue;const a=new Set(A),b=new Set(B);
  if(![0,5,6,2,9].every((d)=>a.has(d))||![0,5,7,3,8].every((d)=>b.has(d)))continue;if(A.filter((d)=>b.has(d)).join()!=='0,3,5,9')continue;sols.add(sum(A.filter((d)=>!b.has(d))));}
 assert.deepEqual([...sols],[13]);
 assert.equal(set('MATEMATİK').size,6);assert.equal(set('341223').size,4);assert.equal(2**set('KALEMLİK').size,64);
 // s2b
 assert.deepEqual([...Array(12).keys()].filter((n)=>2**(n+2)-2**n===96),[5]);
 const pairs=[];for(let a=0;a<8;a++)for(let b=a;b<8;b++)if(2**a+2**b===68)pairs.push(a+b);assert.deepEqual(pairs,[8]);
 assert.equal(Math.log2(32)+Math.log2(64),11);assert.equal(2**5,32);assert.equal(2**7-2**5,96);
 assert.deepEqual([...Array(12).keys()].filter((n)=>2**(n+3)-2**n===448),[6]);
 // s3b
 assert.equal(sum(subsetsOf([1,2,3,4]).map(sum)),80);
 assert.equal(subsetsOf([-5,-3,0,1,2,3,6]).filter((s)=>s.length&&s.reduce((p,x)=>p*x,1)<0).length,32);
 { const A=[-3,-2,-1,0,1,2,3],B=new Set();for(let i=0;i<7;i++)for(let j=i+1;j<7;j++)B.add(A[i]+A[j]);assert.equal(B.size,11); }
 assert.equal(subsetsOf([1,2,3,4,5,6,7]).filter((s)=>s.includes(1)).length,64);
 assert.equal(sum(subsetsOf([2,4,6,8,10]).map(sum)),480);
 // s4b
 const as=[];for(let a=-100;a<=100;a++){const B=new Set([1,3,9,a]);if(B.size!==4)continue;const D=new Set([...B].map((x)=>3*x));if([...B].filter((x)=>D.has(x)).length===3)as.push(a);}
 assert.equal(sum(as),27);
 const ks=[];for(let k=-20;k<=20;k++){const A=new Set([1,2,5,k]);if(A.size!==4)continue;const D=new Set([...A].map((x)=>x+1));if([...A].filter((x)=>D.has(x)).length===2)ks.push(k);}
 assert.deepEqual(ks,[0,3,4,6]);
 { const A=[0,1,2,3,4],B=A.map((x)=>2*x);assert.equal(A.filter((x)=>B.includes(x)).length,3); }
 const cs=[];for(let a=-50;a<=50;a++){const K=new Set([1,2,4,a]);if(K.size!==4)continue;const D=new Set([...K].map((x)=>2*x));if([...K].filter((x)=>D.has(x)).length===3)cs.push(a);}
 assert.deepEqual(cs,[0,8]);
});
