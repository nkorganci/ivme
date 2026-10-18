import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { allTopics, topicId } from '../src/curriculum.js';
import { physicsVideoTopics, videoLessons, videoTeachers, withVideoRows } from '../src/curriculumVideos.js';

test('legacy physics lessons remain available and mapped units reuse the original videos and QR assets', () => {
  const expected = allTopics.filter((topic) => topic.subject === 'fizik').map((topic) => topic.id).sort();
  assert.equal(expected.length,34);
  for (const id of new Set([...expected,...physicsVideoTopics.map(t=>topicId(t.exam,t.subject,t.topic))])) {
    const lessons = videoLessons(id);
    assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, lessons.length);
    for (const lesson of lessons) {
      assert.deepEqual([...new Set(lesson.videos.map((video) => video.teacher))].sort(), videoTeachers.map((teacher) => teacher.id).sort());
      for (const video of lesson.videos) {
        assert.match(video.id, /^[\w-]{11}$/);
        assert.equal(video.url, `https://www.youtube.com/watch?v=${video.id}`);
        assert.equal(video.qr, `/ders-videolari/qr/${video.id}.svg`);
        assert.ok(existsSync(new URL(`../public${video.qr}`, import.meta.url)), video.qr);
      }
    }
  }
  assert.deepEqual(videoLessons('tyt.kimya.madde'), []);
});
test('canonical unit rows never expand into selectable subtopic rows',()=>{
  const id=topicId('TYT','fizik','Basınç');
  const rows=withVideoRows([{id,title:'Basınç'}],{[id]:true},{categories:[{id,topic:'Basınç',canonicalUnit:true}]});
  assert.equal(rows.length,1);assert.equal(rows[0].displayTitle,'Basınç');
});

test('video subtopics preserve original progress and source mappings without duplicating question counts', () => {
  const id = topicId('TYT', 'fizik', 'Basınç');
  const parent = { id, number: 6, title: 'Basınç', done: true, cikmis: [{ count: 8 }], pdfs: [{ id: 42 }], questions: [{ to: '/soru-bankasi' }] };
  const source = { ...parent, id: 'source.physics.pressure', source: true };
  const closed = withVideoRows([parent, source], {});
  assert.equal(closed.length, 2);
  const opened = withVideoRows([parent, source], { [id]: true, [source.id]: true });
  assert.equal(opened[0].id, id);
  assert.equal(opened[0].cikmis, parent.cikmis);
  assert.equal(opened[0].pdfs, parent.pdfs);
  assert.equal(opened[0].questions, parent.questions);
  assert.equal(new Set(opened.map((row) => row.id)).size, opened.length);
  const children = opened.filter((row) => row.videoChild);
  assert.equal(children.length, videoLessons(id).length);
  assert.ok(children.every((row) => row.parentId === id && row.done && row.cikmis.length === 0 && row.pdfs.length === 0));
  assert.deepEqual(opened.at(-1).lessons, []);
});

test('published names replace layout titles while saved parent, child and video identities stay stable', () => {
  const id = topicId('TYT', 'fizik', 'Basınç');
  const parent = { id, number: 6, title: 'Basınç', done: true };
  const lesson = videoLessons(id)[0];
  const childId = `subtopic:${id}:${topicId('TYT', 'fizik', lesson.title)}`;
  const categories = [{ id, topic: 'Güncel basınç adı' }, { id: childId, topic: 'Güncel basınç adı', subtopic: 'Güncel alt konu' }];
  const rows = withVideoRows([parent], { [id]: true }, { categories, exam: 'TYT', subjectId: 'fizik' });
  assert.equal(rows[0].id, id);
  assert.equal(rows[0].categoryId, id);
  assert.equal(rows[0].displayTitle, 'Güncel basınç adı');
  assert.equal(rows[1].categoryId, childId);
  assert.equal(rows[1].displayTitle, 'Güncel alt konu');
  assert.equal(rows[1].parentTitle, 'Güncel basınç adı');
  assert.equal(rows[1].title, lesson.title);
  assert.equal(rows[1].videos, lesson.videos);
  assert.equal(rows[1].done, true);
});
