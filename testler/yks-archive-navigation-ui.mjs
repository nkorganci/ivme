import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {tarayiciAc} from './lib/tarayici.mjs';

const app=fileURLToPath(new URL('..',import.meta.url));
const archive=path.resolve(app,'../Kaynaklar/YKS');
const control=path.join(app,'veri/yks-birlestirme');
const run=JSON.parse(fs.readFileSync(path.join(control,'current.json'),'utf8')).runId;
const folder=path.join(control,run,'arsiv-hazirlik');
const reportFile=path.join(folder,'archive-navigation-report.json');
const source=fs.readFileSync(reportFile),preparation=JSON.parse(source);
const checks=[];
for(const mobile of [false,true]) {
  const browser=await tarayiciAc({mobile});
  try {
    await browser.goto(pathToFileURL(path.join(archive,'index.html')).href);
    await browser.wait("document.querySelectorAll('main .entry').length>1000");
    assert.equal(await browser.evalJs("document.querySelectorAll('main .entry').length"),preparation.providerTopics);
    assert.equal(await browser.evalJs("document.querySelectorAll('main .course').length"),preparation.courses);
    const searches={};
    for(const term of ['Fizik','Deneme','Tarama']) {
      await browser.evalJs(`(()=>{const q=document.getElementById('q');q.value=${JSON.stringify(term)};q.dispatchEvent(new Event('input',{bubbles:true}));})()`);
      const visible=await browser.evalJs("[...document.querySelectorAll('.entry')].filter(e=>!e.hidden).length");
      assert.ok(visible>0,term+' must have visible source results');searches[term]=visible;
    }
    await browser.evalJs("(()=>{const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input',{bubbles:true}));})()");
    assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
    await browser.screenshot(path.join(folder,mobile?'archive-tree-mobile.png':'archive-tree-desktop.png'));
    await browser.evalJs("document.querySelector('main .entry a').click()");
    await browser.wait("document.querySelector('a[href$=\".pdf\"]')");
    const kinds=await browser.evalJs("[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(h=>/\\.(pdf|mp4|mp3)$/.test(h)).map(h=>h.split('.').pop())");
    assert.ok(kinds.includes('pdf'));assert.ok(kinds.includes('mp4'));assert.ok(kinds.includes('mp3'));
    assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
    assert.deepEqual(browser.errors,[]);assert.deepEqual(browser.failedRequests,[]);
    checks.push({mobile,topics:preparation.providerTopics,courses:preparation.courses,searches,assetKinds:kinds,errors:0,overflow:false});
  } finally {await browser.close();}
}
const report={status:'PASS',scope:'PREPARED_LOCAL_ARCHIVE_NAVIGATION',
  sourceReportSha256:createHash('sha256').update(source).digest('hex'),checks,studentDatabaseWrites:0};
fs.writeFileSync(path.join(folder,'archive-navigation-ui-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
