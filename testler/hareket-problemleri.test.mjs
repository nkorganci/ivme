// Hareket dersi: keşif modelleri adım adım benzetimle, gerçek sorular ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,msg??`${a} ≠ ${b}`);

test('karşılaşma keşfi: kalan süreler ve t² = tA·tB',()=>{
 for(const d of range(120,600,60))for(const va of range(20,120,10))for(const vb of range(20,120,10)){
  const r=model('hp-karsilasma',{d,va,vb});
  close(va*r.t+vb*r.t,d);close(va*r.ta,vb*r.t);close(vb*r.tb,va*r.t);close(r.t*r.t,r.ta*r.tb);
 }
});

test('aradaki uzaklık keşfi: dakika dakika yürüyüşle aynı',()=>{
 for(const v1 of range(50,200,30))for(const v2 of range(50,200,30))for(const d1 of range(200,1600,200))for(const d2 of range(200,1600,300)){
  const r=model('hp-aralik',{v1,v2,d1,d2});
  // Küçük adımlarla iki kişiyi yürüt; hedefe varan durur.
  let a=0,b=0;const dt=1/64;
  for(let t=0;t<r.last-1e-9;t+=dt){a=Math.min(d1,a+v1*dt);b=Math.min(d2,b+v2*dt);}
  close(a+b,r.total);close(r.mid,v1*Math.min(r.first,d1/v1)+v2*Math.min(r.first,d2/v2));
  if(d1/v1!==d2/v2)assert.equal(r.after,d1/v1<d2/v2?v2:v1);
 }
});

test('pist keşfi: karşılaşma anları benzetimle',()=>{
 for(const c of range(200,1000,200))for(const v1 of range(20,100,20))for(const v2 of range(10,90,20))for(const op of [0,1,2]){
  const r=model('hp-pist',{c,v1,v2,op,n:4});
  if(op===1&&v1===v2){assert.equal(r.t,null);continue;}
  // Aradaki yay uzunluğu: koşucuların biri diğerine doğru ne kadar yol kapattı.
  const start=op===2?c/2:c,closing=op===1?Math.abs(v1-v2):v1+v2;
  const meets=[];for(let k=1;k<=4;k++)meets.push((start+(k-1)*c)/closing);
  r.times.forEach((t,i)=>close(t,meets[i]));
  // Karşılaşma anında iki koşucunun pist üzerindeki konumu aynı olmalı.
  for(const t of r.times){const p1=((v1*t)%c+c)%c,p2=op===1?((v2*t)%c+c)%c:(((op===2?c/2:0)-v2*t)%c+c)%c;const diff=Math.abs(p1-p2);assert.ok(diff<1e-6||Math.abs(diff-c)<1e-6,`${c},${v1},${v2},${op}`);}
 }
});

test('gerçek sorular: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/hareket-problemleri.ders',import.meta.url),'utf8'),'hareket-problemleri');
 for(const [code,answer] of [['TYT-0666','B'],['TYT-0673','D'],['TYT-0685','A'],['TYT-0700','E']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0673: hız oranı r = VA/VB; AC = r·t·VB, kalan süreler 250 ve 160.
 assert.deepEqual(range(1,400).filter(t=>t*t===250*160),[200]);
 // TYT-0700: hızlar toplamı 350, kırılmadan sonra 150; Esra'nın okulu daha uzak.
 const sols=[];for(const vB of range(10,340,10)){const vE=350-vB;for(const [first,other] of [[vB,vE],[vE,vB]])if(other===150){const dB=first===vB?vB*4:vB*6,dE=first===vE?vE*4:vE*6;if(dE>dB&&dB+dE===1700)sols.push(dB);}}
 assert.deepEqual(sols,[800]);
 // TYT-0685: B'den 3. geçiş 180 sn, 7. geçiş 480 sn.
 assert.deepEqual(range(1,200).filter(f=>range(1,200).some(T=>f<T&&f+2*T===180&&f+6*T===480)),[30]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 assert.deepEqual(range(1,20).filter(t=>Math.abs(t-t/1.25-1)<1e-9),[5]);
 assert.deepEqual(range(1,20).filter(t=>Math.abs(t-t/1.2-1)<1e-9),[6]);
 close(21/7*4,12);
 assert.deepEqual(range(1,500).filter(P=>(P+32)*5===7*P),[80]);
 close(60*6/4-60,30);close(24*30/40,18);close(30*24/20,36);
 // s2b
 close(Math.sqrt(90*40),60);close(Math.sqrt(9*16),12);close(Math.sqrt(4*9),6);
 { const v=1,t=4,ac=3*v*t,cb=v*t;close(cb/(3*v)*60,80);close(ac/v,12); }
 { const kt=60;assert.equal(3*kt,180);assert.equal(4*kt,60+180); }
 assert.deepEqual(range(1,40,0.5).filter(t=>40*t+60===60*(t-0.5)-60),[7.5]);assert.equal(40*7.5+60,360);
 // s3b
 assert.equal((1500/5-600/3)*5,500);assert.equal(600/3*8+500,2100);
 assert.deepEqual(range(0,6,0.5).filter(t=>Math.abs(40*t-(60+20*t))===40),[1,5]);
 close(200/5,40);assert.equal(80+30*0,80);assert.equal((120/4)*(6-4),60);
 assert.equal((900/3-200/2)*3,600);
 // s4b
 assert.deepEqual(range(1,200).filter(f=>range(1,300).some(T=>f<T&&f+T===200&&f+5*T===680)),[80]);
 assert.equal(20+4*40,180);assert.equal(15+3*30,105);
 { const t=720/72;assert.equal(t,10);assert.equal((24*10*3)%720,0);assert.notEqual((24*10*2)%720,0); }
 close(24*3/16,4.5);
 assert.deepEqual(range(1,500).filter(d=>Math.abs(d/30+d/70-10)<1e-9),[210]);
 close(180/((70-52)/3.6),36);close(400/(5-3),200);
});
