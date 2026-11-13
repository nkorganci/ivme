"""Bind reviewed printed chapter names to existing main-table topics.

Explicit source identities and controlled category names replace lexical
similarity. Mixed chapters are not assigned a single guessed topic.
Existing accepted packages are immutable and are never regenerated here.
"""
import json
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from yks_birlestirme import write_json

# Reviewed source chapters; every title below already exists in the main table.
RULES=[
 ('6d7ecfb0cded','Biyoloji','Denetleyici ve Düzenleyici Sistem, Duyu Organları'),
 ('9ec853fdf1ed','Biyoloji','Denetleyici ve Düzenleyici Sistem, Duyu Organları'),
 ('f496710b7497','Biyoloji','Üreme Sistemi ve Embriyonik Gelişim'),
 ('d267c89a0b88','Biyoloji','Hücresel Solunum'),
 ('a8a32ba263a1','Coğrafya','Ekosistemlerin Özellikleri ve İşleyişi'),
 ('f37ad3548c63','Coğrafya','Kültür Bölgeleri ve Türk Kültürü'),
 ('6493820e4dba','Coğrafya','Çevre Sorunları ve Geri Dönüşüm'),
 ('9be13dc01656','Fizik','İş, Güç ve Enerji'),
 ('6b68a06407c2','Fizik','Manyetik Alan ve Manyetik Kuvvet'),
 ('802d7ec32869','Fizik','Hareket ve Kuvvet'),
 ('111f164ca8dd','Fizik','Enerji'),
 ('ee6c4d98a3a5','Matematik','Üstel Fonksiyon, Logaritma Fonksiyonu (logaritma)'),
 ('fc3901724fa6','Matematik','Olasılık (basit olaylar, koşullu olasılık)'),
 ('e2226f5f7480','Matematik','Sayı Kümeleri (temel kavramlar, sayı basamakları, rasyonel sayılar)'),
 ('2eee0441fbc1','Matematik','Denklemler ve Eşitsizlikler ile İlgili Uygulamalar = PROBLEMLER (oran-orantı dahil)'),
 ('3f13d3b07597','Matematik','Önermeler ve Bileşik Önermeler / Niceleyiciler / Tanım, Aksiyom, Teorem ve İspat Yöntemleri'),
 ('83a0cab1743c','Matematik','Kümelerde Temel Kavramlar/ Kümelerde İşlemler'),
 ('804b0891174b','Matematik','Fonksiyon Kavramı ve Gösterimi/İki Fonksiyonun Bileşkesi ve Bir Fonksiyonun Tersi'),
 ('798c47d7b1af','Matematik','Polinom Kavramı ve Polinomlarda İşlemler/ Polinomların Çarpanlara Ayrılması'),
 ('d851f19d32da','Matematik','Sayı Kümeleri (temel kavramlar, sayı basamakları, rasyonel sayılar)'),
 ('6525a578e83a','Matematik','Bölünebilme Kuralları (bölme-bölünebilme, EBOB-EKOK)'),
 ('3a201b3d524f','Matematik','Üslü İfadeler ve Denklemler (üslü ve köklü sayılar)'),
 ('af5091c5d8e6','Geometri','Üçgenlerde Temel Kavramlar'),
 ('a5ac61871d4f','Geometri','Üçgenin Yardımcı Elemanları'),
 ('94c425af678e','Geometri','Üçgenin Yardımcı Elemanları'),
 ('10f439046645','Geometri','Dik Üçgen ve Trigonometri (dik üçgende trigonometrik oranlar)'),
 ('4e99101095a8','Geometri','Dik Üçgen ve Trigonometri (dik üçgende trigonometrik oranlar)'),
 ('f72a32883fb0','Geometri','Üçgenin Alanı/ Üçgenin Alanı ile ilgili Uygulamalar'),
 ('8569b699c4d7','Geometri','Çokgenler /Dörtgenler ve Özellikleri'),
 ('cca37ba6f034','Geometri','Özel Dörtgenler'),
 ('5b462aecbe30','Geometri','Özel Dörtgenler'),
 ('974a5c0674d8','Geometri','Katı Cisimler'),
 ('c232123a5a39','Türkçe','Anlatım Bozukluğu'),
 ('dd898aeaaaec','Coğrafya','Dünya’nın Yapısı ve Oluşum Süreci'),
]


