// One-time, repeatable import into the existing controlled registry. Runtime reads PostgreSQL.
// Input is a saved reference snapshot; no remote code is executed.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {normaliseTerm as norm} from './content-taxonomy.mjs';
const referencePath=process.argv[2];
if(!referencePath)throw Error('Usage: node scripts/canonical-units-import.mjs <reference-topics.json>');
const reference=JSON.parse(fs.readFileSync(referencePath,'utf8'));
if(reference.length!==20)throw Error('Expected both exam sessions and all 20 reference groups');
const file=new URL('../backend/src/main/resources/content-taxonomy.json',import.meta.url);
const taxonomy=JSON.parse(fs.readFileSync(file,'utf8'));
const prior=structuredClone(taxonomy.categories);
const byId=new Map(taxonomy.categories.map(c=>[c.id,c]));
// Patterns become part of each controlled category, not an independent runtime dictionary.
const patterns={
 'tyt-turkce':['ses bilg|ses olay|unlu|unsuz','dil bilg|sozcuk tur|isim|sifat|zamir|zarf|edat|baglac|unlem|fiil|cumle(nin)? oge|cumle tur|tamlama|yapi bilg|bicim bilg|ekler|kok ve ek','noktalama','yazim|imla','anlatim bozuk','paragraf|sozel mantik|anlatim teknik|dusunceyi gelistir|metnin yapisi|metin tur','cumlede anlam|cumle yorum|cumle anlam','sozcukte anlam|sozcuk anlam|deyim|atasoz'],
 'tyt-matematik':['temel kavram|sayi kume|islem oncel|tek ve cift|pozitif|negatif|ardisik|asal say|faktoriyel','basamak|cozumleme','bolme|bolunebil','ebob|ekok|obeb|okek','rasyonel|ondalik','esitsizlik','mutlak','uslu|ustlu','koklu','carpanlara ayir|ozdeslik','oran|oranti','denklem','problem','kume|kartezyen','mantik|onerme','fonksiyon','polinom','permutasyon|kombinasyon|sayma|binom','olasilik','veri|istatistik|merkezi egilim|standart sapma'],
 'ayt-matematik':['temel kavram|sayi kume|sayi basamak|bolunebil|bolme|rasyonel|uslu|koklu|carpanlara ayir|mutlak|ebob|ekok|oran|problem|karmasik say','kume|kartezyen','mantik|onerme','fonksiyon','polinom','ikinci derece|denklem|esitsizlik','parabol','permutasyon|kombinasyon|olasilik|binom|sayma','trigonom','logarit|ustel','dizi|aritmetik dizi|geometrik dizi','limit|sureklilik','turev','integral'],
 'tyt-geometri':['aci|ucgen|pisagor|sinus|kosinus|benzerlik|eslik','cokgen|dortgen|paralelkenar','yamuk','eskenar dortgen','deltoid','kare','dikdortgen','cember|daire','analitik|koordinat|dogrunun|noktanin|donusum','kati cisim|prizma|piramit|kure|koni|silindir|uzay'],
 'ayt-geometri':['dogruda|ucgende aci|aci kavram','ozel ucgen|dik ucgen|ikizkenar|eskenar ucgen|pisagor|kenar aci','aciortay|kenarortay|yardimci eleman','alan|benzerlik|eslik','cokgen|dortgen|yamuk|kare|dikdortgen|deltoid|paralelkenar','cember|daire','noktanin|iki nokta|koordinat','dogrunun|dogru analit|egim','donusum|oteleme|donme|simetri','cemberin analit|analitik cember','kati cisim|prizma|piramit|kure|koni|silindir|uzay'],
 'tyt-biyoloji':['ortak ozellik|yasam bilimi|biyoloji bilimi|bilimsel yontem','temel bilesen|inorganik|organik|karbonhidrat|lipit|protein|enzim|vitamin|mineral|su ve|asit baz|nukleik|atp','hucre ve|hucre(nin)? yapi|organel|hucre teor|prokaryot|okaryot','zarindan|madde gecis|dif[u]?zyon|osmoz|aktif tasima|endositoz|ekzositoz','siniflandir|canli alem|bakteri|arke|protist|mantar|virus|taksonomi','bolunme|mitoz|mayoz|eseyli|eseysiz|hucre dongu|ureme','kalitim|caprazlama|soy agac|soyagac|mendel|alel|all[e]?l|kan grup|kromozom|eseye bagli','ekosistem|ekoloji|cevre|besin zincir|madde dongu|enerji akis|guncel cevre|dogal kaynak'],
 'ayt-biyoloji':['sinir|noron|impuls|refleks','endokrin|hormon|ic salgi','duyu|goz|kulak|deri|burun|dil','destek|hareket|kas|iskelet|kemik|eklem','sindirim|beslenme','dolasim|bagisiklik|kan damar|lenf|kalp','solunum sistem|soluk|akciger','uriner|bosaltim|bobrek|nefron','ureme|embriyo|gelisme|gelisim','komunite|populasyon','nukleik|dna|rna|replikasyon|yonetici molekul','genetik sifre|protein sentez|transkripsiyon|translasyon|biyoteknoloji|gen muhendis','canlilik ve enerji|atp|fosforilasyon|metabolizma','fotosentez|kemosentez','hucresel solunum|fermantasyon|glikoliz|krebs|oksijenli|oksijensiz','bitki|cimlenme|tohum|cicek|stoma|ksilem|floem','canlilar ve cevre|evrim|adaptasyon|dogal secilim|varyasyon|surdurulebilir|cevre sorun|ekosistem'],
 'tyt-kimya':['kimya bilim|kimyanin gelisim|simya|kimya disiplin|guvenlik|kimyasal sembol','atom|izotop|izobar|izoton','periyodik','turler arasi|bag|iyonik|kovalent|metalik|molekul|etkilesim','madde(nin)? hal|kati|sivi|gaz|plazma|hal degisim','temel kanun|kutlenin korun|sabit oran|katli oran','hesaplama|mol|stokiyometri|tepkime|denklem','karisim|cozelti|derisim|ayirma|cozunme','asit|baz|tuz|ph','her yerde|temizlik|polimer|kozmetik|ilac|gida|cevre|su ve hayat'],
 'ayt-kimya':['modern atom|kuantum|orbital|elektron dizil|periyodik','gaz','sivi cozelti|cozunurluk|cozelti|derisim|koligatif','enerji|entalpi|termo|hess','hiz|kinetik|carpisma','kimyasal denge|tepkimelerde denge|le chatelier','asit|baz|ph|poh|tampon|hidroliz','cozunurluk denge|cokelme|ksp','elektrik|elektro|redoks|indirgen|yukseltgen|pil','organik|karbon|hidrokarbon|alkan|alken|alkin|aromatik|benzen|alkol|eter|aldehit|keton|ester|amin|karboksil|polimer|enerji kaynak'],
 'tyt-fizik':['bilimine giris|fizik bilim|bilimsel|buyukluk|olcme|vektor','madde|ozkutle|dayaniklilik|adezyon|kohezyon|yuzey gerilim|kilcallik','kaldirma|arsimet|yuzme','basinc','isi|sicaklik|genlesme|hal degisim','hareket|hiz|ivme|konum','dinamik|newton|surtunme|kuvvet','is guc|enerji','elektrostatik|elektrik yuk|elektriklen','akim|devre|direnc|ohm','elektriksel enerji|elektriksel guc|elektrik enerji','manyeti','dalga|ses|deprem|titresim','optik|aydinlanma|golge|ayna|mercek|prizma|renk|kirilma|yansima'],
 'ayt-fizik':['vektor','hareket|kinematik|hiz|ivme','newton|dinamik|surtunme','atis|serbest dusme|dus[e]?y','is guc|enerji','itme|momentum|carpisma','tork|denge|kutle merkez|agirlik merkez|kuvvet','basit makine','elektrik alan|elektriksel kuvvet|elektriksel potans|sigac|kondansator|coulomb','manyetik alan|manyetik kuvvet','induksiyon|alternatif akim|transformator','cembersel|merkezcil','donme|yuvarlanma|acisal momentum|acisal hiz|eylemsizlik','kutle cekim|kepler|gezegen','harmonik|sarkac|yay','dalga|giris[i]?m|kirinim|doppler','atom|radyoaktiv|cekirdek|radyoaktif','modern fizik|goreli|relativite|siyah cisim|kara cisim|planck|buyuk patlama|parcacik','fotoelektrik|compton|de broglie|madde dalga','teknoloji|yari iletken|lazer|super iletken|nanoteknoloji|goruntuleme'],
 'ayt-edebiyat':['anlam|paragraf','dil bilg|ses bilg|yazim|noktalama|sozcuk tur|cumle|anlatim bozuk','metin tur|edebiyata giris|guzel sanat|hikaye|roman|tiyatro|masal|fabl|destan|efsane|ogretici|sozlu anlatim|soylev|roportaj|mulakat','siir bilg|nazim|olcu|kafiye|uyak|redif','edebi sanat|soz sanat','islamiyet oncesi|gecis donem|ilk islami|gokturk|uygur|kutadgu|divanu|atabet|dede korkut','halk edeb|anonim|asik|tekke|tasavvuf','divan edeb|klasik turk|gazel|kaside|mesnevi','tanzimat','servet|fecr','milli edeb','cumhuriyet|bes hece|yedi mesale|garip|ikinci yeni|toplumcu|hisarc|mavic|saf siir|dunya edeb','akim|romantizm|realizm|klasisizm|nat[u]?ralizm|sembolizm|parnasizm'],
 'tyt-felsefe':['felsefenin alan|felsefeyi tan|felsefeye giris|dusunme|akil yurut|ilk cag|orta cag|yuzyil|felsefe tarihi','bilgi|epistemoloji','bilim','varlik|ontoloji','ahlak|etik','siyaset|devlet','din','sanat|estetik'],
 'tyt-cografya':['harita|izohips|cografyanin|cografi konum|dunyanin sekli|dunya(nin)? hareket|paralel|meridyen|koordinat|konum','atmosfer|sicaklik','iklim|basinc|ruzgar|nem|yagis','ic ve dis|kuvvet|yer sekil|jeolojik|kaya[cç]|akarsu|buzul|karst|topograf','bitki|su toprak|toprak|su kaynak','nufus|yerlesme|goc|sehir','ekonomi|ekonomik|tarim|sanayi|ulasim|turizm|ticaret','bolge|ulke','afet|deprem|sel|cevre|dogal ortam'],
 'ayt-cografya_birlesik':['ekosistem|biyo|madde dongu|enerji akis','nufus politika','turkiye.*nufus|turkiye.*yerlesme','goc|sehir|kent|nufus.*ozellik','ekonomik faaliyet|dogal kaynak|uretim|dagitim|tuketim','turkiye ekonomi|turkiye.*tarim|turkiye.*sanayi|turkiye.*maden|turkiye.*ulasim|turkiye.*turizm','islevsel bolge|kalkinma|gap|dap|dokap','kuresel ticaret|ticaret|ekonomik orgut|kureselles','kultur|medeniyet','uluslararasi orgut|orgut','bolge|ulke|jeopolitik|siyasi cografya','cevre|toplum|afet|surdurulebilir|dogal sistem|iklim degisim'],
 'tyt-din_kulturu':['bilgi|inanc|din ve islam','ibadet|islamin sart|namaz|oruc|hac|zekat','ahlak|deger','allah|insan|kader|kaza|irade','muhammed|peygamber|siyer','vahiy|akil|kuran|kur an','yorum|mezhep|tasavvuf','kultur|medeniyet|dinler|yasayan din|guncel|din ve hayat'],
 'ayt-din_kulturu':['dunya ve ahiret|olum|ahiret','muhammed|peygamber','kavram|iman|ihsan|takva|hidayet|salih','mesaj|ayet|sure','inanc|ateizm|deizm|agnost|nihiliz|kotuluk','bilim|akil|vahiy','kultur|medeniyet|islam dusuncesi','anadolu|turk.*islam','tasavvuf|mezhep|yorum|alevi|bektasi','guncel|din ve hayat|iktisat|saglik|tip','yasayan din|dunya din|hint|cin|yahudi|hiristiyan'],
 'tyt-tarih':['tarih bilim|tarih ve zaman|ilk uygarlik|insanligin ilk|orta cag','ilk turk|turk dunya|islamiyet oncesi|asya hun|gokturk|uygur','islam tarih|islam medeni|islamiyet.*dogus|hz muhammed|dort halife|emevi|abbasi','turk.*islam|islamiyet.*kabul|karahanli|gazneli|selcuklu','kurulus|beylik|osmanli.*kurul|anadolu','yuksel|dunya guc|fetih|fatih|kanuni','kultur|medeniyet|osmanli.*teskilat|osmanli.*toplum','degisim|avrupa|duraklama|17 yuzyil|18 yuzyil|aydinlanma|devrim','19 yuzyil|denge|diplomasi|osmanli.*dagil|isyan|milliyetcilik','milli mucadele|kurtulus|cephe|kongre|mondros|birinci dunya|20 yuzyil|balkan|trablusgarp|xx yuzyil','ataturk|inkilap|cumhuriyet|dis politika|ikinci dunya|soguk savas|kureselles'],
 'ayt-tarih_birlesik':['tarih bilim|tarih ve zaman','ilk uygarlik|insanligin ilk|mezopotamya|misir|ilk cag','orta cag.*dunya|feodal','ilk turk|turk dunya|islamiyet oncesi|asya hun|gokturk|uygur','islam tarih|islam medeni|islamiyet.*dogus|hz muhammed|dort halife|emevi|abbasi','turk.*islam|islamiyet.*kabul|karahanli|gazneli|buyuk selcuklu','selcuklu turkiye|turkiye selcuklu|anadolu.*selcuk|yerlesme ve devletlesme','kurulus|beylik|osmanli.*kurul','savasci|asker|ordu|timar|yeniceri','yuksel|dunya guc|fetih|fatih|kanuni','sultan|merkez teskilat|osmanli kultur|osmanli.*toplum|osmanli medeni','degisen dunya denge|osmanli siyas|duraklama|17 yuzyil','degisim cag|avrupa|18 yuzyil|islahat','uluslararasi iliski|denge strateji|19 yuzyil|diplomasi','devrim|devlet toplum|milliyetcilik|demokratik|sermaye ve emek|sanayi|modernles','20 yuzyil|xx yuzyil|birinci dunya|balkan|trablusgarp|en uzun yuzyil','milli mucadele|kurtulus|cephe|kongre|mondros','ataturk|inkilap|cumhuriyet|iki savas arasi','ikinci dunya|ii dunya|soguk savas|kureselles|yumusama|turk dis politika|cagdas turk|21 yuzyil'],
};
const canonical=[];
const additional={
 'tyt-biyoloji':{0:'yasamin|^biyoloji$',1:'temel bilesik|yapisindaki bilesik|yapisinda bulunan',2:'^hucre$',4:'canlilar dunyasi'},
 'ayt-biyoloji':{11:'genden proteine|genetik arastir|model organizma',12:'enerji donusum'},
 'ayt-kimya':{0:'lewis',3:'isi degisim|tepkime isi',4:'tepkimelerde hiz',5:'dengeyi etkileyen',8:'korozyon',9:'hibrit|molekul geometri|fonksiyonel grup'},
 'tyt-kimya':{0:'sembolik dil|is sagligi',3:'fiziksel ve kimyasal degisim',9:'gunluk hayat|doga ve kimya'},
 'tyt-fizik':{0:'fiziksel nicelik',1:'yapisma|birbirini tutma'},
 'ayt-fizik':{8:'paralel levha|siga',9:'^manyetizma$',19:'laser'},
 'ayt-edebiyat':{0:'anlatim bicim|dusunceyi gelistir|anlatici|bakis acisi|anlati teknik',1:'tamlama|zamir|fiil|zarf|sozcukte yapi',2:'edebi tur|haber met|ani |hatira|biyografi|mektup|deneme|elestiri|makale|sohbet|fikra|gezi yazi|gunluk|blog|nesir|anlati ve tur|pendname|edebiyatin temel',3:'siir|ahenk',6:'halk siir',7:'divan siir'},
 'tyt-cografya':{0:'cografya bilim|doga ve insan|insan ve doga|dunya nin sekli',3:'tektonik|yapi.*olusum|yuzey sekil',4:'su varlik',5:'yerlesim'},
 'ayt-cografya_birlesik':{4:'dunyada ekonomi|enerji nakil|kaynaklarin kullan|hizmet sektor|ulasim sistem',5:'turkiye.*ekonomi',10:'konumsal onem',11:'ekstrem|kuraklik|doga olay|iklim'},
 'tyt-din_kulturu':{0:'varolusun|ahiret',7:'sosyal|anadolu|gonul|milletimiz|bilim|sahsiyet|hristiyan|h[ıi]ristiyan'},
 'ayt-din_kulturu':{2:'sirat|allah.*isim|allah.*varlik|allah.*irtibat',3:'kuran|kur an',6:'turklerin musluman',9:'dini mesele|ahlak|ibadet|iktisadi|din ve ekonomi|tutum ve davranis',10:'hristiyan|hindu|budiz|taoiz|yeni dini|dinler tarih'},
 'tyt-tarih':{0:'tarih ogren|takvim|yazinin icad|ilk cag',1:'kavimler|boylardan|turk devlet|ul[u]?s gelen|kara kuvvet',3:'islamiyet.*turk',4:'bizans|beyligi.*devletles',6:'osmanli.*(sehzade|merkez|tasra|vakif|millet sistem|tarimsal)|tek hanedan',7:'cografi kesif|xvii|1595|1700|denizcilik',8:'tanzimat|islahat|kanun i esasi|demokratikles|1876|1913|sanayilesme',9:'i dunya|kuvay|meclisinin|meclisinin|mill[i]?ye',10:'ii dunya|1950|xxi'},
 'ayt-tarih_birlesik':{5:'gulam|ribat',10:'kadi|osmanli devlet gelen',11:'cografi kesif',13:'sark mesele|osmanli rus',14:'esham|ayan|meclis i mebusan|mesrutiyet',15:'i dunya savasi',16:'tekalif',17:'mustafa kemal',18:'1960|filistin|kibris|xxi|21 yuzyil'},
};
let order=0;
for(const group of reference) {
  const split=group.id==='ayt-felsefe_grubu';
  for(const [i,topic] of group.topics.entries()) {
    const subjectId=split?['felsefe','psikoloji','sosyoloji','mantik'][i]:group.id.replace(/^(tyt|ayt)-/,'').replace('_birlesik','').replace('din_kulturu','din');
    const subject=split?topic:subjectId==='tarih'?'Tarih':subjectId==='cografya'?'Coğrafya':group.name;
    const previous=prior.filter(c=>c.exam===group.exam&&c.subjectId===subjectId&&!c.subtopic&&!c.id.startsWith('system.'))
      .sort((a,b)=>Number(b.origin==='CURRICULUM')-Number(a.origin==='CURRICULUM'));
    const existing=previous.find(c=>norm(c.topic)===norm(topic)) || previous.find(c=>(c.aliases||[]).some(a=>norm(a)===norm(topic)));
    let id=existing?.id || `${group.exam.toLowerCase()}.${subjectId}.${norm(topic).replaceAll(' ','-')}`;
    const c=existing?byId.get(id):{id,exam:group.exam,subjectId,subject,origin:'CURRICULUM'};
    const aliases=[...new Set([...(c.aliases||[]),c.topic].filter(t=>t&&t!==topic))];
    Object.assign(c,{topic,subject,subtopic:'',origin:'CURRICULUM',canonicalTopic:true,canonicalUnit:true,selectable:true,order:++order,aliases,
      matchingPatterns:split?['.*']:[patterns[group.id]?.[i] || norm(topic),...(additional[group.id]?.[i]?[additional[group.id][i]]:[])],referenceUrl:'https://arkyks.com/rehber/yks-konu-takip-cizelgesi',canonicalTopicIds:[id]});
    delete c.parentId;delete c.detail;delete c.splitFromTitles;delete c.excludedPatterns;
    // Preserve a known grade only when the old unit has exactly the same extent.
    if(!existing||norm(existing.topic)!==norm(topic))delete c.grade;
    c.estimatedGrades=c.grade?[c.grade]:group.exam==='TYT'?[9,10]:[11,12];
    if(!byId.has(id)){byId.set(id,c);taxonomy.categories.push(c);}
    canonical.push(c);
  }
}
const generic=/^(temel kavramlar( ve kapsam)?|genel kapsam|konu anlatimi|tanim ve kapsam|giris)$/;
function targets(old,visited=new Set()) {
  if(visited.has(old.id))return [];visited.add(old.id);
  let subjectId=old.subjectId;
  if(subjectId==='matematik'&&/ucgen|dortgen|cokgen|cember|daire|kati cisim|uzay geometri|analitik geometri|donusum/.test(norm(old.topic)))subjectId='geometri';
  if(subjectId==='edebiyat'&&old.exam==='TYT')subjectId='turkce';
  const candidates=canonical.filter(c=>c.exam===old.exam&&c.subjectId===subjectId);
  const find=text=>{
    text=norm(text);if(!text)return [];
    const exact=candidates.filter(c=>[c.topic,...c.aliases].some(t=>norm(t)===text));
    if(exact.length)return exact.map(c=>c.id);
    // Prefer the most specific matching phrase. Broad rules must not swallow a named unit.
    const hits=candidates.flatMap(c=>c.matchingPatterns.flatMap(p=>[...text.matchAll(new RegExp(p,'g'))].filter(m=>m[0].length).map(m=>({id:c.id,size:m[0].length}))));
    if(!hits.length)return [];
    const max=Math.max(...hits.map(h=>h.size));
    return [...new Set(hits.filter(h=>h.size===max).map(h=>h.id))];
  };
  if(old.id.startsWith('system.'))return [];
  const broadTitles={
    'AYT.biyoloji.canlilarda enerji donusumleri':['Canlılık ve Enerji','Fotosentez ve Kemosentez','Hücresel Solunum'],
    'AYT.biyoloji.insan fizyolojisi':['Sinir Sistemi','Endokrin Sistem','Duyu Organları','Destek ve Hareket Sistemi','Sindirim Sistemi','Dolaşım ve Bağışıklık Sistemi','Solunum Sistemi','Üriner Sistem','Üreme Sistemi ve Embriyonik Gelişim'],
    'TYT.kimya.atom ve periyodik sistem':['Atomun Yapısı','Periyodik Sistem'],
    'AYT.fizik.elektrik ve manyetizma':['Elektrik Alan ve Potansiyel','Manyetik Alan ve Manyetik Kuvvet','İndüksiyon, Alternatif Akım ve Transformatörler'],
    'AYT.fizik.atom modelleri':['Atom Modelleri ve Atom Fiziği','Modern Fizik'],
    'AYT.fizik.modern fizige giris':['Modern Fizik','Fotoelektrik ve Compton'],
    'TYT.fizik.hareket ve kuvvet':['Hareket ve Kuvvet','Dinamik'],
  };
  const broad=broadTitles[`${old.exam}.${subjectId}.${norm(old.topic)}`];
  const narrowExact=old.subtopic?candidates.filter(c=>[c.topic,...c.aliases].some(t=>norm(t)===norm(old.subtopic))):[];
  if(narrowExact.length===1)return [narrowExact[0].id];
  const mainExact=candidates.filter(c=>[c.topic,...c.aliases].some(t=>norm(t)===norm(old.topic)));
  if(!broad&&mainExact.length===1)return [mainExact[0].id];
  const main=find(old.topic);
  if(!broad&&main.length===1)return main;
  const narrow=old.subtopic&&!generic.test(norm(old.subtopic))?find(old.subtopic):[];
  if(narrow.length===1)return narrow;
  if(broad)return candidates.filter(c=>broad.includes(c.topic)).map(c=>c.id);
  if(old.parentId&&byId.has(old.parentId)){const parent=targets(byId.get(old.parentId),visited);if(parent.length)return parent;}
  return main.length?main:narrow;
}
const canonicalIds=new Set(canonical.map(c=>c.id));
for(const old of prior) {
  if(canonicalIds.has(old.id))continue;
  const current=byId.get(old.id);
  Object.assign(current,{canonicalTopic:false,canonicalUnit:false,selectable:false,canonicalTopicIds:targets(old)});
}
for(const c of canonical) c.canonicalTopicIds=[c.id];
for(const exam of ['TYT','AYT'])for(const subjectId of new Set(canonical.map(c=>c.subjectId))) {
  const id=`system.${subjectId}.${exam.toLowerCase()}.konu-incelemesi`;
  if(!byId.has(id))taxonomy.categories.push({id,exam,subjectId,subject:canonical.find(c=>c.subjectId===subjectId).subject,
    topic:'Ünite eşleşmesi bekliyor',subtopic:'',origin:'SYSTEM',selectable:false,canonicalTopicIds:[]});
}
taxonomy.unitReference={url:'https://arkyks.com/rehber/yks-konu-takip-cizelgesi',retrievedDate:'2026-10-18',
  sha256:createHash('sha256').update(fs.readFileSync(referencePath)).digest('hex'),version:1,
  policy:'UNIT_ONLY_PRESERVE_LEGACY_IDENTITIES',units:canonical.length};
taxonomy.physicsCurriculum={...taxonomy.physicsCurriculum,supersededBy:'unitReference'};
fs.writeFileSync(file,JSON.stringify(taxonomy,null,2)+'\n');
const report={units:canonical.length,byBranch:{},unmapped:[]};
for(const c of canonical){const key=`${c.exam}.${c.subjectId}`;report.byBranch[key]=(report.byBranch[key]||0)+1;}
for(const c of taxonomy.categories)if(!c.canonicalUnit&&!c.id.startsWith('system.')&&!c.canonicalTopicIds?.length)report.unmapped.push({id:c.id,exam:c.exam,subjectId:c.subjectId,topic:c.topic,subtopic:c.subtopic});
fs.writeFileSync(new URL('../veri/content-labels/unit-mapping-report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({units:report.units,byBranch:report.byBranch,unmapped:report.unmapped.length}));
