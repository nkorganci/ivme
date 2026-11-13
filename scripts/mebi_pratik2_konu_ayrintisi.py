"""Bind additional exact printed subchapter names to existing broad main rows.

No fuzzy matching and no new topic identities. Already reserved packages are
left intact. Mixed printed headings must all resolve to the same main row.
"""
import hashlib
import json
from collections import Counter
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_arsiv_basliklari import controlled_match,chapter_key
from yks_birlestirme import write_json

OUT=BASE/'reviewed-topic-expansion'
RULES=[
 ('Matematik','Denklemler ve Eşitsizlikler ile İlgili Uygulamalar = PROBLEMLER (oran-orantı dahil)',
  ['Denklemler ve Eşitsizliklerle İlgili Uygulamalar','Kesir Problemleri','Yaş Problemleri','İşçi Problemleri','Sayı Problemleri']),
 ('Matematik','İkinci Dereceden Denklemler, Karmaşık Sayılar, Denklem ve Eşitsizlik Sistemleri',
  ['İkinci Dereceden Bir Bilinmeyenli Denklemler','İkinci Dereceden Bir Bilinmeyenli Eşitsizlik Sistemleri','İkinci Dereceden İki Bilinmeyenli Denklem Sistemleri','Karmaşık Sayılar']),
 ('Matematik','Yönlü Açılar, Trigonometrik Fonksiyonlar (trigonometri-1)',
  ['Trigonometrik Fonksiyonlar','Yönlü Açılar','Trigonometrik Fonksiyonlar ve Grafikleri']),
 ('Matematik','Belirsiz İntegral, Belirli İntegral ve Uygulamaları',
  ['Belirli İntegral ve Uygulamaları','Belirsiz İntegral','Belirli İntegral','İntegral Uygulamaları']),
 ('Matematik','Üslü İfadeler ve Denklemler (üslü ve köklü sayılar)',
  ['Üslü İfadeler ve Denklemler','Köklü İfadeler','Üslü İfadeler','Üslü ve Köklü Sayılar']),
 ('Matematik','Gerçek Sayı Dizileri (diziler)',['Gerçek Sayı Dizileri']),
 ('Matematik','Bölünebilme Kuralları (bölme-bölünebilme, EBOB-EKOK)',
  ['Bölünebilme Kuralları','EBOB-EKOK Kavramı ve Özellikleri','EBOB-EKOK Problemleri','Periyodik Problemler']),
 ('Matematik','Sayı Kümeleri (temel kavramlar, sayı basamakları, rasyonel sayılar)',
  ['Sayı Kümeleri','Doğal Sayılar','Tam Sayılar','Rasyonel Sayılar','İrrasyonel Sayılar','Sayı Basamakları']),
 ('Matematik','Üstel Fonksiyon, Logaritma Fonksiyonu (logaritma)',
  ['Logaritma Fonksiyonu','Üstel Fonksiyon','Üstel, Logaritmik Denklemler ve Eşitsizlikler']),
 ('Matematik','Merkezi Eğilim ve Yayılım Ölçüleri/ Verilerin Grafikle Gösterilmesi (istatistik)',
  ['Merkezi Eğilim ve Yayılım Ölçüleri','Verilerin Grafik ile Gösterilmesi','Veri ve İstatistik']),
 ('Matematik','Olasılık (basit olaylar, koşullu olasılık)',
  ['Koşullu Olasılık - Deneysel ve Teorik Olasılık','Sayma ve Olasılık / Basit Olayların Olasılıkları','Basit Olayların Olasılıkları','Olasılıkta Temel Kavramlar','Olasılık Kavramı ile İlgili Uygulamalar']),
 ('Matematik','Fonksiyon Kavramı ve Gösterimi/İki Fonksiyonun Bileşkesi ve Bir Fonksiyonun Tersi',
  ['Fonksiyon Kavramı ve Gösterimi','İki Fonksiyonun Bileşkesi ve Ters Fonksiyon','Fonksiyonlarda Dört İşlem','Fonksiyon Grafikleri','Doğrusal ve Parçalı Fonksiyonlar','Tek, Çift Fonksiyonlar']),
 ('Matematik','Birinci Dereceden Denklemler ve Eşitsizlikler (denklem çözme, basit eşitsizlik, mutlak değer)',
  ['Birinci Dereceden Denklem ve Eşitsizlikler','Birinci Dereceden Bir Bilinmeyenli Denklemler','Birinci Dereceden İki Bilinmeyenli Denklemler','Basit Eşitsizlikler',
   'Birinci Dereceden İki Bilinmeyenli Eşitsizlikler','Birinci Dereceden İki Bilinmeyenli Eşitsizlik Sistemleri','Mutlak Değer Kavramı ve Özellikleri','Mutlak Değerli Denklem ve Eşitsizlikler']),
 ('Matematik','Polinom Kavramı ve Polinomlarda İşlemler/ Polinomların Çarpanlara Ayrılması',
  ['Polinomların Çarpanlara Ayrılması','Polinom Kavramı ve Polinomlarda İşlemler']),
 ('Matematik','İkinci Dereceden Fonksiyon ve Grafikleri (parabol)',['İkinci Dereceden Fonksiyonlar ve Grafikleri']),
 ('Matematik','Kümelerde Temel Kavramlar/ Kümelerde İşlemler',
  ['Kümelerde İşlemler','Kümelerde Temel Kavramlar','Alt Küme','Kümelerde Kesişim ve Birleşim İşlemleri','Kümelerde Fark ve Tümleme İşlemleri','Küme Problemleri','Sıralı İkililer ve Kartezyen Çarpım']),
 ('Matematik','Anlık Değişim Oranı ve Türev, Türevin Uygulamaları',['Türevin Uygulamaları']),
 ('Matematik','Fonksiyonlar ile İlgili Uygulamalar, Fonksiyon Dönüşümleri',['Fonksiyonların Dönüşümleri','Fonksiyonlarla ilgili Uygulamalar']),
 ('Matematik','Önermeler ve Bileşik Önermeler / Niceleyiciler / Tanım, Aksiyom, Teorem ve İspat Yöntemleri',
  ['Önermeler ve Bileşik Önermeler','Önermeler','Bileşik Önermeler','Koşullu Önerme','İki Yönlü Koşullu Önerme','Niceleyiciler','Tanım, Aksiyom, Teorem ve İspat Kavramları']),
 ('Geometri','Dönüşümler',['Analitik Düzlemde Temel Dönüşümler']),
 ('Geometri','Doğrunun Analitik İncelenmesi',['Doğrunun Analitik İncelemesi']),
 ('Geometri','Çember ve Daire',['Çemberde Teğet – Dairenin Çevresi ve Alanı','Çemberin Temel Elemanları - Çemberde Açılar']),
 ('Geometri','Üçgenlerde Temel Kavramlar',['Üçgende Temel Kavramlar']),
 ('Geometri','Üçgenin Alanı/ Üçgenin Alanı ile ilgili Uygulamalar',['Üçgende Alan']),
 ('Fizik','Modern Fiziğin Teknolojideki Uygulamaları',
  ['Görüntüleme Cihazları, LCD ve Plazma','Yarı İletken Teknolojisi','Süper İletkenler','Nanoteknoloji','LASER Işınları']),
 ('Coğrafya','Atmosfer ve İklim Bilgisi',['İklim Bilimi']),
 ('Coğrafya','Coğrafi Koordinat Sistemi',['Yer ve Zaman-Koordinat Sistemi']),
 ('Fizik','İtme ve Momentum',['Çizgisel Momentumun Korunumu (Esnek Çarpışmalar)','Çizgisel Momentumun Korunumu (Esnek Olmayan Çarpışmalar ve Patlamalar)']),
 ('Biyoloji','Mitoz ve Eşeysiz Üreme',['Hücre Döngüsü, Mitoz ve Eşeysiz Üreme']),
 ('Biyoloji','Hücre',['Hücre Zarından Madde Geçişleri']),
]


