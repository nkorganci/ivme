import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tarayiciAc} from './lib/tarayici.mjs';
const batch=process.argv.find(a=>a.startsWith('--batch-dir='))?.slice(12);
if(!batch||path.basename(batch)!==batch||!batch.startsWith('verified-source-batch-'))throw Error('Unsafe batch directory');
const folder=path.resolve('veri/mebi-pratik-2/20261111-source-inventory',batch);
const report=JSON.parse(fs.readFileSync(path.join(folder,'report.json'),'utf8'));
const inputs=JSON.parse(fs.readFileSync(path.join(folder,'resource-inputs.json'),'utf8'));
const counts={TYT:report.beforeBankByExam.TYT||0,AYT:report.beforeBankByExam.AYT||0};
for(const row of inputs)counts[row.exam]++;
counts.Tümü=counts.TYT+counts.AYT;
const sample=[...new Map(inputs.map(q=>[q.exam+':'+q.subject,q])).values()];
const hashes=Object.fromEntries(report.images.map(r=>[r.code,r.sha256]));
const checks=[];
for(const mobile of [false,true]){
 const browser=await tarayiciAc({mobile});
 try{
  await browser.goto('/');await browser.login('student');await browser.goto('/pratik-2');
  await browser.wait(`Object.entries(${JSON.stringify(counts)}).every(([label,count])=>[...document.querySelectorAll('.question-collection-choice')].some(button=>button.querySelector('span')?.textContent===label&&Number((button.querySelector('small')?.textContent||'').replace(/[^0-9]/g,''))===count))`);
  assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
  const value=await browser.evalJs(`(async()=>{
   const all=await fetch('/api/questions?bank=MEBI_PRACTICE_2&size=1').then(r=>r.json());
   const samples=[];
   for(const row of ${JSON.stringify(sample.map(q=>({code:q.code,categoryId:q.categoryIds[0]})))}){
    const q=await fetch('/api/questions/code/'+encodeURIComponent(row.code)).then(r=>r.json());
    const r=await fetch('/api/questions/'+q.id+'/image');if(!r.ok)throw Error('Image HTTP '+r.status);
    const digest=await crypto.subtle.digest('SHA-256',await r.arrayBuffer());
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    const category=await fetch('/api/questions?bank=MEBI_PRACTICE_2&size=1&categoryId='+encodeURIComponent(row.categoryId)).then(r=>r.json());
    samples.push({code:row.code,hash,subject:q.subject,topic:q.topic,categoryTotal:category.totalElements});
   }
   return {total:all.totalElements,answersExposed:JSON.stringify(all).includes('correctAnswer')||JSON.stringify(all).includes('correct_answer'),samples};
  })()`);
  assert.equal(value.total,counts.Tümü);assert.equal(value.answersExposed,false);
  for(const row of value.samples){const expected=inputs.find(q=>q.code===row.code);assert.equal(row.hash,hashes[row.code]);assert.equal(row.subject,expected.subject);assert.equal(row.topic,expected.topic);assert.ok(row.categoryTotal>0);}
  assert.deepEqual(browser.errors,[]);await browser.screenshot(path.join(folder,mobile?'live-mobile.png':'live-desktop.png'));
  checks.push({mobile,counts,originalImagesChecked:value.samples.length,answersExposed:false,overflow:false});
 }finally{await browser.close();}
}
const result={status:'PASS',scope:'LIVE_NEW_SOURCE_BATCH_READ_ONLY',checks,studentAnswerWrites:0,teacherDecisionWrites:0};
fs.writeFileSync(path.join(folder,'live-bank-read-report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
