import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { referenceTopics, referenceUnits, distributionRows } from '../src/curriculumReference.js';
import { categoryGroups, categoryOptions, MAX_CATEGORY_SELECTION } from '../src/categorySelection.js';
import { progressCategories, topicProgressRows } from '../src/topicProgress.js';
import { practiceScope } from '../src/studyStatistics.js';
import { createExcelMatcher } from '../../scripts/excel-curriculum.mjs';

const taxonomy=JSON.parse(fs.readFileSync(new URL('../../backend/src/main/resources/content-taxonomy.json',import.meta.url),'utf8'));
const topics=referenceTopics(taxonomy.categories);

test('every selectable identity is an Excel row; every screen receives the same topic IDs',()=>{
  assert.equal(topics.length,530);
  assert.equal(new Set(topics.map(c=>c.subjectId)).size,12);
  assert.equal(referenceUnits(topics).length,146);
  assert.equal(distributionRows(topics).length,453);
  assert.deepEqual(new Set(categoryOptions(taxonomy.categories).map(c=>c.id)),new Set(topics.map(c=>c.id)));
  assert.deepEqual(new Set(progressCategories(taxonomy.categories).map(c=>c.id)),new Set(topics.map(c=>c.id)));
  assert.ok(topics.every(c=>c.curriculumSource==='EXCEL_FIRST_SHEET' && c.curriculumReference.sheetIndex===0 && c.unit && c.unitId));
  const counts=new Map();for(const c of topics)counts.set(c.unitId,(counts.get(c.unitId)||0)+1);
  assert.ok(Math.max(...counts.values())>20);
  assert.ok(Math.max(...counts.values())<=MAX_CATEGORY_SELECTION,'A complete unit across both exams must fit one selection');
});

test('null counts, zero counts, grouped coverage and both exam identities survive the table projection',()=>{
  const rows=distributionRows(topics);
  const grouped=rows.find(r=>r.ayt==='✓*');
  assert.equal(grouped.aytTotal,null);
  assert.ok(rows.some(r=>r.tytTotal===0));
  assert.equal(rows.find(r=>r.row===5).total,43);
  assert.equal(rows.find(r=>r.row===5).tytYears[0],3);
  assert.equal(topics.filter(c=>c.sourceRow===5).length,2);
});

test('unit grouping, historical selections and statistics use the current published definitions',()=>{
  const category=topics.find(c=>c.subjectId==='fizik');
  const groups=categoryGroups(categoryOptions([category]));
  assert.ok(groups[0].label.includes(category.unit));
  const row=topicProgressRows(topics,[{categoryId:category.id,correct:2,wrong:1}],category.subjectId).find(c=>c.categoryId===category.id);
  assert.equal(row.unit,category.unit);assert.equal(row.net,1.75);
  const legacy={id:'old',subject:'Old name',topic:'Old topic',selectable:false,canonicalTopicIds:[category.id]};
  const scope=practiceScope({categoryIds:['old']},[legacy,category]);
  assert.equal(scope.subject,category.subject);assert.ok(scope.topic.includes(category.unit));assert.ok(scope.topic.includes(category.topic));
});

test('classification stays inside source exam and branch and does not invent a topic for unknown text',()=>{
  const match=createExcelMatcher(topics),category=topics.find(c=>c.subjectId==='fizik');
  assert.ok(match([category.topic],category.exam,'fizik').includes(category.id));
  assert.deepEqual(match(['bilinmeyen alakasız kaynak'],category.exam,'fizik'),[]);
  assert.ok(match(['Paragraf'],'TYT','turkce').length>0);
  for(const id of match(['Kümeler'],'AYT','geometri',{broad:true}))assert.equal(topics.find(c=>c.id===id).subjectId,'matematik');
});
