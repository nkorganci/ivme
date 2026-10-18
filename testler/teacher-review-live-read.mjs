// Local read-only content smoke. Uses its own loopback dev-review session; never saves a review.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:5173', api='/api/operator/content-review';
const cookies=new Map();
async function request(path,method='GET') {
  const headers={Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')};
  if(method!=='GET' && cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN']=decodeURIComponent(cookies.get('XSRF-TOKEN'));
  const response=await fetch(base+path,{method,headers});
  for(const cookie of response.headers.getSetCookie()) { const pair=cookie.split(';')[0],index=pair.indexOf('=');cookies.set(pair.slice(0,index),pair.slice(index+1)); }
  return response;
}
await request('/api/auth/me');
let response=await request('/api/auth/dev-teacher-review-login','POST');
assert.equal(response.status,200);assert.equal((await response.json()).role,'OPERATOR');
response=await request(api+'/catalog');assert.equal(response.status,200);const catalog=await response.json();assert.equal(catalog.branches.length,14);
const counts=[];
for(const branch of catalog.branches) {
  const r=await request(`${api}?subject=${branch.id}&kind=QUESTION&bank=CIKMIS`);assert.equal(r.status,200);
  const data=await r.json();counts.push(`${branch.id}: ${data.totalElements}`);
}
const questions=await (await request(api+'?subject=fizik&kind=QUESTION&bank=CIKMIS')).json();
const item=await (await request(api+'/item?key='+encodeURIComponent(questions.content[0].key))).json();
assert.ok(item.item.contentSha256!=='MISSING');assert.equal((await request(`/api/questions/${item.item.questionId}/image`)).status,200);
const pdfs=await (await request(api+'?subject=fizik&kind=PDF')).json();
const available=pdfs.content.find(p=>p.availability==='available');assert.ok(available);assert.equal((await request(available.url)).status,200);
const exported=await (await request(api+'/export')).json();
console.log(JSON.stringify({branches:catalog.branches.length,categories:catalog.categories.length,questionCandidates:counts,
  physicsQuestions:questions.totalElements,physicsPdfs:pdfs.totalElements,savedTeacherDecisions:exported.reviews.length,
  realQuestionImage:'OK',realPdf:'OK'},null,2));
