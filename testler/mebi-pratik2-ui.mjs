// Isolated UI using the actual reviewed 21-question package; no student DB.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {startLearnMock} from './lib/learn-mock.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
const base=path.join(root,'veri/mebi-pratik-2/20261111-source-inventory');
const pack=JSON.parse(fs.readFileSync(path.join(base,'single-test-crop-pilot/reviewed-package.json'),'utf8'));
const taxonomy=JSON.parse(fs.readFileSync(path.join(root,'backend/src/main/resources/content-taxonomy.json'),'utf8'));
const requests=[];
const mock=await startLearnMock(root,{metadata:{summary:{},branches:[{id:'biyoloji',name:'Biyoloji'}],categories:taxonomy.categories},
 handle(req,res,json){
  const u=new URL(req.url,'http://localhost');
  if(!['/api/questions','/api/questions/filters','/api/questions/availability'].includes(u.pathname))return false;
  requests.push({path:u.pathname,bank:u.searchParams.get('bank')});
  assert.equal(u.searchParams.get('bank'),'MEBI_PRACTICE_2');
  if(u.pathname.endsWith('/filters'))json([{examType:'AYT',subject:'Biyoloji',topic:'Solunum Sistemi',count:21,totalCount:21,examCount:21,subjectCount:21,subjectTotalCount:21,topicTotalCount:21}]);
  else if(u.pathname.endsWith('/availability'))json({total:21,remaining:21,solved:0,everWrong:0});
  else json({content:pack.items.slice(0,20).map((q,i)=>({id:i+1,code:q.code,bank:q.bank,examType:q.exam,
    subject:'Biyoloji',topic:q.topic,source:'MEBİ AYT Tarama7',resource:{unit:q.unit,subject:'Biyoloji',topics:[q.topic]}})),
    totalElements:21,totalPages:2,number:0,size:20});
  return true;
 }});
const {tarayiciAc}=await import('./lib/tarayici.mjs');
const checks=[];
try{
 for(const mobile of [false,true]){
  const browser=await tarayiciAc({mobile});
  try{
   await browser.goto('/pratik-2');
   await browser.wait(`document.body.innerText.includes(${JSON.stringify(pack.items[0].code)})`);
   assert.equal(await browser.evalJs("Array.from(document.querySelectorAll('a')).some(a=>a.getAttribute('href')==='/pratik-2' && a.textContent.includes('Soru Çöz & Pratik 2'))"),true);
   assert.equal(await browser.evalJs('document.body.innerText.includes("Solunum Sistemi")'),true);
   assert.equal(await browser.evalJs('document.documentElement.scrollWidth>document.documentElement.clientWidth+2'),false);
   assert.deepEqual(browser.errors,[]);
   checks.push({mobile,sourceBank:'MEBI_PRACTICE_2',reviewedPilotVisible:true,overflow:false});
  }finally{await browser.close();}
 }
 const report={status:'PASS',scope:'ISOLATED_REVIEWED_PILOT_UI',checks,requests,studentDatabaseWrites:0};
 fs.writeFileSync(path.join(base,'pilot-ui-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await mock.close();}
