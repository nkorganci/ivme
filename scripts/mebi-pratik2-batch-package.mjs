// Preserve the exact source acceptance and adapt it to the shared catalog contract.
import fs from 'node:fs';
import path from 'node:path';
import {resourceDraft} from './resource-intake.mjs';
const folder=path.resolve('veri/mebi-pratik-2/20261111-source-inventory/verified-source-batch-001');
const report=JSON.parse(fs.readFileSync(path.join(folder,'report.json'),'utf8'));
const inputs=JSON.parse(fs.readFileSync(path.join(folder,'resource-inputs.json'),'utf8'));
if(inputs.length!==report.sourceRows||new Set(inputs.map(x=>x.code)).size!==inputs.length)throw Error('Source batch count mismatch');
const resources=inputs.map(input=>resourceDraft(input));
if(resources.some(r=>r.bank!=='MEBI_PRACTICE_2'||!r.categoryIds.length))throw Error('Bank/category mismatch');
fs.writeFileSync(path.join(folder,'batch-resources.json'),JSON.stringify({resources},null,2)+'\n');
console.log(JSON.stringify({resources:resources.length,questionWrites:0}));
