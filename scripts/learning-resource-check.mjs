import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import { validateResource } from './learning-resource-contract.mjs';
import { taxonomyVersion } from './content-taxonomy.mjs';
const argument=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1]};
const source=argument('--labels')||new URL('../veri/content-labels/labels.json',import.meta.url);
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const taxonomyPath=argument('--taxonomy');
const expectedTaxonomyVersion=taxonomyPath
  ?'taxonomy-v1-'+createHash('sha256').update(JSON.stringify(JSON.parse(fs.readFileSync(taxonomyPath,'utf8')))).digest('hex').slice(0,24)
  :taxonomyVersion;
const categories=new Map(data.categories.map(c=>[c.id,c]));
const exceptionPath=argument('--allowed-contract-errors');
const allowedExceptions=exceptionPath ? new Set(JSON.parse(fs.readFileSync(exceptionPath,'utf8')).keys||[]) : new Set();
const errors=[];const kinds={};const locators={};const confidence={};const manualReview={};
for(const item of data.items) {
  errors.push(...validateResource(item,categories));
  if(item.taxonomyVersion!==expectedTaxonomyVersion) errors.push(`${item.key}: stale taxonomy version`);
  kinds[item.kind]=(kinds[item.kind] || 0)+1;
  if(item.manualReview)manualReview[item.manualReview.code]=(manualReview[item.manualReview.code] || 0)+1;
  for(const a of item.automaticLabels.assignments) {
    locators[a.locatorStatus]=(locators[a.locatorStatus] || 0)+1;
    confidence[a.confidence]=(confidence[a.confidence] || 0)+1;
  }
}
const errorKey=error=>error.match(/^(.*?): /)?.[1]||null;
const unallowed=errors.filter(error=>!allowedExceptions.has(errorKey(error)));
const report={contractVersion:2,taxonomyVersion:expectedTaxonomyVersion,status:unallowed.length?'FAIL':'PASS',resources:data.items.length,kinds,locators,confidence,manualReview,
  errors:unallowed,allowedLegacyErrors:errors.length-unallowed.length,allowedLegacyKeys:[...allowedExceptions].sort()};
const out=argument('--report')||fileURLToPath(new URL('../veri/content-labels/contract/catalog-report.json',import.meta.url));
fs.mkdirSync(path.dirname(path.resolve(out)),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,errors:unallowed.slice(0,10)}));
if(unallowed.length) process.exitCode=1;