def match_title(title,exam,subjects,categories):
    possible={}
    for subject,target,aliases in RULES:
        if subject not in subjects or chapter_key(title) not in {chapter_key(x) for x in aliases}:continue
        for c in categories:
            if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject']==subject and c['topic']==target:possible[c['id']]=c
    direct=controlled_match(title,exam,subjects,categories)
    if direct:possible[direct['id']]=direct
    return next(iter(possible.values())) if len(possible)==1 else None


def match_headings(headings,exam,subjects,categories):
    parts=[piece.strip() for line in headings if line.get('text','').lstrip().startswith('>') for piece in line['text'].split('>')[1:] if piece.strip()]
    results=[]
    for part in parts:
        direct=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject'] in subjects and normalize(c['topic'])==normalize(part)]
        found=direct[0] if len(direct)==1 else match_title(part,exam,subjects,categories)
        if not found:return None
        results.append(found)
    unique={r['id']:r for r in results}
    return next(iter(unique.values())) if len(unique)==1 else None


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():raise ValueError('Reviewed topic package is immutable; resume its admission job')
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    reserved=set()
    for p in BASE.glob('*/chapter-packages.json'):
        data=json.loads(p.read_text(encoding='utf8'))
        reserved.update(r['code'] for r in data.get('items',[]))
    items={};all_groups={};rule_sha=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    def add(row,g,category,evidence):
        if not category or row['code'] in reserved:return
        all_groups[g['groupId']]=g
        items[row['code']]={**row,'groupId':g['groupId'],'subject':category['subject'],'subjectId':category['subjectId'],
            'categoryId':category['id'],'topic':category['topic'],'unit':category.get('unit'),
            'topicEvidence':{'basis':'REVIEWED_EXACT_SUBCHAPTER_CONTAINMENT_IN_EXISTING_MAIN_ROW','sourceHeading':evidence,
                'rulesSha256':rule_sha,'teacherApproved':False},'status':'NEW_CONTROLLED_TOPIC_REQUIRES_INDEPENDENT_KEY_AND_BODY',
            'productionImportAllowed':False,'studentVisible':False}
    for directory in ['three-step-all-bodies-v2','compiled-tarama-crops','word-boundary-crops','four-square-crops']:
        for path in sorted((BASE/directory).glob('*.json')):
            data=json.loads(path.read_text(encoding='utf8'))
            if not isinstance(data,dict):continue
            groups={g['groupId']:g for g in data.get('keyGroups',[])}
            for row in data.get('items',[]):
                if row.get('categoryId') or row['code'] in reserved:continue
                group=groups[row['groupId']];subjects=row.get('subjectCandidates',[])
                if directory in ('compiled-tarama-crops','word-boundary-crops') and not group.get('chapter'):
                    category=match_headings(row.get('printedSourceHeadings',[]),row['exam'],subjects,categories);heading=row.get('printedSourceHeadings',[])
                else:
                    heading=row.get('printedChapter') or group.get('chapter') or row.get('topic','')
                    category=match_title(heading,row['exam'],subjects,categories)
                add(row,group,category,heading)
    topics={r['sourceSha256']:r for r in json.loads((BASE/'single-test-crops/topic-candidates.json').read_text(encoding='utf8'))['rows']}
    geometry={(r['sourceSha256'],r['printedNumber']):r for r in json.loads((BASE/'single-test-crops/geometry-report.json').read_text(encoding='utf8'))['rows']}
    accepted={r['code'] for r in json.loads((BASE/'single-test-crops/source-pixel-acceptance.json').read_text(encoding='utf8'))['accepted']}
    accepted.update(r['code'] for r in json.loads((BASE/'expanded-chapter-evidence/source-pixel-acceptance.json').read_text(encoding='utf8'))['accepted'])
    for crop in json.loads((BASE/'single-test-crops/manifest.json').read_text(encoding='utf8'))['crops']:
        sha=crop['sourceSha256'];code=f'MEBI2-{sha[:16]}-Q{crop["printedNumber"]:03}'
        if code in accepted or code in reserved or geometry[(sha,crop['printedNumber'])]['status']!='NATIVE_GEOMETRY_ONLY_PASS':continue
        source=topics[sha];native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
        headings=[l for l in native['pages'][0]['lines'] if l['bbox'][1]<75];exam=source['exam'];subjects=[source['lesson']]
        category=match_headings(headings,exam,subjects,categories)
        group={'groupId':sha[:16]+'-ST-Q'+str(crop['printedNumber']),'sourceSha256':sha,'relativePath':crop['relativePath'],
            'keyIdentityType':'SINGLE_TEST_PRINTED_NUMBER','sourceQuestionCode':code,
            'keyPage':crop['keyPage'],'keyClip':crop['keyClip'],'keyImage':crop['keyImage'],'keyImageSha256':crop['keyImageSha256'],
            'answers':{str(crop['printedNumber']):crop['answer']}}
        row={**crop,'code':code,'exam':exam,'subjectCandidates':subjects}
        add(row,group,category,headings)
    result={'status':'REVIEWED_ADDITIONAL_SUBCHAPTER_PACKAGES_NOT_IMPORTED','items':list(items.values()),'keyGroups':list(all_groups.values()),
        'candidateBodies':len(items),'reservedQuestionCodesNotRepeated':len(reserved),'rulesSha256':rule_sha,
        'byExamSubject':dict(Counter(r['exam']+':'+r['subject'] for r in items.values())),'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(target,result);(OUT/'rules-source-snapshot.py').write_bytes(Path(__file__).read_bytes())
    print(json.dumps({k:v for k,v in result.items() if k not in ('items','keyGroups')},ensure_ascii=False))


if __name__=='__main__':run()
