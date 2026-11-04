// Yerel test hesabı: yalnız sınav seçimini değiştirir ve sonunda eski seçimi geri yükler.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tarayiciAc } from './lib/tarayici.mjs';

const browser = await tarayiciAc();
const report = { checks: [] };
let restore;
const request = path => browser.evalJs(`fetch(${JSON.stringify(path)}).then(async r=>{if(!r.ok)throw Error(r.status+' '+await r.text());return r.json();})`);
const choose = id => browser.evalJs(`(async()=>{
  const token=decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('XSRF-TOKEN='))?.split('=')[1]||'');
  const response=await fetch('/api/exam-tracks/current',{method:'PUT',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':token},body:JSON.stringify({trackId:${JSON.stringify(id)}})});
  if(!response.ok)throw Error(await response.text());
})()`);
try {
  await browser.goto('/');await browser.login();
  restore=(await request('/api/exam-tracks')).currentId;
  await choose('YURT_DISI_OGRETMEN');
  const metadata=await request('/api/learning-resources/metadata');
  assert.equal(metadata.categories.length,4);
  assert.ok(metadata.categories.every(c=>c.exam==='YURT_DISI_MY'));
  const content=await request('/api/exam-content');
  const pool=await request('/api/questions/pool-summary');
  assert.equal(content.distribution.length,4);
  assert.equal(content.distribution.reduce((n,r)=>n+r.total,0),pool.total);
  assert.ok(content.documents.length>=28);
  assert.ok(content.documents.every(d=>!d.path.includes('ogm-materyal')));
  const pdf=await browser.evalJs(`(async()=>{const r=await fetch('/api/exam-content/document?path='+encodeURIComponent(${JSON.stringify(content.documents[0].path)}));const b=await r.arrayBuffer();return {status:r.status,type:r.headers.get('content-type'),signature:new TextDecoder().decode(b.slice(0,4))};})()`);
  assert.equal(pdf.status,200);assert.match(pdf.type,/application\/pdf/);assert.equal(pdf.signature,'%PDF');
  report.checks.push({scope:'metadata/distribution/inventory/pdf',courses:4,pdfs:content.documents.length,questions:pool.total});
  for(const mobile of [false,true]) {
    await browser.cdp('Emulation.setDeviceMetricsOverride',mobile?{width:390,height:844,deviceScaleFactor:1,mobile:true}:{width:1440,height:900,deviceScaleFactor:1,mobile:false});
    for(const path of ['/dersler-ve-konular','/dersler-ve-konular?tab=dagilim','/dersler-ve-konular/pdf-envanteri','/gecmis','/gecmis?tab=practice']) {
      await browser.goto(path);
      await browser.wait(`document.body.innerText.includes('Yurt Dışı Öğretmenlik') && !document.body.innerText.includes('Sınav seçimi yükleniyor') && !document.body.innerText.includes('Çalışma kayıtların yükleniyor') && !document.body.innerText.includes('Ders, ünite ve konular yükleniyor')`);
      if(path.startsWith('/dersler'))await browser.wait(`document.querySelector('.ag-row')`);
      const screen=await browser.evalJs(`({text:document.body.innerText,headers:[...document.querySelectorAll('.ag-header-cell-text')].map(e=>e.textContent),width:document.documentElement.scrollWidth,viewport:innerWidth})`);
      assert.ok(!screen.text.includes('için henüz hazır değil'),path);
      assert.ok(!screen.headers.some(t=>/TYT|AYT|Sınıf|Ders alıştırması|Kart tekrarı/.test(t)),path+' YKS header leaked');
      assert.ok(screen.width<=screen.viewport+2,path+' viewport overflow');
      if(path.includes('dagilim')) {
        await browser.wait(`(()=>{const v=document.querySelector('.ag-body-horizontal-scroll-viewport');if(v){v.scrollLeft=v.scrollWidth;v.dispatchEvent(new Event('scroll'));}return [...document.querySelectorAll('.ag-header-cell-text')].some(e=>e.textContent==='2026');})()`);
        await browser.wait(`[...document.querySelectorAll('.ag-header-cell-text')].some(e=>e.textContent==='2026')`);
      }
      report.checks.push({path,mobile,headers:screen.headers});
    }
  }
  assert.deepEqual(browser.errors,[]);
  report.status='PASS';
} catch(error) {
  report.status='FAIL';report.error=String(error);throw error;
} finally {
  if(restore)await choose(restore);
  fs.mkdirSync('veri/ui-denetim/yurt-disi',{recursive:true});
  fs.writeFileSync('veri/ui-denetim/yurt-disi/rapor.json',JSON.stringify(report,null,2)+'\n');
  browser.close();
}
console.log(JSON.stringify(report));
