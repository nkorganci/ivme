// Bileşke ve ters fonksiyon dersi: keşif modelleri tanımlarla, gerçek soruların modelleri ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {F,G} from '../frontend/src/learn/derin/bileske-ters.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('zincir keşfi: tablolarla bileşke',()=>{
 for(const x of [1,2,3,4]){const r=model('bt-zincir',{x});assert.equal(r.fg,F[G[x]]);assert.equal(r.gf,G[F[x]]);}
});

test('ters keşfi: f(f⁻¹(y)) = y',()=>{
 for(const m of [-3,-2,-1,1,2,3])for(const n of range(-4,6))for(const y of range(-6,12)){const r=model('bt-ters',{m,n,y});close(m*r.inv+n,y);if(r.fixed!==null)close(m*r.fixed+n,r.fixed);}
});

test('ters bileşke keşfi: doğru sıra geri alır',()=>{
 for(const k of range(1,4))for(const p of range(-5,5))for(const y of range(-10,30)){const r=model('bt-ters-bileske',{k,p,y});close(k*r.right+p,y);assert.equal(Math.abs(r.right-r.wrong)<1e-9,p*(k-1)===0);}
});

test('gerçek sorular: modeller ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/bileske-ters.ders',import.meta.url),'utf8'),'bileske-ters');
 for(const [code,answer] of [['TYT-0783','A'],['TYT-0785','A'],['TYT-0791','B']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0785: f(g(f(2))) iki yoldan
 const fg=(x)=>x*x+3*x+1,gf=(x)=>x*x-x+1;assert.equal(fg(1),5);assert.equal(gf(2),3);
 // TYT-0791 benzeri doğrular: eşlemeyi tara
 const L={A:(x)=>1-0.5*x,B:(x)=>0.5-0.5*x,C:(x)=>0.5*x};const names=Object.keys(L);const ok=[];
 for(const f of names)for(const g of names)for(const h of names){if(new Set([f,g,h]).size<3)continue;const v1=L[f](L[g](1)),v2=L[f](L[h](1)),v3=L[g](L[h](1));if(Math.abs(v1-v2)<1e-9&&Math.abs(v2-v3)<1e-9)ok.push(f+g+h);}
 assert.deepEqual(ok,['BCA']);const a=L.C(L.B(1)),b=L.A(L.B(1)),c=L.A(L.C(1));assert.ok(a<c&&c<b);close(a+b+c,1.75);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 for(let i=1;i<100;i++){const a=i/100,b=(3-a)+1,c=3-(a+1);assert.ok(a<c&&c<b);}
 const f={1:3,2:1,3:2},g={1:2,2:3,3:1};assert.equal(f[g[f[2]]],1);
 close(1.1*(700/35),22);assert.equal((2*9-1)-(2*3-1)**2,-8);
 // s2b
 { const f=(x)=>x+1,g=(x)=>x*x;assert.equal(f(g(f(1))),5);assert.equal(f(4),5);assert.equal(f(g(2)),5); }
 { const f=(x)=>x-2,g=(x)=>2*x+5;assert.equal(f(g(0)),3);assert.equal(g(f(0)),1);assert.equal(g(3),11);assert.equal(g(f(g(0))),11); }
 { const f=(x)=>2*x-3,g=(x)=>2*x+1;assert.equal(f(g(2)),7);assert.equal(f(5),7); }
 { const f=(x)=>x+3,g=(x)=>3*x-5;assert.equal(f(g(4)),10);assert.equal(g(f(1)),7);assert.equal(f(7),10);assert.equal(f(1),4); }
 { const f=(x)=>x+2,g=(x)=>x*x-1;assert.equal(f(g(2)),5);assert.equal(g(f(0)),3);assert.equal(f(3),5);assert.equal(f(0),2); }
 // s3b
 close((9-5)/2,2);close((3*8/3)+1,9);assert.equal(2**3+2,10);assert.equal((5+1)/2+(3+1)/2,5);
 assert.equal(5+2,7);close(3*2-4,2);close((68-32)/1.8,20);close(4*1-3,1);
 // s4b
 { const f=(x)=>2*x+1,g=(x)=>x-3;assert.equal(f(g(7)),9); }
 { const f=(x)=>3*x-1,h=(x)=>2*x+2;assert.ok(range(-5,5).every((x)=>f(h(x))===6*x+5)); }
 assert.equal((Math.cbrt(8)+4)**3,216);assert.equal((23-5)/3,6);close(20/4-2,3);
});
