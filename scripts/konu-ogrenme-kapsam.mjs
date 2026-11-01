// Yerel TYT/AYT Matematik kapsamı. Dersin bulunması veya geniş katalog kategorisine
// bağlanması, o kategorinin bütün alt konularının tamamlandığı anlamına gelmez.
// node scripts/konu-ogrenme-kapsam.mjs [--write]
// node scripts/konu-ogrenme-kapsam.mjs --liste [--kontrol]: matematik konu listesini
// (docs/icerik/matematik-konu-listesi.md) ölçülen durumla yazar; --kontrol yazmadan uyuşmazlıkta 1 döner.
import {mkdirSync,readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {parseLesson} from '../frontend/src/learn/content/parser.js';
import {WORKED_EXAMS} from '../frontend/src/learn/content/worked-exams.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const dir=join(root,'frontend/src/learn/content/dersler');
const lessons=readdirSync(dir).filter((f)=>f.endsWith('.ders')).map((f)=>parseLesson(readFileSync(join(dir,f),'utf8'),f.slice(0,-5))).sort((a,b)=>a.order-b.order);
// Yalnız henüz ders dosyası bulunmayan alt kapsamlar; dosya eklendiğinde rapor
// kendiliğinden onu mevcut kapsamda sayar. Bunlar yeni katalog kimlikleri değildir.
const required=[
  ['ispat-yontemleri','Tanım, aksiyom, teorem ve ispat yöntemleri',9,'4c4876ddd9383c03d782'],
  ['karmasik-sayilar','Karmaşık sayılar',10,'14d232b544077857888b'],
  ['ikinci-derece-esitsizlikler','İkinci derece ve rasyonel eşitsizlikler',11,'14d232b544077857888b'],
  ['denklem-esitsizlik-sistemleri','İkinci derece denklem ve eşitsizlik sistemleri',11,'14d232b544077857888b'],
  ['fonksiyon-donusumleri','Fonksiyon uygulamaları ve dönüşümleri',11,'fa9ef387c7fda735be6b'],
  ['parabol','İkinci dereceden fonksiyon ve grafikleri',11,'807e46eb5f33cd72c139'],
  ['trigonometri-acilar','Yönlü açılar, derece, radyan ve birim çember',11,'b614d2b98d9d3f086357'],
  ['trigonometrik-fonksiyonlar','Trigonometrik fonksiyonlar ve grafikleri',11,'b614d2b98d9d3f086357'],
  ['sinus-kosinus-teoremleri','Sinüs ve kosinüs teoremleri',11,'920bf26742b613289697'],
  ['ters-trigonometrik-fonksiyonlar','Ters trigonometrik fonksiyonlar',11,'920bf26742b613289697'],
  ['toplam-fark-iki-kat','Toplam, fark ve iki kat açı formülleri',12,'059040b98443e511642d'],
  ['trigonometrik-denklemler','Trigonometrik denklemler',12,'c02a5275f57b82d8a4f8'],
  ['ustel-fonksiyon','Üstel fonksiyon',12,'be8c4eb1e94d710cd842'],
  ['logaritma','Logaritma fonksiyonu ve denklemleri',12,'be8c4eb1e94d710cd842'],
  ['diziler','Gerçek sayı dizileri, aritmetik ve geometrik dizi',12,'ff3d052707b59aa2cce2'],
  ['limit','Limit',12,'c0f24ccba08f6c271848'],
  ['sureklilik','Süreklilik',12,'c0f24ccba08f6c271848'],
  ['turev','Anlık değişim oranı ve türev',12,'6bbfb73f4942648d58d5'],
  ['turev-uygulamalari','Türevin uygulamaları',12,'6bbfb73f4942648d58d5'],
  ['belirsiz-integral','Belirsiz integral',12,'ad62942626b94927626a'],
  ['belirli-integral','Belirli integral',12,'ad62942626b94927626a'],
  ['integral-uygulamalari','İntegralin alan ve diğer uygulamaları',12,'ad62942626b94927626a'],
];
const categories=JSON.parse(readFileSync(join(root,'frontend/src/data/curriculumIdentities.json'),'utf8')).canonicalUnits.filter((u)=>u.subject==='Matematik');
for(const [id,,,suffix] of required) if(!categories.some((u)=>u.id.endsWith('.'+suffix))) throw Error(id+': yerel katalog kategorisi bulunamadı');
const existing=lessons.map((l)=>{
  const bs=l.sections.flatMap((s)=>s.blocks);
  const counts={sections:l.sections.length,worked:bs.filter((b)=>b.type==='worked').length,faded:bs.filter((b)=>b.type==='faded').length,explorations:new Set(bs.filter((b)=>b.type==='exploration').map((b)=>b.conceptId)).size,guided:bs.filter((b)=>b.type==='past_question'&&WORKED_EXAMS[b.code]?.conceptId===l.id).length};
  const structure=counts.sections>=8&&counts.worked>=20&&counts.faded>=3&&counts.explorations>=4&&counts.guided>=2;
  return {id:l.id,title:l.title,grade:l.grade,exams:l.exams,order:l.order,structure:structure?'PILOT_YAPISI':'DERINLESTIRILECEK',counts};
});
const missing=required.filter(([id])=>!lessons.some((l)=>l.id===id)).map(([id,title,grade,suffix])=>({id,title,grade,categories:categories.filter((u)=>u.id.endsWith('.'+suffix)).map((u)=>u.id),status:'DERS_YOK'}));
const report={scope:'Yerel katalogdaki TYT/AYT Matematik; pedagojik uzman veya öğretmen onayı değildir.',existing,missing,summary:{existing:existing.length,pilotStructure:existing.filter((l)=>l.structure==='PILOT_YAPISI').length,toDeepen:existing.filter((l)=>l.structure==='DERINLESTIRILECEK').length,missing:missing.length}};
if(process.argv.includes('--write')) {
  mkdirSync(join(root,'veri'),{recursive:true});
  writeFileSync(join(root,'veri/konu-ogrenme-kapsam.json'),JSON.stringify(report,null,2)+'\n');
}
if(process.argv.includes('--liste')) process.exit(topicList());
console.log(JSON.stringify(report.summary));
console.log('Sıradaki mevcut ders: '+(existing.find((l)=>l.structure==='DERINLESTIRILECEK')?.id??'yok'));
console.log('Eksik dersler: '+missing.map((l)=>l.id).join(', '));

// Matematik konu listesi: TYT/AYT “bitti” işareti yalnız ölçülen ölçütlerden gelir; elle ✅ yazılmaz.
// Ölçütler: pilot yapısı, en az 3 görseli okunmuş rehberli çıkmış soru, en az 2 video protipi
// (konuya video yoksa uygulanmaz) ve okunmuş ders anlatım PDF'i (pdfOkundu, listede elle tutulur).
function topicList() {
  const spec=JSON.parse(readFileSync(join(root,'scripts/matematik-konu-listesi.json'),'utf8'));
  const tips=JSON.parse(readFileSync(join(root,'frontend/src/learn/content/video-protips.json'),'utf8')).tips;
  const docPath=join(root,'docs/icerik/matematik-konu-listesi.md');
  const byId=Object.fromEntries(existing.map((l)=>[l.id,l]));
  const known=new Set(spec.konular.map((k)=>k.id));
  const extra=existing.filter((l)=>!known.has(l.id)).map((l)=>l.id);
  if(extra.length) { console.error('Listede olmayan ders: '+extra.join(', ')+' (scripts/matematik-konu-listesi.json)'); return 1; }
  const rows=[];
  const row=(k,n)=>{
    const l=byId[k.id],c=l?.counts;
    const protips=tips.filter((t)=>t.conceptId===k.id).length;
    const hasVideo=(k.videolar?.PL1?.length||0)+(k.videolar?.PL2?.length||0)>0;
    const cat=k.cikmis?spec.cikmisKategorileri[k.cikmis]:null;
    const missingParts=[];
    if(!l) missingParts.push('ders yok');
    else {
      if(l.structure!=='PILOT_YAPISI') missingParts.push('derinleştir ('+[c.sections<8&&'bölüm '+c.sections+'/8',c.worked<20&&'örnek '+c.worked+'/20',c.faded<3&&'tamamla '+c.faded+'/3',c.explorations<4&&'keşif '+c.explorations+'/4'].filter(Boolean).join(', ')+')');
      if(c.guided<3) missingParts.push('çıkmış soru '+c.guided+'/3');
      if(hasVideo&&protips<2) missingParts.push('video protip '+protips+'/2');
      if(!k.pdfOkundu?.length) missingParts.push('ders anlatım PDF okunmadı');
    }
    const status=!l?'⬜ DERS YOK':missingParts.length?'🟡 EKSİK':'✅ BİTTİ';
    const structure=l?`${c.sections}/${c.worked}/${c.faded}/${c.explorations}`:'—';
    const exams=l?`${c.guided}`+(cat?` / ${cat.tyt2018_2026} (${cat.ad})`:''):'—';
    const video=hasVideo?`${protips} · PL1 ${k.videolar.PL1.length}, PL2 ${k.videolar.PL2.length}`:'video yok';
    rows.push(`| ${n} | ${status} | \`${k.id}\` | ${l?.title??k.baslik??k.id} | ${l?.grade??k.sinif??''} | ${k.asama} | ${structure} | ${exams} | ${video} | ${k.pdfOkundu?.length??0}/${k.pdfAnlatim?.length??0} | ${missingParts.join('; ')||'—'}${k.not?' · '+k.not:''} |`);
    return status;
  };
  const head='| # | Durum | Kimlik | Konu | Sınıf | Aşama | Bölüm/örnek/tamamla/keşif | Rehberli çıkmış / TYT 2018–26 | Video protip · liste | PDF okundu | Kalan iş |\n|---|---|---|---|---|---|---|---|---|---|---|';
  const tyt=spec.konular.filter((k)=>k.asama==='TYT'),ayt=spec.konular.filter((k)=>k.asama==='AYT');
  const tytStatus=tyt.map((k,i)=>row(k,i+1)),tytRows=rows.splice(0);
  ayt.forEach((k,i)=>row(k,i+1));
  missing.forEach((m,i)=>rows.push(`| ${ayt.length+i+1} | ⬜ DERS YOK | \`${m.id}\` | ${m.title} | ${m.grade} | AYT | — | — | — | 0/0 | ders yok |`));
  const done=tytStatus.filter((s)=>s.startsWith('✅')).length;
  const next=tyt.find((k,i)=>!tytStatus[i].startsWith('✅'));
  const body=[`TYT: **${done}/${tyt.length} bitti**. Sıradaki TYT konusu: ${next?'`'+next.id+'`':'yok — TYT tamam; AYT aşamasına geç'}.`,
    '','### TYT (şu anki aşama)','',head,...tytRows,'','### AYT (TYT bitince)','',head,...rows].join('\n');
  const start='<!-- liste:basla (node scripts/konu-ogrenme-kapsam.mjs --liste üretir; elle düzenleme) -->',end='<!-- liste:bitis -->';
  const doc=readFileSync(docPath,'utf8').replace(/\r\n/g,'\n');
  const a=doc.indexOf(start),b=doc.indexOf(end);
  if(a<0||b<a) { console.error('Belgede liste işaretleri yok: '+docPath); return 1; }
  const next_doc=doc.slice(0,a+start.length)+'\n'+body+'\n'+doc.slice(b);
  if(process.argv.includes('--kontrol')) {
    if(next_doc!==doc) { console.error('Matematik konu listesi güncel değil: node scripts/konu-ogrenme-kapsam.mjs --liste'); return 1; }
    console.log(`Matematik konu listesi güncel. TYT ${done}/${tyt.length} bitti; sıradaki ${next?.id??'yok'}.`);
    return 0;
  }
  writeFileSync(docPath,next_doc);
  console.log(`TYT ${done}/${tyt.length} bitti; sıradaki ${next?.id??'yok'}.`);
  return 0;
}
