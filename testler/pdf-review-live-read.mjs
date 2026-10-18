// Local read-only acceptance: no review is saved, no question label is changed.
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:9090';
const api = '/api/operator/content-review';
const cookies = new Map();
async function request(path, method = 'GET') {
  const headers = { Cookie: [...cookies].map(([k,v]) => `${k}=${v}`).join('; ') };
  if (method !== 'GET' && cookies.has('XSRF-TOKEN')) headers['X-XSRF-TOKEN'] = decodeURIComponent(cookies.get('XSRF-TOKEN'));
  const response = await fetch(base + path, { method, headers });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], index = pair.indexOf('=');
    cookies.set(pair.slice(0,index), pair.slice(index+1));
  }
  if (!(path === '/api/auth/me' && response.status === 401)) assert.equal(response.status, 200, path);
  return response;
}
await request('/api/auth/me');
await request('/api/auth/dev-teacher-review-login', 'POST');
const metadata = await (await request(api + '/catalog')).json();
const categories = new Map(metadata.categories.map(c => [c.id, c]));
const initial = await (await request(api + '?subject=all&kind=PDF')).json();
assert.equal(initial.labelCounts.unlabelled, 0);
assert.equal(initial.labelCounts.labelled, initial.totalElements);
const keys = new Set();
for (let page = 0; page < initial.totalPages; page++) {
  const batch = page ? await (await request(api + `?subject=all&kind=PDF&page=${page}`)).json() : initial;
  for (const row of batch.content) {
    assert.ok(!keys.has(row.key), row.key);
    keys.add(row.key);
    assert.ok(row.labels.assignments.length > 0, row.key);
    assert.ok(row.labels.assignments.every(a => categories.has(a.categoryId)), row.key);
    assert.equal(row.relativePath, undefined);
  }
}
assert.equal(keys.size, initial.totalElements);
const empty = await (await request(api + '?subject=all&kind=PDF&labelState=UNLABELLED')).json();
assert.equal(empty.totalElements, 0);
const detail = await (await request(api + '/item?key=pdf:422')).json();
assert.equal(detail.item.topic, 'Hareket ve kuvvet');
assert.ok(detail.item.automaticLabels.evidence.length);
assert.notEqual(detail.item.contentSha256, 'MISSING');
for (const id of [422, 1004, 189415343]) {
  const response = await request(api + `/pdf/${id}`);
  assert.equal(response.headers.get('content-type'), 'application/pdf');
  const bytes = Buffer.from(await response.arrayBuffer());
  assert.equal(bytes.subarray(0,4).toString(), '%PDF');
}
console.log(JSON.stringify({ pdfRecords: keys.size, unlabelled: empty.totalElements,
  categories: categories.size, sharedMovementReference: 'OK', internalHeadingEvidence: 'OK',
  originalAndAdditionalPdfAccess: 'OK', teacherDecisionsWritten: 0 }, null, 2));