def run():
    root=BASE/'single-test-crops';out=BASE/'expanded-chapter-evidence';out.mkdir(exist_ok=True)
    topics=json.loads((root/'topic-candidates.json').read_text(encoding='utf8'))['rows']
    cats=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    geometry={(r['sourceSha256'],r['printedNumber']):r for r in json.loads((root/'geometry-report.json').read_text(encoding='utf8'))['rows']}
    keys={r['code']:r for r in json.loads((root/'second-reading/report.json').read_text(encoding='utf8'))['results']}
    prior={r['code'] for r in json.loads((root/'source-pixel-acceptance.json').read_text(encoding='utf8'))['accepted']}
    bindings={};chapters=[];pending=[]
    for prefix,subject,title in RULES:
        sources=[r for r in topics if r['sourceSha256'].startswith(prefix)]
        if len(sources)!=1:raise ValueError('Reviewed source identity is not unique: '+prefix)
        doc=sources[0]
        choices=[c for c in cats if c['id'].startswith('excel.') and c['exam']==doc['exam'] and c['subject']==subject and c['topic']==title and c.get('selectable')]
        if len(choices)!=1:raise ValueError('Controlled chapter identity not unique: '+prefix+' '+title)
        category=choices[0];native=json.loads((BASE/'full-pdf-native'/(doc['sourceSha256']+'.json')).read_text(encoding='utf8'))
        headings=[l for l in native['pages'][0]['lines'] if l['bbox'][1]<75]
        row={'sourceSha256':doc['sourceSha256'],'relativePath':doc['relativePath'],'printedHeaderLines':headings,
            'exam':doc['exam'],'sourceSubject':doc['lesson'],'subject':subject,'subjectId':category['subjectId'],
            'categoryId':category['id'],'topic':category['topic'],'unit':category.get('unit'),
            'basis':'REVIEWED_PRINTED_CHAPTER_TO_EXISTING_MAIN_TABLE_TOPIC','teacherApproved':False}
        bindings[doc['sourceSha256']]=row;chapters.append(row)
    items=[]
    for crop in json.loads((root/'manifest.json').read_text(encoding='utf8'))['crops']:
        code=f'MEBI2-{crop["sourceSha256"][:16]}-Q{crop["printedNumber"]:03}'
        if code in prior or crop['sourceSha256'] not in bindings:continue
        g=geometry[(crop['sourceSha256'],crop['printedNumber'])];key=keys[code]
        if g['status']!='NATIVE_GEOMETRY_ONLY_PASS' or key['status']!='AGREES':
            pending.append({'code':code,'status':'REVIEW_REQUIRED','reasons':g.get('reasons',[]),'studentVisible':False});continue
        items.append({**crop,**{k:v for k,v in bindings[crop['sourceSha256']].items() if k not in ('printedHeaderLines',)},
            'code':code,'bank':'MEBI_PRACTICE_2','keySecondReading':key,'teacherApproved':False,
            'status':'NEW_CHAPTER_BOUND_BODY_REVIEW_REQUIRED','studentVisible':False,'productionImportAllowed':False})
    report={'status':'NEW_CHAPTER_BINDINGS_PREPARED','chapters':chapters,'items':items,
        'reviewQueueAdditions':pending,'newCandidates':len(items),'chapterCount':len(chapters),
        'byExamSubject':dict(Counter(r['exam']+':'+r['subject'] for r in items)),'questionWrites':0}
    write_json(out/'chapter-packages.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('chapters','items','reviewQueueAdditions')},ensure_ascii=True))


if __name__=='__main__':run()
