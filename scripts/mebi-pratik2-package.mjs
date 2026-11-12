// Adapt the reviewed source pilot to the existing shared resource contract.
import fs from 'node:fs';
import path from 'node:path';
import {resourceDraft} from './resource-intake.mjs';
const base=path.resolve('veri/mebi-pratik-2/20261111-source-inventory/single-test-crop-pilot');
const pack=JSON.parse(fs.readFileSync(path.join(base,'reviewed-package.json'),'utf8'));
const proof=JSON.parse(fs.readFileSync(path.join(base,'second-reading/report.json'),'utf8'));
if(proof.status!=='PASS'||proof.results.length!==21||pack.items.length!==21)throw Error('Actual source pilot key proof required');
const resources=pack.items.map(q=>resourceDraft({kind:'QUESTION',code:q.code,exam:q.exam,
  subject:'Biyoloji',topic:q.topic,categoryIds:[q.categoryId],bank:q.bank,active:true,available:true,
  image:path.basename(q.image),source:'MEBİ AYT Biyoloji Tarama Testi 7',
  title:`Solunum Sistemi — ${q.printedNumber}. soru`,
  locations:{[q.categoryId]:[{type:'PDF',sourceKey:`pdf:${q.sourceSha256}`,pdfPageStart:q.bodyPage,pdfPageEnd:q.bodyPage,pageCount:6}]}}));
fs.writeFileSync(path.join(base,'pilot-resources.json'),JSON.stringify({resources},null,2)+'\n');
const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
const columns=['code','exam_type','subject','topic','source','image','correct_answer','choice_count','active','bank'];
const rows=pack.items.map(q=>[q.code,q.exam,'Biyoloji',q.topic,'MEBİ AYT Biyoloji Tarama Testi 7',path.basename(q.image),q.answer,5,true,q.bank]);
fs.writeFileSync(path.join(base,'pilot-insert-only.csv'),[columns,...rows].map(r=>r.map(quote).join(',')).join('\n')+'\n');
console.log(JSON.stringify({resources:resources.length,csvRows:rows.length,questionWrites:0}));
