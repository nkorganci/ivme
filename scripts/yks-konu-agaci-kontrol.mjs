// Validate an unpublished candidate against the existing controlled registry contract.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {taxonomy,validateTaxonomy} from './content-taxonomy.mjs';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const file=path.resolve(process.argv[2]||'');
if(!file.startsWith(path.join(root,'veri')+path.sep))throw Error('Candidate must be inside application evidence directory');
const bytes=fs.readFileSync(file),value=JSON.parse(bytes);
const errors=validateTaxonomy({...taxonomy,categories:value.categoryDefinitions});
const report={status:errors.length?'FAIL':'PASS',scope:'CONTROLLED_CATEGORY_CANDIDATE',
  candidateSha256:createHash('sha256').update(bytes).digest('hex'),
  categories:value.categoryDefinitions.length,legacyDefinitions:Object.keys(value.originalDefinitionHashes).length,
  published:false,errors};
fs.writeFileSync(path.join(path.dirname(file),'navigation-schema-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(errors.length)process.exitCode=1;
