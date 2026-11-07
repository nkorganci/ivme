import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {curriculumProjection} from '../scripts/curriculum-projection.mjs';
import {buildMebiMaintenance} from '../scripts/yks-curriculum-import.mjs';

test('refactored projection keeps the existing generated output byte-for-byte',()=>{
  const taxonomy=JSON.parse(fs.readFileSync('backend/src/main/resources/content-taxonomy.json','utf8'));
  const actual=JSON.stringify(curriculumProjection(taxonomy),null,2)+'\n';
  assert.equal(actual,fs.readFileSync('frontend/src/data/curriculumIdentities.json','utf8'));
});

test('maintenance preparation refuses lost identities and never reassigns a saved category',()=>{
  const old={id:'old',exam:'TYT',subjectId:'matematik',subject:'Matematik',topic:'Önceki ad',origin:'CURRICULUM',canonicalUnit:true};
  const base={categories:[old],aliasRules:[],redirects:{},unitReference:{type:'EXCEL_FIRST_SHEET',sha256:'distribution-sha'}};
  const leaf={id:'leaf',exam:'TYT',subjectId:'matematik',subject:'Matematik',topic:'Ayrıntı',origin:'CURRICULUM',curriculumSource:'MEBI_PROVIDER'};
  const candidate={originalDefinitionsPreserved:true,curriculumAuthority:'MEBI_PROVIDER',categoryDefinitions:[old,leaf],navigation:[
    {id:'course',exam:'TYT',subjectId:'matematik',title:'Matematik',units:[{id:'unit',title:'Sayılar',topics:[
      {categoryId:'leaf',sourceExam:'TYT',title:'Ayrıntı',contentKey:'content',examCategoryIds:{TYT:['leaf']}}]}]},
  ]};
  const source=JSON.stringify(base),result=buildMebiMaintenance(base,candidate);
  assert.equal(JSON.stringify(base),source);assert.deepEqual(result.categories[0],old);
  assert.deepEqual(result.legacyUnitReference,base.unitReference);
  assert.deepEqual(curriculumProjection(result).canonicalUnits.map(c=>c.id),['leaf']);
  assert.equal(curriculumProjection(result).identities.old,'old');
  assert.throws(()=>buildMebiMaintenance(base,{...candidate,categoryDefinitions:[leaf]}),/Lost maintenance identity/);
});
