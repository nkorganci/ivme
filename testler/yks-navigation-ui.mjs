import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {startLearnMock} from './lib/learn-mock.mjs';
import {preferredCurriculumCategories} from '../frontend/src/curriculumNavigation.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const control=path.join(root,'veri/yks-birlestirme');
const run=JSON.parse(fs.readFileSync(path.join(control,'current.json'),'utf8')).runId;
const file=path.join(control,run,'yol-uyumluluk/maintenance-candidate.json');
const bytes=fs.readFileSync(file),candidate=JSON.parse(bytes);
const mock=await startLearnMock(root,{metadata:{summary:{},branches:[],categories:candidate.categories,
  curriculumNavigation:candidate.curriculumNavigation,
  curriculumCategories:preferredCurriculumCategories(candidate.curriculumNavigation,candidate.categories)}});
const {tarayiciAc}=await import('./lib/tarayici.mjs');
const out=path.join(control,run,'yol-uyumluluk/ui');fs.mkdirSync(out,{recursive:true});
const checks=[];
try {
  for(const mobile of [false,true]) {
    const browser=await tarayiciAc({mobile});
    try {
      await browser.goto('/konuyu-ogrenelim/harita?ders=fizik');
      await browser.wait("document.querySelector('a[href=\"/konuyu-ogrenelim/fizik/hareket-kuvvet\"]')");
      assert.equal(await browser.evalJs("document.querySelectorAll('a[href=\"/konuyu-ogrenelim/fizik/hareket-kuvvet\"]').length"),1);
      const course=candidate.curriculumNavigation.courses.find(c=>c.exam==='TYT'&&c.subjectId==='fizik');
      const first=course.units[0].topics[0].title;
      assert.ok(await browser.evalJs(`document.body.textContent.includes(${JSON.stringify(first)})`));
      assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
      await browser.screenshot(path.join(out,mobile?'mebi-mobil.png':'mebi-masaustu.png'));
      await browser.evalJs("document.querySelector('a[href=\"/konuyu-ogrenelim/fizik/hareket-kuvvet\"]').click()");
      await browser.wait("document.querySelector('.ph-experiment')");
      assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.failedRequests,[]);
      checks.push({mobile,providerFirstTopic:first,oldPilotLinks:1,oldPilotOpened:true,overflow:false,errors:0});
    } finally {await browser.close();}
  }
  const report={status:'PASS',scope:'PREPARED_NAVIGATION_ISOLATED_UI',sourceSha256:createHash('sha256').update(bytes).digest('hex'),
    checks,studentDatabaseWrites:0};
  fs.writeFileSync(path.join(out,'navigation-ui-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally {await mock.close();}
