// Live content acceptance: read lists/images only; never submit student answers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {tarayiciAc} from './lib/tarayici.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const base=path.join(root,'veri/mebi-pratik-2/20261111-source-inventory');
const out=path.join(base,'verified-source-batch-001');
const publication=JSON.parse(fs.readFileSync(path.join(out,'publication-result.json'),'utf8'));
assert.equal(publication.status,'PUBLISHED');
const facetsOnly=process.argv.includes('--facets-only');
const prior=facetsOnly?JSON.parse(fs.readFileSync(path.join(out,'live-bank-read-before-facet-fix.json'),'utf8')):null;
if(prior){assert.equal(prior.status,'PASS');assert.equal(prior.runKey,publication.newRunKey);}
const admitted=JSON.parse(fs.readFileSync(path.join(base,'single-test-crops/source-pixel-acceptance.json'),'utf8')).accepted;
const categories=new Map();
for(const q of admitted)categories.set(q.categoryId,(categories.get(q.categoryId)||0)+1);
const examCounts={Tümü:admitted.length,TYT:admitted.filter(q=>q.exam==='TYT').length,AYT:admitted.filter(q=>q.exam==='AYT').length};
const samples=[...new Map(admitted.map(q=>[q.exam+':'+q.subject,q])).values()];
const checks=[];
for(const mobile of [false,true]){
 const browser=await tarayiciAc({mobile});
 try{
  await browser.goto('/');await browser.login('student');await browser.goto('/pratik-2');
  await browser.wait("document.body.innerText.includes('MEBI2-')");
  await browser.wait(`Object.entries(${JSON.stringify(examCounts)}).every(([label,count])=>[...document.querySelectorAll('.question-collection-choice')].some(button=>button.querySelector('span')?.textContent===label&&Number(button.querySelector('small')?.textContent)===count))`);
  assert.equal(await browser.evalJs("[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='/pratik-2'&&a.textContent.includes('Soru Çöz & Pratik 2'))"),true);
  assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
  const counts=await browser.evalJs(`(async()=>{
   const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
   const all=await get('/api/questions?bank=MEBI_PRACTICE_2&size=1');
   const categories=[];
   for(const [id,expected] of ${JSON.stringify(facetsOnly?[]:[...categories])}){
    const x=await get('/api/questions?bank=MEBI_PRACTICE_2&size=1&categoryId='+encodeURIComponent(id));
    categories.push({id,expected,total:x.totalElements});
   }
   const images=[];
   for(const sample of ${JSON.stringify(facetsOnly?[]:samples.map(q=>({code:q.code,sha:q.imageSha256})))} ){
    const q=await get('/api/questions/code/'+encodeURIComponent(sample.code));
    const r=await fetch('/api/questions/'+q.id+'/image');if(!r.ok)throw Error('Image HTTP '+r.status);
    const bytes=await r.arrayBuffer();const digest=await crypto.subtle.digest('SHA-256',bytes);
    const sha=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
    images.push({code:sample.code,sha,expected:sample.sha});
   }
   return {total:all.totalElements,categories,images,answersExposed:JSON.stringify(all).includes('correctAnswer')||JSON.stringify(all).includes('correct_answer')};
  })()`);
  assert.equal(counts.total,admitted.length);assert.equal(counts.answersExposed,false);
  for(const c of counts.categories)assert.equal(c.total,c.expected,c.id);
  for(const image of counts.images)assert.equal(image.sha,image.expected,image.code);
  assert.deepEqual(browser.errors,[]);
  await browser.screenshot(path.join(out,mobile?'live-mobile.png':'live-desktop.png'));
  checks.push({mobile,total:counts.total,visibleExamCounts:examCounts,categoriesChecked:counts.categories.length,originalImageHashesChecked:counts.images.length,answersExposed:false,overflow:false});
 }finally{await browser.close();}
}
const report={status:'PASS',scope:facetsOnly?'LIVE_EXAM_FACETS_WITH_UNCHANGED_CATALOG_EVIDENCE':'LIVE_VERIFIED_SOURCE_SUBSET',
 runKey:publication.newRunKey,checks,priorCategoryImageProof:prior?'live-bank-read-before-facet-fix.json':null,answerWrites:0,teacherDecisionWrites:0};
fs.writeFileSync(path.join(out,'live-bank-read-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
