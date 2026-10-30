// Yerel TYT/AYT Matematik kapsamı. Dersin bulunması veya geniş katalog kategorisine
// bağlanması, o kategorinin bütün alt konularının tamamlandığı anlamına gelmez.
// node scripts/konu-ogrenme-kapsam.mjs [--write]
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
console.log(JSON.stringify(report.summary));
console.log('Sıradaki mevcut ders: '+(existing.find((l)=>l.structure==='DERINLESTIRILECEK')?.id??'yok'));
console.log('Eksik dersler: '+missing.map((l)=>l.id).join(', '));
