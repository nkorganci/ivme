// All source generators resolve controlled identities through this registry.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
export const taxonomyPath = new URL('../backend/src/main/resources/content-taxonomy.json', import.meta.url);
export const taxonomy = JSON.parse(fs.readFileSync(taxonomyPath, 'utf8'));
export const taxonomyVersion = 'taxonomy-v1-' + createHash('sha256').update(JSON.stringify(taxonomy)).digest('hex').slice(0,24);
export const categoriesById = new Map(taxonomy.categories.map(c => [c.id, c]));
export const normaliseTerm = value => String(value || '').toLocaleLowerCase('tr-TR').replaceAll('ı','i')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();

export function aliasTerm(value, profile = 'content') {
  let result = normaliseTerm(value);
  for (const rule of taxonomy.aliasRules.filter(r => r.profiles.includes(profile)))
    result = result.replace(new RegExp(rule.pattern, 'g'), rule.replacement);
  return result.replace(/\s+/g, ' ').trim();
}

export function controlledCategory(proposal) {
  const existing = categoriesById.get(proposal.id);
  if (!existing) throw new Error(`Register a controlled category before generation: ${proposal.id}`);
  if (existing.exam !== proposal.exam || existing.subjectId !== proposal.subjectId)
    throw new Error(`Category scope changed: ${proposal.id}`);
  return existing;
}

export function categoryForTerms(exam, subjectId, topic, subtopic = '', profile = 'content') {
  return taxonomy.categories.find(c => c.exam === exam && c.subjectId === subjectId &&
    aliasTerm(c.subtopic || '', profile) === aliasTerm(subtopic, profile) &&
    [c.topic, ...(c.aliases || [])].some(term => aliasTerm(term, profile) === aliasTerm(topic, profile)));
}

export function validateTaxonomy(value = taxonomy) {
  const errors = [];
  const byId = new Map();
  for (const c of value.categories) {
    if (byId.has(c.id)) errors.push(`Duplicate category: ${c.id}`);
    byId.set(c.id, c);
    if (!c.id || !c.topic || !c.subjectId || !c.exam) errors.push(`Incomplete category: ${c.id}`);
  }
  for (const c of value.categories) {
    const seen = new Set([c.id]);
    let cursor = c;
    while (cursor.parentId) {
      const parent = byId.get(cursor.parentId);
      if (!parent) { errors.push(`Orphan: ${cursor.id}`); break; }
      if (parent.subjectId !== c.subjectId || parent.exam !== c.exam) errors.push(`Parent scope: ${c.id}`);
      if (seen.has(parent.id)) { errors.push(`Cycle: ${c.id}`); break; }
      seen.add(parent.id); cursor = parent;
    }
  }
  for (const [oldId, target] of Object.entries(value.redirects || {})) {
    const seen = new Set([oldId]); let id = target;
    while (value.redirects[id]) {
      if (seen.has(id)) { errors.push(`Redirect cycle: ${oldId}`); break; }
      seen.add(id); id = value.redirects[id];
    }
    if (!byId.has(id)) errors.push(`Unknown redirect target: ${oldId}`);
  }
  for (const relation of value.equivalences || []) {
    if (!byId.has(relation.from) || !byId.has(relation.to)) errors.push(`Unknown equivalence: ${relation.from}`);
  }
  return errors;
}

const errors = validateTaxonomy();
if (errors.length) throw new Error(errors.join('\n'));
