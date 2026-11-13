// Live read-only content checks; dev student login records a login, never answers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const base=path.join(root,'veri/mebi-pratik-2/20261111-source-inventory');
const publication=JSON.parse(fs.readFileSync(path.join(base,'publication-preparation/publication-result.json'),'utf8'));
assert.equal(publication.status,'PUBLISHED');
const {tarayiciAc}=await import('./lib/tarayici.mjs');
const checks=[];
for(const mobile of [false,true]){
 const browser=await tarayiciAc({mobile});
 try{
  await browser.goto('/');await browser.login('student');await browser.goto('/pratik-2');
  await browser.wait("document.body.innerText.includes('MEBI2-2f2b7ab1d291e372-Q001')");
  assert.equal(await browser.evalJs("document.body.innerText.includes('Solunum Sistemi')"),true);
  assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
  const result=await browser.evalJs(`fetch('/api/questions?bank=MEBI_PRACTICE_2&categoryId=excel.ayt.biyoloji.03fef08f029e99373ac8').then(r=>r.json()).then(x=>({total:x.totalElements,answersExposed:JSON.stringify(x).includes('correctAnswer')||JSON.stringify(x).includes('correct_answer')}))`);
  assert.equal(result.total,21);assert.equal(result.answersExposed,false);
  assert.deepEqual(browser.errors,[]);
  checks.push({mobile,total:result.total,answersExposed:false,overflow:false});
 }finally{await browser.close();}
}
const report={status:'PASS',scope:'LIVE_PILOT_CONTENT_READ_ONLY',catalogRun:publication.newRunKey,
 checks,answerWrites:0,teacherDecisionWrites:0};
fs.writeFileSync(path.join(base,'pilot-live-read-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
