import assert from 'node:assert/strict';
import {taxonomy} from '../scripts/content-taxonomy.mjs';
import {physicsTopics,physicsTargets} from '../scripts/physics-topics.mjs';
import {topicProgressRows,progressCategories} from '../frontend/src/topicProgress.js';
assert.equal(physicsTopics.length,34);
assert.equal(physicsTopics.filter(c=>c.exam==='TYT').length,14);
assert.equal(physicsTopics.filter(c=>c.exam==='AYT').length,20);
assert.equal(topicProgressRows(progressCategories(taxonomy.categories),[],'fizik').length,34);
const optics=physicsTopics.find(c=>c.exam==='TYT'&&c.topic==='Optik');
for(const c of taxonomy.categories.filter(c=>c.exam==='TYT'&&c.subjectId==='fizik'&&/Optik:/.test(c.topic)))
  assert.deepEqual(physicsTargets(c),[optics.id]);
assert.deepEqual(physicsTargets({exam:'TYT',topic:'Optik',subtopic:'Çukur ve tümsek aynalar'}),[optics.id]);
console.log(JSON.stringify({status:'PASS',physicsUnits:34,TYT:14,AYT:20}));
