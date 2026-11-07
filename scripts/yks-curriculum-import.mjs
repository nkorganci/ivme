// Prepare a controlled maintenance source; this command never activates the live catalog or projection.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {publicCurriculumNavigation,preferredCurriculumCategories} from '../frontend/src/curriculumNavigation.js';
import {validateTaxonomy} from './content-taxonomy.mjs';
import {curriculumProjection} from './curriculum-projection.mjs';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function buildMebiMaintenance(base,candidate,source={}) {
  if(candidate.originalDefinitionsPreserved!==true || candidate.curriculumAuthority!=='MEBI_PROVIDER')
    throw Error('Verified identity-preserving MEBI candidate required');
  const ids=new Set(candidate.categoryDefinitions.map(c=>c.id));
  for(const category of base.categories)if(!ids.has(category.id))throw Error(`Lost maintenance identity ${category.id}`);
  const navigation=publicCurriculumNavigation(candidate.navigation);
  const selections=preferredCurriculumCategories(navigation,candidate.categoryDefinitions);
  const result={...structuredClone(base),curriculumAuthority:'MEBI_PROVIDER',
    categories:structuredClone(candidate.categoryDefinitions),curriculumNavigation:navigation,
    legacyUnitReference:structuredClone(base.legacyUnitReference||base.unitReference),
    unitReference:{type:'MEBI_PROVIDER',providerCatalogSha256:source.providerCatalogSha256,
      sourceCandidateSha256:source.sourceCandidateSha256,providerTopics:candidate.navigation.reduce((n,c)=>n+c.units.reduce((m,u)=>m+u.topics.length,0),0),
      selectableExamTopics:selections.filter(c=>['TYT','AYT'].includes(c.exam)).length},
    legacyCompatibilityPolicy:candidate.legacyCompatibilityPolicy||'PRESERVE_ALL_ORIGINAL_DEFINITIONS_AND_IDS'};
  const errors=validateTaxonomy(result);if(errors.length)throw Error(errors.join('; '));
  return result;
}

function main() {
  if(process.argv.includes('--apply'))throw Error('Activation is reserved for the verified YKS-11 cutover; this adapter prepares evidence only.');
  const control=path.join(root,'veri/yks-birlestirme');
  const pointer=JSON.parse(fs.readFileSync(path.join(control,'current.json'),'utf8'));
  const state=JSON.parse(fs.readFileSync(path.join(control,pointer.runId,'state.json'),'utf8'));
  const stage=state.stages['YKS-04:full'];
  if(stage?.status!=='VERIFIED')throw Error('Verified YKS-04 required');
  const artifact=stage.artifacts.find(a=>a.path.replaceAll('\\','/').endsWith('/navigation-candidate.json'));
  const input=path.resolve(control,pointer.runId,artifact.path);
  if(!input.startsWith(path.join(control,pointer.runId)+path.sep))throw Error('Candidate path escapes run');
  const bytes=fs.readFileSync(input);if(sha(bytes)!==artifact.sha256)throw Error('Candidate changed');
  const candidate=JSON.parse(bytes);
  const base=JSON.parse(fs.readFileSync(path.join(root,'backend/src/main/resources/content-taxonomy.json'),'utf8'));
  const result=buildMebiMaintenance(base,candidate,{providerCatalogSha256:stage.inputs.providerCatalogSha256,sourceCandidateSha256:artifact.sha256});
  const folder=path.join(control,pointer.runId,'yol-uyumluluk');fs.mkdirSync(folder,{recursive:true});
  const output=path.join(folder,'maintenance-candidate.json');
  const data=JSON.stringify(result,null,2)+'\n';fs.writeFileSync(output+'.part',data);fs.renameSync(output+'.part',output);
  const projection=curriculumProjection(result);
  const projectionData=JSON.stringify(projection,null,2)+'\n';
  fs.writeFileSync(path.join(folder,'curriculum-identities-candidate.json'),projectionData);
  const report={status:'PASS',scope:'MAINTENANCE_SOURCE_PREPARATION_ONLY',sourceCandidateSha256:artifact.sha256,
    outputSha256:sha(Buffer.from(data)),categories:result.categories.length,originalDefinitionsPreserved:true,
    projectionSha256:sha(Buffer.from(projectionData)),selectableTopics:projection.canonicalUnits.length,
    liveMaintenanceChanged:false,frontendProjectionChanged:false,catalogPublished:false};
  fs.writeFileSync(path.join(folder,'maintenance-candidate-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
