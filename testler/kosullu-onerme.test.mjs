// Koşullu önerme dersi: keşif modelleri tablo taramasıyla, gerçek sorular ve yeni örnekler bağımsız değerlendirmeyle sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {IMP_EXPRS,SETS,OPEN} from '../frontend/src/learn/derin/kosullu-onerme.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const imp=(a,b)=>!a||b;
const B=[true,false],rows=[];for(const p of B)for(const q of B)for(const r of B)rows.push([p,q,r]);

test('ise keşfi: uygun üçlüler',()=>{
 IMP_EXPRS.forEach(([,f],e)=>{for(const v of [0,1]){const r=model('ko-ise',{e,v});assert.deepEqual(r.fits.map(String),rows.filter(([p,q,s])=>Boolean(f(p,q,s))===Boolean(v)).map(String));}});
});

test('denk keşfi: karşıt ters asılla, karşıt tersle aynı',()=>{
 for(const p of [0,1])for(const q of [0,1]){
  const r=model('ko-denk',{p,q}),P=Boolean(p),Q=Boolean(q);
  assert.deepEqual(r.vals,[imp(P,Q),imp(Q,P),imp(!P,!Q),imp(!Q,!P),!P||Q]);
  assert.equal(r.vals[0],r.vals[3]);assert.equal(r.vals[1],r.vals[2]);assert.equal(r.vals[0],r.vals[4]);
 }
});

test('niceleyici keşfi: karşı örnek ve tanık',()=>{
 SETS.forEach(([,set],s)=>OPEN.forEach(([,f],o)=>{for(const k of [0,1]){
  const r=model('ko-nicel',{s,o,k});assert.equal(r.value,k===0?set.every(f):set.some(f));
  if(r.witness!==undefined)assert.equal(Boolean(f(r.witness)),k===1);
 }}));
});

test('gerçek sorular: değerler ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/kosullu-onerme.ders',import.meta.url),'utf8'),'kosullu-onerme');
 for(const [code,answer] of [['TYT-0750','C'],['TYT-0752','A'],['TYT-0753','A']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0750: r ≡ 0 (yaş 53); (p⇒q')∧r' ≡ 0
 const opts=[[160,56],[165,58],[166,62],[171,59],[172,64]];
 assert.deepEqual(opts.filter(([h,w])=>!(imp(w>60,!(h>=164&&h<=170))&&true)),[[166,62]]);
 // TYT-0752
 assert.deepEqual(rows.filter(([p,q,r])=>!imp(imp(p,q),imp(r,q))).map(String),[[false,false,true]].map(String));
 // TYT-0753: beş araba dizilimleri
 const perms=(a)=>a.length<2?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map((r)=>[x,...r]));
 const mids=new Set();for(const o of perms(['A','B','C','D','E'])){const pos=(x)=>o.indexOf(x),p=Math.abs(pos('A')-pos('B'))===2,q=Math.abs(pos('B')-pos('C'))===3,r=Math.abs(pos('C')-pos('D'))===4;if(!imp(p||q,imp(r,p)))mids.add(o[2]);}
 assert.deepEqual([...mids],['A']);
});

test('yeni örnekler: bağımsız değerlendirme',()=>{
 // s1b benzerleri
 const opts=[[165,68],[175,65],[175,72]];assert.deepEqual(opts.filter(([h,w])=>!(imp(w<70,!(h>=170&&h<=180)))),[[175,65]]);
 const dates=[[15,3,2010],[3,4,2010],[3,3,2010],[3,4,2011]];
 assert.deepEqual(dates.filter(([d,m,y])=>{const p=d===15,q=m===3,r=y===2010;return !imp(imp(q,p),imp(r,p));}),[[3,4,2010]]);
 assert.deepEqual(rows.filter(([p,q,r])=>!imp(p&&q,imp(q,r))).map(String),[[true,true,false]].map(String));
 // s2b
 const perms=(a)=>a.length<2?[a]:a.flatMap((x,i)=>perms([...a.slice(0,i),...a.slice(i+1)]).map((r)=>[x,...r]));
 const books=perms(['A','B','C','D']).filter((o)=>{const pos=(x)=>o.indexOf(x),p=Math.abs(pos('A')-pos('B'))===2,q=Math.abs(pos('B')-pos('C'))===1,r=Math.abs(pos('C')-pos('D'))===3;return !imp(q||p,imp(r,p));});
 assert.deepEqual(books.map((o)=>o.join('')).sort(),['CBAD','DABC']);assert.ok(books.every((o)=>Math.abs(o.indexOf('A')-o.indexOf('B'))===1));
 const three=perms(['K','L','M']).filter((o)=>!imp(o[0]!=='K',o[1]!=='L'));assert.deepEqual(three.map((o)=>o.join('')),['MLK']);
 const four=perms(['A','B','C','D']).filter((o)=>!imp(o[0]==='A',!(Math.abs(o.indexOf('B')-o.indexOf('C'))===1&&o[3]==='D')));
 assert.deepEqual([...new Set(four.map((o)=>o[1]))].sort(),['B','C']);
 // s3b
 assert.ok(rows.every(([p,q])=>(imp(p,q)&&p)===(p&&q)));
 assert.ok(rows.every(([p,q,r])=>imp(p,imp(q,r))===imp(p&&q,r)));
 assert.ok(rows.every(([p,q])=>((p&&!q)||q)===(p||q)));
 assert.ok(rows.every(([p,q,r])=>imp(imp(p,q)&&imp(q,r),imp(p,r))));
 // s4b
 const Z=[-3,-2,-1,0,1,2,3];assert.equal(Z.every((x)=>x*x-1>=0),false);
 const A=[1,2,3,4,5];assert.ok(A.every((x)=>x+3<9));assert.ok(A.some((x)=>2*x===x+4));
 assert.ok(range0(50).every((x)=>x*x>=x));assert.equal(range0(50,-50).some((x)=>x*x<x),false);
});
function range0(n,start=0){return Array.from({length:n-start+1},(_,i)=>start+i);}
