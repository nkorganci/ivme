// Read-only checks against the served YKS inventory and the practice bank total.
import assert from 'node:assert/strict';
import { tarayiciAc } from './lib/tarayici.mjs';

const browser = await tarayiciAc();
try {
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width:1440,height:900,deviceScaleFactor:1,mobile:false });
  await browser.goto('/');
  await browser.login();
  const data = await browser.evalJs(`(async () => {
    const [audit,pool] = await Promise.all([
      fetch('/api/pdf-bank-audit').then(r=>r.json()),fetch('/api/questions/pool-summary').then(r=>r.json())]);
    return {audit,pool};
  })()`);
  assert.equal(data.audit.liveQuestionCount, data.pool.total, 'PDF inventory and practice must share the YKS bank total');
  assert.equal(data.audit.uniquePdfQuestionCount + data.audit.sourceReviewQuestionCount, data.audit.liveQuestionCount);
  // Real intake examples exercise ImageStorage and practice publication, too.
  if(data.audit.liveQuestionCount>=80229) {
    for(const code of ['mn-test-04-01-01','pdf-41807fc85f9bcbe3-p0047-q01']) {
      const result=await browser.evalJs(`(async()=>{
        const response=await fetch('/api/questions/code/'+encodeURIComponent(${JSON.stringify(code)}));
        const question=await response.json();
        const image=await fetch('/api/questions/'+question.id+'/image');
        return {status:response.status,code:question.code,imageStatus:image.status,imageType:image.headers.get('content-type'),size:(await image.blob()).size};
      })()`);
      assert.equal(result.status,200);assert.equal(result.code,code);
      assert.equal(result.imageStatus,200);assert.match(result.imageType,/image/);assert.ok(result.size>1000);
    }
    const source=data.audit.pdfs.find(row=>row.sha256?.startsWith('41807fc85f9bcbe3'));
    assert.ok(source);
    const corrected=await browser.evalJs(`fetch('/api/pdf-bank-audit/${source.id}/candidates').then(r=>r.json())`);
    const card=corrected.cards.find(row=>row.code==='pdf-41807fc85f9bcbe3-p0047-q01');
    assert.equal(card.bankStatus,'LINKED');assert.equal(card.sourceAnswerCorrected,true);
    assert.equal(card.answer,'E');assert.equal(card.bankAnswer,'C');assert.match(card.sourceReviewNote,/II.*I.*III/);
  }
  const physical = data.audit.pdfs.filter(row=>row.sha256 && row.available);
  const staged=data.audit.pdfs.find(row=>row.candidatePackageAvailable && ![335,349].includes(row.id));
  if(staged) {
    const candidate=await browser.evalJs(`(async()=>{
      const response=await fetch('/api/pdf-bank-audit/${staged.id}/candidates');const packet=await response.json();
      const image=await fetch('/api/pdf-bank-audit/${staged.id}/candidates/'+encodeURIComponent(packet.cards[0].code)+'/image');
      return {status:response.status,sha:packet.sourceSha256,count:packet.questionCount,actual:packet.cards.length,image:image.status};
    })()`);
    assert.equal(candidate.status,200);assert.equal(candidate.sha,staged.sha256);
    assert.equal(candidate.count,candidate.actual);assert.equal(candidate.image,200);
  }
  assert.equal(new Set(physical.map(row=>row.sha256)).size, physical.length, 'Catalog aliases must not duplicate a physical PDF row');
  for (const row of data.audit.pdfs.filter(row=>row.allQuestionsTaken)) {
    assert.ok(row.expectedQuestions > 0);
    assert.equal(row.candidateCount,0);
    assert.equal(row.reviewCount,0);
    assert.equal(row.sourceIssueCount,0);
    assert.equal(row.completionLabel,'Evet');
  }
  await browser.goto('/dersler-ve-konular/pdf-envanteri');
  await browser.wait('document.querySelectorAll(".pdf-audit-inventory-grid .ag-row").length > 0');
  const initial = await browser.evalJs('document.body.innerText');
  assert.match(initial,/Bütün sorular alındı/);
  assert.match(initial,/tekil banka sorusu/);
  const layout = await browser.evalJs(`(() => {
    const grid=document.querySelector('.pdf-audit-inventory-grid');
    const viewport=grid.querySelector('.ag-body-horizontal-scroll-viewport');
    return {pdfWidth:grid.querySelector('.ag-header-cell[col-id="title"]').getBoundingClientRect().width,
      viewportWidth:viewport.clientWidth,contentWidth:viewport.scrollWidth};
  })()`);
  assert.equal(layout.pdfWidth,87);
  assert.ok(layout.contentWidth<=layout.viewportWidth+1,`Inventory needs horizontal scrolling: ${JSON.stringify(layout)}`);
  for(const width of [1366,1280]) {
    await browser.cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await browser.wait(`(() => { const v=document.querySelector('.pdf-audit-inventory-grid .ag-body-horizontal-scroll-viewport');return v.scrollWidth<=v.clientWidth+1; })()`);
  }
  await browser.evalJs(`[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Göster').click()`);
  await browser.wait('document.body.innerText.includes("Soru çıkarma listesine al")');
  assert.equal(await browser.evalJs(`(() => {
    const top=document.querySelector('.pdf-audit-proof').getBoundingClientRect().top;
    return top>=0 && top<innerHeight;
  })()`),true,'Proof should be visible after opening');
  assert.deepEqual(browser.errors,[]);
  assert.deepEqual(browser.failedRequests.filter(r=>!(r.status===401 && r.url.endsWith('/api/auth/me'))
    && !(r.status===404 && r.url.endsWith('/favicon.ico'))),[]);
  console.log(JSON.stringify({bankTotal:data.audit.liveQuestionCount,uniquePdfQuestions:data.audit.uniquePdfQuestionCount,
    sourceReview:data.audit.sourceReviewQuestionCount,inventoryRows:data.audit.pdfs.length,
    completedPdfs:data.audit.pdfs.filter(row=>row.allQuestionsTaken).length,proof:'visible',layout}));
} finally {
  browser.close();
}
