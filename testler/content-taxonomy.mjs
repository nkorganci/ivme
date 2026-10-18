import assert from 'node:assert/strict';
import { taxonomy, categoriesById, aliasTerm, controlledCategory, validateTaxonomy } from '../scripts/content-taxonomy.mjs';
import { resolveTopicId, topicId, allTopics } from '../frontend/src/curriculum.js';

assert.equal(aliasTerm('KelimeDE Anlam'),aliasTerm('Sözcükte Anlam'));
assert.equal(aliasTerm('Newton Kanunları'),aliasTerm('Newton Yasaları'));
assert.notEqual(topicId('TYT','matematik','Mantık'),topicId('AYT','mantik','Mantık'));
assert.deepEqual(validateTaxonomy(),[]);
assert.equal(new Set(allTopics.map(t=>t.id)).size,allTopics.length);
for (const topic of allTopics) assert.ok(categoriesById.has(topic.id), topic.id);
const original='tyt.turkce.sozcukte-anlam';
const renamed={identities:{'tyt.turkce.kelimede-anlam':original,[original]:original},titles:{[original]:'Kelimede anlam'}};
assert.equal(resolveTopicId('TYT','turkce','Kelimede anlam',renamed),original);
assert.equal(resolveTopicId('TYT','turkce','Sözcükte anlam',renamed),original);
assert.equal(controlledCategory({...categoriesById.get(original),topic:'Başlık düzeltildi'}).id,original);
assert.throws(()=>controlledCategory({id:'invented',exam:'TYT',subjectId:'fizik'}),/Register/);
assert.throws(()=>controlledCategory({...categoriesById.get(original),subjectId:'kimya'}),/scope changed/);
const fixture={categories:[{id:'a',exam:'TYT',subjectId:'fizik',topic:'A',parentId:'b'},
  {id:'b',exam:'TYT',subjectId:'fizik',topic:'B',parentId:'a'}],redirects:{},equivalences:[]};
assert.ok(validateTaxonomy(fixture).some(e=>e.startsWith('Cycle')));
fixture.categories[1].parentId='missing';
assert.ok(validateTaxonomy(fixture).some(e=>e.startsWith('Orphan')));
fixture.categories[1].parentId=undefined;fixture.categories[1].subjectId='kimya';
assert.ok(validateTaxonomy(fixture).some(e=>e.startsWith('Parent scope')));
fixture.redirects={retired:'unknown'};
assert.ok(validateTaxonomy(fixture).some(e=>e.startsWith('Unknown redirect')));
assert.equal(taxonomy.categories.find(c=>c.id==='system.kapsam-incelemesi').excludeFromAchievement,true);
console.log(`Controlled taxonomy checks passed: ${taxonomy.categories.length} identities, ${allTopics.length} stable curriculum links.`);
