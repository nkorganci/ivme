// Uses a separate loopback student session. Reads real content; never submits an answer or a teacher decision.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:9090';
const cookies=new Map();
async function request(path,method='GET'){
  const headers={Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')};
  if(method!=='GET'&&cookies.has('XSRF-TOKEN'))headers['X-XSRF-TOKEN']=decodeURIComponent(cookies.get('XSRF-TOKEN'));
  const start=performance.now();
  const r=await fetch(base+path,{method,headers});
  for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');cookies.set(p.slice(0,i),p.slice(i+1));}
  return {response:r,elapsed:Math.round(performance.now()-start)};
}
await request('/api/auth/me');
assert.equal((await request('/api/auth/dev-login','POST')).response.status,200);
let r=await request('/api/learning-resources/metadata');assert.equal(r.response.status,200);
const meta=await r.response.json();assert.equal(meta.summary.unlabelled,0);assert.ok(meta.summary.registeredQuestions>=80000);
assert.equal(meta.branches.length,14);
const timings=[];
for(const kind of ['QUESTION','PDF','NOTE','VIDEO']){
  r=await request('/api/learning-resources?kind='+kind);assert.equal(r.response.status,200);
  const data=await r.response.json();assert.ok(data.totalElements>0,kind);
  for(const item of data.content){assert.ok(item.labels.assignments.length);assert.equal(item.correctAnswer,undefined);assert.ok(!item.key.includes('SOURCE-ONLY'));}
  timings.push({kind,count:data.totalElements,ms:r.elapsed});
}
for(const subject of ['matematik','geometri'])for(const exam of ['TYT','AYT']){
  r=await request(`/api/learning-resources?kind=QUESTION&subject=${subject}&exam=${exam}`);
  assert.equal(r.response.status,200);assert.ok((await r.response.json()).totalElements>0,`${exam}/${subject}`);
}
const category='tyt.fizik.hareket-ve-kuvvet';
for(const kind of ['QUESTION','PDF','VIDEO']){
  r=await request(`/api/learning-resources?kind=${kind}&categoryId=${category}`);
  assert.equal(r.response.status,200);assert.ok((await r.response.json()).totalElements>0,kind);
}
r=await request('/api/learning-resources?approvedOnly=true');assert.equal(r.response.status,200);
const approved=(await r.response.json()).totalElements;
r=await request('/api/learning-resources?kind=PDF&availableOnly=true');assert.equal(r.response.status,200);
const pdfs=await r.response.json();assert.ok(pdfs.content.length);
const pdf=await request(pdfs.content[0].url);assert.equal(pdf.response.status,200);assert.equal(pdf.response.headers.get('content-type'),'application/pdf');await pdf.response.body.cancel();
assert.equal((await request('/api/operator/content-review')).response.status,403);
console.log(JSON.stringify({runKey:meta.summary.runKey,categories:meta.categories.length,timings,teacherApproved:approved,realPdf:'OK',allSourceTypes:'OK',tytAytMathGeometry:'OK',noAnswerDisclosure:'OK'},null,2));
