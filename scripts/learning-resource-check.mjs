import fs from 'node:fs';
import { validateResource } from './learning-resource-contract.mjs';
import { taxonomyVersion } from './content-taxonomy.mjs';
const source=new URL('../veri/content-labels/labels.json',import.meta.url);
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const categories=new Map(data.categories.map(c=>[c.id,c]));
const errors=[];const kinds={};const locators={};const confidence={};const manualReview={};
for(const item of data.items) {
  errors.push(...validateResource(item,categories));
  if(item.taxonomyVersion!==taxonomyVersion) errors.push(`${item.key}: stale taxonomy version`);
  kinds[item.kind]=(kinds[item.kind] || 0)+1;
  if(item.manualReview)manualReview[item.manualReview.code]=(manualReview[item.manualReview.code] || 0)+1;
  for(const a of item.automaticLabels.assignments) {
    locators[a.locatorStatus]=(locators[a.locatorStatus] || 0)+1;
    confidence[a.confidence]=(confidence[a.confidence] || 0)+1;
  }
}
const report={contractVersion:2,taxonomyVersion,status:errors.length?'FAIL':'PASS',resources:data.items.length,kinds,locators,confidence,manualReview,errors};
const out=new URL('../veri/content-labels/contract/catalog-report.json',import.meta.url);
fs.mkdirSync(new URL('.',out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,errors:errors.slice(0,10)}));
if(errors.length) process.exitCode=1;
