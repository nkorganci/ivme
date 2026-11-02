// Fonksiyon grafikleri dersi: keşif modelleri sayısal taramayla, gerçek soruların modelleri ve yeni örnekler bağımsız hesapla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
import {cubic} from '../frontend/src/learn/derin/fonksiyon-grafikleri.js';
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} ≠ ${b}`);
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('sıra keşfi: değerler ve kesişim',()=>{
 for(let i=0;i<=20;i++)for(let j=0;j<=10;j++){const t=i*0.05,n=j*0.05,r=model('fg-sira',{t,n});
  const vals={f:0.4+0.6*t,g:t,h:n+0.5*t};for(let k=1;k<r.order.length;k++)assert.ok(vals[r.order[k-1][0]]<=vals[r.order[k][0]]+0.006);
  close(r.cross,Math.round(2*n*100)/100,1e-9);}
});

test('yatay doğru keşfi: çözümleri yoğun taramayla say',()=>{
 for(let k=-1;k<=5;k+=0.5){const r=model('fg-yatay',{k});r.sols.forEach((x)=>close(cubic(x),k,1e-6));
  // [0, 4] aralığını sık örnekle; f(x) ≈ k olan noktaları ardışık kümelere ayırıp say.
  let clusters=0,inside=false;const N=400000;
  for(let i=0;i<=N;i++){const x=4*i/N,near=Math.abs(cubic(x)-k)<2e-4;if(near&&!inside)clusters++;inside=near;}
  assert.equal(r.sols.length,clusters,`k=${k}`);
 }
 assert.deepEqual([2,0,4,5].map((k)=>model('fg-yatay',{k}).sols.length),[3,2,2,0]);
});

test('işaret keşfi: tam sayı taraması',()=>{
 for(const p of range(-4,4))for(const q of range(-4,4))for(const op of [0,1]){const r=model('fg-isaret',{p,q,op});
  const neg=range(-6,6).filter((x)=>op===0?(x-p)*(x-q)<0:(x!==q&&(x-p)/(x-q)<0));assert.deepEqual(r.neg,neg);}
});

test('gerçek sorular: ders bağı ve örnek modeller',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/fonksiyon-grafikleri.ders',import.meta.url),'utf8'),'fonksiyon-grafikleri');
 for(const [code,answer] of [['TYT-0787','B'],['TYT-0789','A'],['TYT-0790','C']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0790'a uyan doğrular: f siyah, g kırmızı, h mavi
 const f=(x)=>0.4+0.6*x,g=(x)=>x,h=(x)=>0.25+0.5*x;const b=0.5,a=(g(b)-0.4)/0.6;assert.ok(a>0&&a<b);assert.ok(g(a)<h(a)&&h(a)<f(a));
 // TYT-0787 benzeri: x^3-6x^2+9x = 2 kökleri ve g=(x-2)^2
 const roots=[2-Math.sqrt(3),2,2+Math.sqrt(3)];roots.forEach((x)=>close(cubic(x),2));const G=roots.map((x)=>(x-2)**2);assert.ok(G[1]<G[0]);close(G[0],G[2]);
});

test('yeni örnekler ve sorular: bağımsız hesap',()=>{
 // s1b
 const table={red:[5,4,1],black:[3,2,4],blue:[1,2,3]};const names=Object.keys(table);let found=null;
 for(const F of names)for(const G of names)for(const H of names){if(new Set([F,G,H]).size<3)continue;
  if((table[F][0]-table[G][0])*(table[F][0]-table[H][0])<0&&(table[G][1]-table[H][1])*(table[G][1]-table[F][1])>0)found=[F,G,H];}
 assert.deepEqual(found,['black','red','blue']);assert.ok(table.red[2]<table.blue[2]&&table.blue[2]<table.black[2]);
 assert.equal((4-1)/(2-1),3);assert.ok(2*1+1<1+4&&2*5+1>5+4);assert.deepEqual([3*1-2,1+2,4],[1,3,4]);
 // s2b
 assert.deepEqual([0,2,4].map((k)=>model('fg-yatay',{k}).sols.length),[2,3,2]);
 { const up=(x)=>1+2*x,down=(x)=>5-2*(x-2);assert.equal(up(1),3);assert.equal(down(3),3); }
 assert.deepEqual(range(-10,10).filter((x)=>x*x-6*x+10===5),[1,5]);
 // s3b
 assert.deepEqual(range(-10,10).filter((x)=>(x-3)*(x+1)<0),[0,1,2]);
 assert.equal(range(-10,10).filter((x)=>x!==4&&(x+2)/(x-4)<=0).length,6);
 const fsign=(x)=>(x+2)*(x-2),gsign=(x)=>x;assert.ok(fsign(-1)*gsign(-1)>0&&fsign(1)*gsign(1)<0&&fsign(3)*gsign(3)>0&&fsign(-3)*gsign(-3)<0);
 assert.ok([-3,0.5,2,3.9].every((x)=>(x-1)**2*(x-4)<0));assert.equal((1-1)**2*(1-4)+0,0);
 assert.equal(range(-10,10).filter((x)=>(x+3)*(x-2)<0).reduce((s,x)=>s+x,0),-2);
 // s4b
 assert.equal((200-50)/(5-3),75);assert.deepEqual([200+300,50+500],[500,550]);
 assert.equal((520-840)/(7-3),-80);assert.equal(840+3*80,1080);close(1080/80,13.5);
 close(24-0.006*1500,15);close(24/0.006,4000);
 assert.equal((300-100)/20,10);close(300/40,7.5);assert.equal(100/20,5);assert.ok(100+20*11>300&&40*11>300);
 close((120-60)/8,7.5);assert.equal(60+8*9,132);assert.equal((60-30)/(12-9),10);
});
