// Read-only live acceptance: no study sessions, answers or teacher decisions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tarayiciAc} from './lib/tarayici.mjs';
const out=path.resolve('veri/mebi-pratik-2/main-bank-transfer');
const before=JSON.parse(fs.readFileSync(path.join(out,'before.json'),'utf8'));
const baselinePath=path.join(out,'live-before.json');
const samples=[...new Map(before.transferCandidates.map(r=>[r.exam+':'+r.subjects.join(','),r])).values()];
const checks=[];
for(const mobile of process.argv.includes('--before')?[false]:[false,true]) {
 const browser=await tarayiciAc({mobile});
 try {
  await browser.goto('/');await browser.login('student');
  const counts=await browser.evalJs(`fetch('/api/questions?bank=OGM&size=1').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(x=>({total:x.totalElements,answerExposed:JSON.stringify(x).includes('correctAnswer')}))`);
  assert.equal(counts.answerExposed,false);
  if(process.argv.includes('--before')) {
   assert.equal(fs.existsSync(baselinePath),false,'Keep frozen pre-transfer baseline');
   fs.writeFileSync(baselinePath,JSON.stringify(counts,null,2)+'\n');
   console.log(JSON.stringify({status:'BASELINE_READY',...counts}));break;
  }
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  assert.equal(counts.total,baseline.total+before.transferCandidates.length);
  const first=samples[0];const params='?examType='+first.exam+'&categoryId='+encodeURIComponent(first.categories[0]);
  await browser.goto('/pratik-2'+params);
  await browser.wait(`location.pathname==='/soru-bankasi'&&location.search===${JSON.stringify(params)}`);
  await browser.wait("document.querySelector('.ag-root')&&document.querySelector('.ag-row')");
  assert.equal(await browser.evalJs("[...document.querySelectorAll('nav a,aside a')].some(a=>a.getAttribute('href')==='/pratik-2')"),false);
  assert.equal(await browser.evalJs("document.body.innerText.includes('Soru Çöz & Pratik 2')"),false);
  assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
  const result=await browser.evalJs(`(async()=>{
   const get=async p=>{const r=await fetch(p);if(!r.ok)throw Error('HTTP '+r.status);return r.json()};
   const legacy=await get('/api/questions?bank=MEBI_PRACTICE_2&source=MEBI2_TYT&size=1');
   const normal=await get('/api/questions?bank=OGM&source=OGM_TYT&size=1');
   const samples=[];
   for(const row of ${JSON.stringify(samples)}) {
    const q=await get('/api/questions/code/'+encodeURIComponent(row.code));
    const list=await get('/api/questions?bank=OGM&examType='+row.exam+'&categoryId='+encodeURIComponent(row.categories[0])+'&size=1');
    const image=await fetch('/api/questions/'+q.id+'/image');
    if(!image.ok)throw Error('Original image unavailable '+row.code);
    samples.push({code:q.code,bank:q.bank,categoryTotal:list.totalElements,imageBytes:(await image.arrayBuffer()).byteLength});
   }
   return {legacyTotal:legacy.totalElements,normalTotal:normal.totalElements,samples};
  })()`);
  assert.equal(result.legacyTotal,result.normalTotal);
  for(const q of result.samples){assert.equal(q.bank,'OGM');assert(q.categoryTotal>0);assert(q.imageBytes>0);}
  await browser.screenshot(path.join(out,mobile?'live-mobile.png':'live-desktop.png'));
  // The existing practice screen and its source options stay in place.
  await browser.goto('/calisma/yeni');
  await browser.wait("document.body.innerText.includes('Soru Bankası')");
  assert.equal(await browser.evalJs("document.body.innerText.includes('Pratik 2')"),false);
  await browser.goto('/calisma/yeni?mode=sinav&bank=MEBI_PRACTICE_2');
  await browser.wait("[...document.querySelectorAll('fieldset')].some(f=>f.querySelector('legend')?.textContent==='Kaynak')");
  const sourceChoices=await browser.evalJs("[...[...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend')?.textContent==='Kaynak').querySelectorAll('label')].map(l=>({label:l.textContent.trim(),checked:l.querySelector('input').checked}))");
  assert.equal(sourceChoices.length,2);
  assert.equal(sourceChoices.filter(s=>s.label.includes('Soru Bankası')).length,1);
  assert.equal(sourceChoices.find(s=>s.label.includes('Soru Bankası')).checked,true);
  assert.equal(sourceChoices.find(s=>s.label.includes('Çıkmış Sorular')).checked,false);
  checks.push({mobile,total:counts.total,legacyUrlAndFilterPreserved:true,mainPracticeUnchanged:true,
    courseExamSamples:result.samples.length,originalImagesReadable:true,answersExposed:false,overflow:false,
    singleMainBankChoice:true,legacyFullExamBankSelectionPreserved:true,
    servedAsset:await browser.evalJs("document.querySelector('script[type=module][src]')?.getAttribute('src')")});
 } finally {await browser.close();}
}
if(!process.argv.includes('--before')) {
 const report={status:'PASS',checks,studentAnswerWrites:0,teacherDecisionWrites:0};
 fs.writeFileSync(path.join(out,'live-acceptance.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
