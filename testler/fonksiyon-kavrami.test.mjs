// Fonksiyon kavramı dersi: keşif modelleri kaba sayımla, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('sayım keşfi: bütün eşlemeleri tek tek kur',()=>{
 for(let m=1;m<=4;m++)for(let n=1;n<=5;n++){
  let all=0,inj=0;for(let code=0;code<n**m;code++){const img=[];let x=code;for(let i=0;i<m;i++){img.push(x%n);x=Math.floor(x/n);}all++;if(new Set(img).size===m)inj++;}
  const r=model('fk-sayi',{m,n});assert.equal(r.all,all);assert.equal(r.inj,inj);assert.equal(r.rel,2**(m*n));
 }
});

test('çeşit keşfi: tek, çift, sabit tanımlarıyla',()=>{
 const xs=[-3,-2,-1,1,2,3];
 for(const a of range(-3,3))for(const b of range(-3,3))for(const c of range(-3,3)){
  const f=(x)=>a*x*x+b*x+c,k=model('fk-cesit',{a,b,c}).k;
  assert.equal(k.includes('tek'),[0,...xs].every((x)=>f(-x)===-f(x)));
  assert.equal(k.includes('çift'),xs.every((x)=>f(-x)===f(x)));
  assert.equal(k.includes('sabit'),xs.every((x)=>f(x)===f(0)));
  assert.equal(k.includes('birim'),[0,...xs].every((x)=>f(x)===x));
 }
});

test('toplam keşfi: f ve g geri bulunur',()=>{
 for(const s of range(-10,10))for(const d of range(-10,10)){const r=model('fk-toplam',{s,d});close(r.f+r.g,s);close(r.f-r.g,d);close(r.p,r.f*r.g);close(r.p,(s*s-d*d)/4);}
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/fonksiyon-kavrami.ders',import.meta.url),'utf8'),'fonksiyon-kavrami');
 for(const [code,answer] of [['TYT-0782','A'],['TYT-0786','D'],['TYT-0788','B']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0782
 const s1=[];for(const a of range(-10,10))for(const b of range(-10,10)){const f=(x)=>a*x-b,g=(x)=>b*x-2;if(f(1)+g(1)===f(1)&&f(2)+g(2)===g(2))s1.push(a*b);}assert.deepEqual(s1,[2]);
 // TYT-0788
 const s2=range(1,20).filter((a)=>(1+a)*(a+1)===(2+a)+(2*a+1));assert.deepEqual(s2,[2]);assert.equal(2*7+1,15);
 // TYT-0786
 assert.deepEqual(range(1,20).filter((b)=>((b+2)/2)*((b-2)/2)===8),[6]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 assert.equal(4**3,64);assert.equal(4*3*2,24);assert.equal(3**3,27);assert.equal(3**4-3,78);
 const pairs=[];for(const a of range(1,8))for(const b of range(1,8))if(b**a===64&&a**b===81)pairs.push(a+b);assert.deepEqual(pairs,[7]);
 assert.equal(5**3,125);assert.equal(4*3,12);
 // s2b
 const s1=[];for(const a of range(-10,10))for(const b of range(-10,10)){const f=(x)=>a*x+b,g=(x)=>b*x-3;if(f(1)-g(1)===f(1)&&f(3)+g(3)===g(3))s1.push(a*b);}assert.deepEqual(s1,[-3]);
 const s2=range(1,20).filter((a)=>(1+a)*(a+3)===(2+a)+(2*a+3));assert.deepEqual(s2,[1]);assert.equal(1*5+3,8);
 { const k=8-6,f=(x)=>2*x+k,g=(x)=>x*x-1;assert.equal(f(3),g(3));assert.equal(f(1)*g(1),0); }
 assert.equal((2+1+1)*(3+5),32);assert.equal(30/3,10);
 assert.deepEqual(range(-10,10).filter((m)=>(2*m+1)+(2+m)===m+11),[4]);
 // s3b
 assert.equal(1+(-1)+0,0);assert.equal(1+4-2,3);assert.equal(7+5,12);assert.equal(-2+6+1,5);
 assert.deepEqual(range(-10,10).filter((a)=>2*a-6===0).map((a)=>a+1),[4]);
 // s4b
 assert.equal(Math.sqrt(4*21+16),10);assert.deepEqual([(11-5)/2,(11+5)/2],[3,8]);
 { const f=(x)=>3*x-1,g=(x)=>2*x+2;assert.equal(f(2)+g(2),11);assert.equal(f(2)-g(2),-1);assert.equal(f(2)*g(2),30); }
 assert.equal((50**2-10**2)/4,600);assert.equal(6/3+6*3,20);
});
