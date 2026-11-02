// Kâr–zarar dersi: keşif modelleri bağımsız hesapla, gerçek sorular ve benzerleri taramayla sınanır.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';
import {calculateModel,initialValues} from '../frontend/src/learn/lesson/models.js';
const range=(a,b,step=1)=>Array.from({length:Math.floor((b-a)/step)+1},(_,i)=>a+i*step);
const model=(id,v)=>calculateModel(id,{...initialValues(id),...v});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);

test('kâr–zarar keşifleri: fark, kampanya ve karma satış',()=>{
 for(const m of range(40,400,20))for(const p of range(0,60,5))for(const q of range(0,40,5)){
  const r=model('kz-fark',{m,p,q});close(r.gap,m*(100+p)/100-m*(100-q)/100);close(r.gap,m*(p+q)/100);
 }
 for(const f of range(20,200,10))for(const n of range(1,6))for(const op of [0,1,2]){
  // Sepet ürün ürün: ikinci ürünlerde yarım fiyat, %30 her üründe, her üçüncü ürün bedava.
  let paid=0;for(let i=1;i<=n;i++)paid+=op===0?(i%2===0?f/2:f):op===1?0.7*f:(i%3===0?0:f);
  const r=model('kz-kampanya',{f,n,op});close(r.paid,paid);close(r.pct,100*(f*n-paid)/(f*n));
 }
 for(const a of range(10,90,10))for(const p of range(-40,60,5))for(const q of range(-40,60,5)){
  const r=model('kz-karma',{a,p,q});const revenue=a*(1+p/100)+(100-a)*(1+q/100);close(r.revenue,revenue);
  assert.ok(r.total>=Math.min(p,q)-1e-9&&r.total<=Math.max(p,q)+1e-9);
 }
});

test('kâr–zarar gerçek soruları: bağımsız tarama ve ders bağı',()=>{
 const lesson=parseLesson(readFileSync(new URL('../frontend/src/learn/content/dersler/kar-zarar.ders',import.meta.url),'utf8'),'kar-zarar');
 for(const [code,answer] of [['TYT-0649','D'],['TYT-0658','D'],['TYT-0672','A']]){assert.equal(WORKED_EXAMS[code].answer,answer);assert.ok(lesson.practiceIds.includes(code),code);}
 // TYT-0649: ev 450 000 / 3000 m² → 3200; arsa 20 000 → 25 000
 const m2=450000/3000,sale=m2*3200,donum=sale/20000;assert.equal(donum*25000-sale,120000);
 // TYT-0658: 45 + p − 5·2 = 43 ve 45 + p ≥ 50
 assert.deepEqual(range(1,30).filter(p=>45+p-10===43&&45+p>=50),[8]);
 // TYT-0672: kırmızı 2 kalem f + f/2, mavi 2·0,7f, fark 4,5
 assert.deepEqual(range(1,200).filter(f=>Math.abs((f+f/2)-1.4*f-4.5)<1e-9),[45]);
});

test('yeni örnekler ve benzer sorular: bağımsız hesap',()=>{
 assert.deepEqual(range(10,400,10).filter(M=>Math.abs(1.2*M-0.95*M-30)<1e-9),[120]);
 assert.deepEqual(range(10,500,10).filter(M=>Math.abs(0.12*M-30)<1e-9),[250]);
 assert.deepEqual(range(1,1000).filter(x=>4*x-660>=x)[0],220);
 assert.deepEqual(range(1,1000).filter(x=>Math.abs(4*x-660-1.25*x)<1e-9),[240]);
 close(480/(540/1.35)*100-100,20);
 assert.deepEqual(range(100,3000,50).filter(M=>Math.abs(1.2*M-1800)<1e-9&&Math.abs(0.9*M-1350)<1e-9),[1500]);
 assert.deepEqual(range(10,500,10).filter(M=>Math.abs(1.3*M-1.15*M-36)<1e-9),[240]);
 // s2b benzerleri
 assert.deepEqual(range(1,200).filter(f=>Math.abs(2*0.75*f-(f+0.4*f)-6)<1e-9),[60]);
 assert.deepEqual(range(1,40).filter(p=>72+p-9===75&&72+p>=80),[12]);
 close(88-88/1.1,8);close(150*1.08+135,297);close(236-236/1.18,36);close(200*1.05+180,390);
 assert.ok(0.25*2000>400&&0.25*1200<400&&0.25*1600===400);
 // s3b
 close((90-50)/50*100,80);close((84-70)/70*100,20);close(1.3*1.1*0.8,1.144);close(0.75*1.4,1.05);close((90-80)/80*100,12.5);close((75-60)/60*100,25);close((100-80)/80*100,25);
 // s4b
 const cift=Array.from({length:600},()=>20).length*25/750;assert.equal(cift*900-600*25,3000);
 assert.equal(2*13+4*12+4*8,106);close((120/1.2+120/0.8-240)/(120/1.2+120/0.8)*100,4);
 assert.equal((128-4*14)/6,12);assert.equal(100/(7/4-9/6),400);
 close(50*1.3+50*0.9,110);close(0.75*30+0.25*-10,20);close(25*1.4+75*1.2,125);
});
