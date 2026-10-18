// Compatibility helpers for preserved physics extraction sources. All branches share one registry.
import {canonicalUnits,suggestUnits,canonicalizeUnits} from './canonical-units.mjs';
export const physicsTopics=canonicalUnits.filter(c=>c.subjectId==='fizik');
export function physicsTargets(category) {
  if(category.canonicalTopicIds)return category.canonicalTopicIds;
  if(category.canonicalUnit)return [category.id];
  return suggestUnits([category.subtopic,category.topic],category.exam,'fizik');
}
export const canonicalizePhysics=canonicalizeUnits;
// Shared canonicalization already finalizes fingerprints, locations and presentation.
export function finalizePhysics() {}
