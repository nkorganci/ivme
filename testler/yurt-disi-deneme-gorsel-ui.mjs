import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tarayiciAc } from './lib/tarayici.mjs';

const browser=await tarayiciAc();
const report={checks:[]};let restore;
const api=path=>browser.evalJs(`fetch(${JSON.stringify(path)}).then(async r=>{if(!r.ok)throw Error(r.status+' '+await r.text());return r.json()})`);
const choose=id=>browser.evalJs(`(async()=>{const token=decodeURIComponent(document.cookie.split('; ').find(x=>x.startsWith('XSRF-TOKEN='))?.split('=')[1]||'');const r=await fetch('/api/exam-tracks/current',{method:'PUT',headers:{'Content-Type':'application/json','X-XSRF-TOKEN':token},body:JSON.stringify({trackId:${JSON.stringify(id)}})});if(!r.ok)throw Error(await r.text())})()`);
try {
  await browser.goto('/');await browser.login();restore=(await api('/api/exam-tracks')).currentId;
  await choose('YURT_DISI_OGRETMEN');
  const plan=await api('/api/exams/plan?examType=YURT_DISI_MY&bank=CIKMIS');
  assert.equal(plan.ready,true);assert.equal(plan.questionCount,60);assert.equal(plan.timeLimitMinutes,75);
  assert.deepEqual(plan.subjects.map(s=>s.target),[18,18,12,12]);
  const archive=await api('/api/exams/archive?examType=YURT_DISI_MY');
  assert.equal(archive.length,28);assert.ok(archive.every(p=>p.ready));
  assert.equal(archive.filter(p=>p.year===2025).length,2);
  assert.ok(archive.some(p=>p.year===2012&&p.timeLimitMinutes===110));
  report.checks.push({type:'plans',questionCount:plan.questionCount,quotas:plan.subjects,booklets:archive.length});
  await browser.goto('/calisma/yeni?mode=sinav&examSource=year');
  await browser.wait(`document.querySelector('select')?.options.length>5 && [...document.querySelectorAll('button')].some(b=>b.textContent==='Denemeyi başlat'&&!b.disabled)`);
  await browser.evalJs(`(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value==='2025'));s.value='2025';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await browser.wait(`[...document.querySelectorAll('select')].some(s=>s.options.length===2&&[...s.options].every(o=>o.textContent.includes('2025-02-09')))`);
  const yearScreen=await browser.evalJs(`({options:[...document.querySelectorAll('select')].map(s=>[...s.options].map(o=>o.textContent)),text:document.body.innerText})`);
  assert.ok(!yearScreen.text.includes('kayıtlı sınav yılı bulunamadı'));
  report.checks.push({type:'year-selection',...yearScreen.options});
  await browser.goto('/calisma/yeni?mode=sinav');
  await browser.wait(`[...document.querySelectorAll('button')].some(b=>b.textContent==='Denemeyi başlat'&&!b.disabled)`);
  assert.ok(!(await browser.evalJs('document.body.innerText')).includes('Matematik: 40'));
  for(const track of ['YURT_DISI_OGRETMEN','YKS']) {
    await choose(track);
    const codes=track==='YKS'?['TYT-0656']:['YD_MY_4CB68CD1_012','YD_MY_BCD7DCF4_033','YD_MY_E341D9B0_004'];
    for(const [width,height] of [[1440,900],[1366,640],[1024,600],[390,844],[844,390]]) {
      await browser.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
      for(const code of codes) {
        await browser.goto('/soru/'+code);
        await browser.wait(`document.querySelector('.image-btn img')?.naturalWidth>0 && document.querySelectorAll('.qbar .choice').length>=4`);
        await browser.wait(`document.querySelector('.qpage')?.style.getPropertyValue('--question-viewport-height')`);
        const layout=await browser.evalJs(`(()=>{const r=e=>{const b=e.getBoundingClientRect();return {top:b.top,bottom:b.bottom,width:b.width,height:b.height}};const img=document.querySelector('.image-btn img');return {page:r(document.querySelector('.qpage')),answer:r(document.querySelector('.qbar')),image:r(img),natural:[img.naturalWidth,img.naturalHeight],viewport:innerHeight,scrollY,choices:document.querySelectorAll('.qbar .choice').length};})()`);
        assert.ok(layout.answer.top>=0&&layout.answer.bottom<=height+1,`${track} ${width}x${height}: answer outside viewport ${JSON.stringify(layout)}`);
        assert.ok(layout.page.bottom<=height+1,`${code}: workspace exceeds viewport`);
        assert.equal(layout.scrollY,0);
        assert.ok(layout.image.height>15&&layout.image.width>50);
        assert.equal(layout.choices,track==='YKS'||code.startsWith('YD_MY_E341D9B0')?5:4);
        if(code==='YD_MY_4CB68CD1_012')assert.ok(layout.natural[0]/layout.natural[1]>1.3,'PDF margins/footer still dominate image');
        report.checks.push({track,code,width,height,...layout});
      }
    }
  }
  // A rendered exam fixture uses real question images; no production exam/answer is created.
  const real=await api('/api/questions/code/YD_MY_4CB68CD1_012');
  const fixture={id:987654321,title:'Yurt Dışı Görünüm Denetimi',status:'IN_PROGRESS',selectionMode:'MIXED',questionCount:1,
    timeLimitMinutes:75,remainingSeconds:4500,startedAt:new Date().toISOString(),questions:[{questionId:real.id,position:1,
      code:real.code,subject:real.subject,topic:real.topic,choiceCount:4,selectedAnswer:null,flagged:false}]};
  await browser.cdp('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{const original=window.fetch;window.fetch=(input,...args)=>String(input).split('?')[0].endsWith('/api/exams/987654321')?Promise.resolve(new Response(${JSON.stringify(JSON.stringify(fixture))},{status:200,headers:{'Content-Type':'application/json'}})):original(input,...args);})()`});
  for(const [width,height] of [[1366,640],[390,844]]) {
    await browser.cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
    await browser.goto('/sinav/987654321');
    await browser.wait(`document.querySelector('.image-btn img')?.naturalWidth>0 && document.querySelector('.qpage')?.style.getPropertyValue('--question-viewport-height')`);
    const bounds=await browser.evalJs(`(()=>{const b=document.querySelector('.exam-answer-card').getBoundingClientRect();return {top:b.top,bottom:b.bottom};})()`);
    assert.ok(bounds.top>=0&&bounds.bottom<=height+1,`exam ${width}x${height}: ${JSON.stringify(bounds)}`);
    report.checks.push({type:'rendered-exam-fixture',width,height,...bounds});
  }
  assert.deepEqual(browser.errors,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.error=String(error);throw error;}
finally {
  if(restore)await choose(restore);
  fs.mkdirSync('veri/ui-denetim/yurt-disi',{recursive:true});
  fs.writeFileSync('veri/ui-denetim/yurt-disi/deneme-gorsel.json',JSON.stringify(report,null,2)+'\n');browser.close();
}
console.log(JSON.stringify({status:report.status,checks:report.checks.length}));
