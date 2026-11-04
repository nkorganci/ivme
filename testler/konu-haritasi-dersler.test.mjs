import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { catalogById, catalogUnits } from '../frontend/src/learn/catalog.js';
import { parseLesson, buildIndex } from '../frontend/src/learn/content/parser.js';
import { UNITS } from '../frontend/src/learn/content/units.js';
import { topicMapCatalog, selectTopicMap, topicMapParams, topicSourcesPath } from '../frontend/src/learn/mapNavigation.js';

const categories = JSON.parse(readFileSync(new URL('../frontend/src/data/curriculumIdentities.json', import.meta.url),'utf8')).canonicalUnits;
const dir = new URL('../frontend/src/learn/content/dersler/', import.meta.url);
const lessons = readdirSync(dir).filter(name => name.endsWith('.ders')).map(name => parseLesson(readFileSync(new URL(name,dir),'utf8'),name.replace(/\.ders$/,'')));
const index = buildIndex(lessons,UNITS);
const state = { concepts: Object.fromEntries(index.concepts.map((meta,i) => [meta.id,{status:i%2 ? 'locked':'learning'}])) };
const byId = catalogById(categories);
const catalog = topicMapCatalog(index.concepts,byId);

test('ders listesi bütün yayımlanmış TYT/AYT branşlarından gelir, Matematik varsayılandır',()=>{
  assert.deepEqual(new Set(catalog.subjects.map(s=>s.id)),new Set(categories.map(c=>c.subjectId)));
  assert.equal(catalog.subjects[0].id,'matematik');
  assert.equal(selectTopicMap(catalog,index.concepts,state).subject.id,'matematik');
});

test('Matematik mevcut kavramları ve kimliklerini aynen korur',()=>{
  const map=selectTopicMap(catalog,index.concepts,state,{subject:'matematik'});
  assert.deepEqual(map.concepts.map(c=>c.id),index.concepts.map(c=>c.id));
  assert.equal(map.concepts.length,34);
  assert.deepEqual(catalogUnits(map.concepts,byId,{subjectId:'matematik'}).units,catalogUnits(index.concepts,byId).units);
});

test('Fizik, Kimya, Türkçe: Matematik kavramları ve sahte ustalık durumu taşınmaz',()=>{
  for(const subject of ['fizik','kimya','turkce']){
    const map=selectTopicMap(catalog,index.concepts,state,{subject});
    assert.equal(map.concepts.length,0);
    assert.ok(map.topics.length>0);
    assert.ok(map.topics.every(topic=>topic.subjectId===subject));
    assert.ok(map.topics.every(topic=>!('mastery' in topic)));
  }
});

test('ortak Excel konusu tek kartta iki sınav kimliğini korur; kaynak linki aynı kimlikleri açar',()=>{
  const topic=catalog.topics.find(t=>t.exams.length===2);
  assert.ok(topic);
  assert.equal(catalog.topics.filter(t=>t.key===topic.key).length,1);
  const params=new URL(topicSourcesPath(topic),'http://local').searchParams;
  assert.deepEqual(params.getAll('categoryId'),topic.ids);
});

test('branş, sınav, ünite ve Türkçe arama kesişimi doğru konuları döndürür',()=>{
  const topic=catalog.topics.find(t=>t.subjectId==='fizik'&&t.exams.includes('AYT'));
  const map=selectTopicMap(catalog,index.concepts,state,{subject:'fizik',exam:'AYT',unit:topic.unitId,search:topic.name});
  assert.ok(map.topics.some(t=>t.key===topic.key));
  assert.ok(map.topics.every(t=>t.unitId===topic.unitId&&t.exams.includes('AYT')));
  assert.equal(selectTopicMap(catalog,index.concepts,state,{subject:'fizik',search:'bulunmayanxyz'}).topics.length,0);
});

test('ders değişince sınav korunur, eski dersin arama/ünite/durum filtreleri temizlenir',()=>{
  const params=topicMapParams(new URLSearchParams('ders=matematik&sinav=AYT&unite=eski&ara=polinom&durum=locked'),{ders:'fizik'});
  assert.equal(params.get('sinav'),'AYT');
  assert.equal(params.get('ders'),'fizik');
  for(const key of ['ara','unite','durum']) assert.equal(params.has(key),false);
  const next=topicMapParams(params,{sinav:'TYT'});
  assert.equal(next.get('ders'),'fizik');
});

test('bilinmeyen ders/ünite ve boş katalog kontrollü olarak ele alınır',()=>{
  assert.equal(selectTopicMap(catalog,index.concepts,state,{subject:'yok',unit:'yok'}).subject.id,'matematik');
  const empty=selectTopicMap(topicMapCatalog([],new Map()),[],{concepts:{}},{});
  assert.equal(empty.subject,null);
  assert.deepEqual(empty.concepts,[]);
});

test('öğrenme durumu yalnız mevcut dersleri süzer',()=>{
  const map=selectTopicMap(catalog,index.concepts,state,{subject:'matematik',status:'learning'});
  assert.ok(map.concepts.length>0&&map.concepts.every(meta=>state.concepts[meta.id].status==='learning'));
  assert.deepEqual(map.topics,[]);
});
