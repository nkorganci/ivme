// Önermeler dersi: keşif modelleri tablo taramasıyla, gerçek sorular ve yeni örnekler bağımsız değerlendirmeyle sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {EXPRS,TABLE_EXPRS} from '../frontend/src/learn/derin/onermeler.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const B=[true,false],rows=[];for(const p of B)for(const q of B)for(const r of B)rows.push([p,q,r]);
const xor=(a,b)=>a!==b;

test('bulma keşfi: uygun üçlüler ve kesin değerler',()=>{
 EXPRS.forEach(([,f],e)=>{for(const v of [0,1]){
  const r=model('on-bul',{e,v});const fits=rows.filter(([p,q,s])=>Boolean(f(p,q,s))===Boolean(v));
  assert.deepEqual(r.fits.map(String),fits.map(String));
  for(const [i,k] of ['p','q','r'].entries())assert.equal(r.fixed.includes(k),fits.length>0&&fits.every((x)=>x[i]===fits[0][i]));
 }});
});

test('tablo keşfi: denklik ve doğru satır sayısı',()=>{
 TABLE_EXPRS.forEach(([,fa],a)=>TABLE_EXPRS.forEach(([,fb],b)=>{
  const r=model('on-tablo',{a,b});const eq=rows.every(([p,q,s])=>Boolean(fa(p,q,s))===Boolean(fb(p,q,s)));
  assert.equal(r.equal,eq);assert.equal(r.ca,rows.filter(([p,q,s])=>fa(p,q,s)).length);
 }));
 // Bilinen denklikler: dağılma, De Morgan, ya da sadeleştirmesi.
 for(const [a,b] of [[0,1],[4,5],[6,7]])assert.equal(model('on-tablo',{a,b}).equal,true);
});

test('ya da zinciri keşfi: eşlik ve satır sayısı',()=>{
 for(let n=2;n<=6;n++){for(let k=0;k<=6;k++){
  const r=model('on-xor',{n,k});const kk=Math.min(k,n);let acc=false;for(let i=0;i<n;i++)acc=xor(acc,i<kk);
  assert.equal(r.value,acc?1:0);
  let cnt=0;for(let m=0;m<2**n;m++){let x=false;for(let i=0;i<n;i++)x=xor(x,Boolean(m>>i&1));if(x)cnt++;}
  assert.equal(r.odd,cnt);assert.equal(cnt,2**(n-1));
 }}
});

test('gerçek sorular: ders bağı ve değerler',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/onermeler.ders',import.meta.url),'utf8'),'onermeler');
 for(const [code,answer] of [['TYT-0748','A'],['TYT-0749','D'],['TYT-0751','E']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 assert.deepEqual(rows.filter(([p,q,r])=>!(p||q)&&r).map(String),[[false,false,true]].map(String));
 assert.deepEqual(rows.filter(([p,q,r])=>!p&&q&&r).map(String),[[false,true,true]].map(String));
 assert.deepEqual(rows.filter(([p,q,r])=>!p&&r&&(p||q)).map(String),[[false,true,true]].map(String));
});

test('yeni örnekler ve sorular: bağımsız değerlendirme',()=>{
 // s1b
 assert.deepEqual(rows.filter(([p,q,r])=>p&&!(q||r)).map(String),[[true,false,false]].map(String));
 assert.deepEqual(rows.filter(([p,q,r])=>(!p&&q)&&(r||p)).map(String),[[false,true,true]].map(String));
 assert.equal(rows.filter(([p,q,r])=>!((p&&!q)||r)).length,3);
 assert.deepEqual(rows.filter(([p,q,r])=>!(!p||q)&&r).map(String),[[true,false,true]].map(String));
 // s2b
 assert.equal(Math.log2(64),6);assert.equal(rows.filter(([p,q,r])=>(p||q)&&!r).length,3);
 assert.ok(rows.every(([p,q,r])=>(p&&(q||r))===((p&&q)||(p&&r))));
 assert.ok(rows.every(([p,q])=>(xor(p,q)&&p)===(p&&!q)));
 assert.equal(2**4,16);assert.equal(rows.filter(([p,q,r])=>(p&&q)||r).length,5);
 // s3b ve s4b
 assert.ok(rows.every(([p,q])=>(!(p||q))===(!p&&!q)));
 assert.equal([1,0,1,1,0].reduce((a,x)=>a^x,0),1);
 assert.ok(rows.filter(([p,q,r])=>xor(p,q)&&xor(q,r)).every(([p,,r])=>p===r));
 assert.ok(rows.filter(([p,q,r])=>xor(p,q)&&xor(q,r)).every(([p,q,r])=>xor(xor(p,q),r)===!r));
 { const q=true,p=!q;assert.equal(xor(p||q,!p&&!q),true); }
 assert.equal(xor(true,true),false);assert.equal(rows.filter(([p,q,r])=>xor(xor(p,q),r)).length,4);
});
