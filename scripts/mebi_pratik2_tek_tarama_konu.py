"""Resolve printed single-topic Tarama headings against existing main rows.

Only exact headings and explicit containment rules are used. A mixed chapter
keeps its fine-topic review status; file names never guess an individual topic.
"""
import hashlib
import json
import re
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_konu_ayrintisi import match_title
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

OUT=BASE/'individual-tarama-topic-expansion'
GEOMETRY_HEADINGS={
 **dict.fromkeys(['Dik Dairesel Silindirde Uzunluk, Alan ve Hacim','Kürede Uzunluk, Alan ve Hacim'],'Katı Cisimler'),
 **dict.fromkeys(['Çemberde Teğet, Kiriş, Çap, Yay Kesen ve Özellikleri','Çevrel Çember',
                 'Üçgenin İç Teğet ve Dış Teğet Çemberi ve Özellikleri'],'Çember ve Daire'),
}
RULES={
 'Biyoloji':{
  'Canlıların Ortak Özellikleri':'Biyoloji ve Canlıların Ortak Özellikleri',
  'Güncel Çevre Sorunları':'Güncel Çevre Sorunları ve İnsan',
  'Duyu Organları':'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
  'Nükleik Asitler':'Nükleik Asitlerin Keşfi ve Önemi',
  'Hücresel Yapılar ve Görevleri':'Hücre',
  'Kalıtımla İlgili Kavramlar, Olasılık İlkeleri, Gamet Çeşitlerinin Bulunması':'Kalıtım ve Biyolojik Çeşitlilik',
  'Mendel İlkeleri ve Çaprazlamalar':'Kalıtım ve Biyolojik Çeşitlilik',
  'Eş Baskınlık, Çok Alellilik, Kan Gruplarının Kalıtımı':'Kalıtım ve Biyolojik Çeşitlilik',
 },
 'Matematik':{
  **GEOMETRY_HEADINGS,
  **dict.fromkeys(['İkinci Dereceden Bir Bilinmeyenli Eşitsizliklerin Çözüm Kümesi',
                  'İki İfadenin Çarpımı ve Bölümü Şeklinde Verilen Eşitsizliklerin Çözüm Kümesi',
                  'İkinci Dereceden Bir Bilinmeyenli Eşitsizlik Sistemleri'],
                 'İkinci Dereceden Denklemler, Karmaşık Sayılar, Denklem ve Eşitsizlik Sistemleri'),
  **dict.fromkeys(['İkinci Dereceden Bir Değişkenli Fonksiyonun Grafiğinin Çizimi',
                  'Parabolün Tepe Noktası, Simetri Ekseni ve Görüntü Kümesi ile İlgili Uygulamalar','Parabolün Grafik Çizimi',
                  'Bazı Elemanları Verilen Parabol Denklemini Yazma','Bir Parabol ile Bir Doğrunun Birbirlerine Göre Durumları',
                  'İkinci Dereceden Fonksiyonlarla Modellenebilen Problemler'],
                 'İkinci Dereceden Fonksiyon ve Grafikleri (parabol)'),
  **dict.fromkeys(['sinx = a , cosx = a ,tanx = a ve cotx = a Denklemlerinin Çözüm Kümesi',
                  'Lineer ve Homojen Denklemlerin Çözüm Kümesi'],'Trigonometrik Denklemler'),
  **dict.fromkeys(['Üstel ve Logaritmik Denklemler','Üstel ve Logaritmik Eşitsizlikler',
                  'Gerçek Hayat Durumları ile İlgili Üstel ve Logaritmik Fonksiyon Problemleri'],
                 'Üstel Fonksiyon, Logaritma Fonksiyonu (logaritma)'),
  **dict.fromkeys(['Dizi Kavramı ve Dizinin Terimleri','Dizi Çeşitleri ve İndirgeme Bağıntısı',
                  'Aritmetik Dizi ve Özellikleri','Geometrik Dizi ve Özellikleri',
                  'Aritmetik ve Geometrik Dizilerde Sonlu Toplamlar','Gerçek Hayat Durumları ile İlgili Dizi Problemleri'],
                 'Gerçek Sayı Dizileri (diziler)'),
  **dict.fromkeys(['Türev Kavramı','Türev Alma Kuralları','Bir Fonksiyonun Artan ve Azalan olduğu Aralıklar',
                  'Bir Fonksiyonun Ekstremum Noktaları','Türev Yardımıyla Bir Fonksiyonun Grafiğinin Çizimi',
                  'Maksimum ve Minimum Problemleri'],'Anlık Değişim Oranı ve Türev, Türevin Uygulamaları'),
  **dict.fromkeys(['Belirsiz İntegral ve İntegral Alma Kuralları','Değişken Değiştirme Yöntemi',
                  'Belirli İntegral Kavramı','Belirli İntegralin Özellikleri','Belirli İntegral ile Alan Hesabı',
                  'Riemann Toplamı','İki Fonksiyonun Grafiği Arasında Kalan Sınırlı Bölgenin Alanı'],
                 'Belirsiz İntegral, Belirli İntegral ve Uygulamaları'),
 },
 'Fizik':{
  **dict.fromkeys(['Elektriksel Kuvvet','Elektriksel Potansiyel Enerji ve Elektriksel Potansiyel',
                  'Elektrik Alan','Elektriksel Potansiyel Farkı ve Elektriksel İş'],
                 'Elektrik Alan ve Potansiyel'),
  **dict.fromkeys(['Elektrik Yüklerinin Özellikleri ve Elektrikle Yüklenme Çeşitleri',
                  'İletken ve Yalıtkanlarda Yük Dağılımı','Elektriksel Kuvvet ve Elektrik Alan'],
                 'Elektrostatik'),
  **dict.fromkeys(['Düzgün Elektrik Alan','Sığa Kavramı ve Sığaçlar'],'Paralel Levhalar ve Sığa'),
  **dict.fromkeys(['Su Dalgalarında Kırınım ve Girişim','Işığın Çift Yarıkta Girişimi','Işığın Tek Yarıkta Kırınımı',
                  'Işığın Dalga Doğası ve Doppler Olayı','Elektromanyetik Dalgalar'],'Dalga Mekaniği ve Elektromanyetik Dalgalar'),
  **dict.fromkeys(['Isı ve Sıcaklık Kavramları, Termometreler','Isı Alışverişi','Hâl Değişimi','Isıl Denge',
                  'Enerji İletim Yolları','Genleşme'],'Isı, Sıcaklık ve Genleşme'),
 },
 'Edebiyat':{'Divan Şiiri':'Divan Edebiyatı','Cumhuriyet Dönemi Türk Şiiri':'Cumhuriyet Dönemi Türk Edebiyatı'},
 'Geometri':GEOMETRY_HEADINGS,
}


def source_subject(path,categories,exam):
    pieces=path.split('\\')
    labels=[p.split(' (')[0] for p in pieces if p.endswith('(TYT)') or p.endswith('(AYT)') or p.endswith('(TYT-AYT)')]
    candidates={c['subject'] for c in categories if c.get('selectable') and c.get('exam')==exam and c['id'].startswith('excel.')}
    aliases={'din kulturu ve ahlak bilgisi':'Din Kültürü (DKAB)','turk dili ve edebiyati':'Edebiyat'}
    labels=[aliases.get(normalize(label),label) for label in labels]
    found={s for s in candidates for label in labels if normalize(s)==normalize(label)}
    return next(iter(found)) if len(found)==1 else None


def printed_test_subject(lines,exam,test_number,categories):
    headers=[normalize(line['text']) for line in lines if line['bbox'][1]<75]
    if not any(re.search(r'\b'+exam.lower()+r' tarama testi\s+'+str(int(test_number))+r'\b',h) for h in headers):return None
    aliases={'din kulturu ve ahlak bilgisi':'Din Kültürü (DKAB)','turk dili ve edebiyati':'Edebiyat'}
    labels={aliases.get(h,h) for h in headers}
    found={c['subject'] for c in categories if c.get('selectable') and c['id'].startswith('excel.')
           and c.get('exam')==exam and any(normalize(c['subject'])==normalize(label) for label in labels)}
    return next(iter(found)) if len(found)==1 else None


def source_subject_for_row(row,categories):
    subject=source_subject(row['relativePath'],categories,row['exam'])
    if subject:return subject
    if not row.get('testNumber') or not row.get('bodyPage'):return None
    path=BASE/'full-pdf-native'/(row['sourceSha256']+'.json')
    if not path.exists():return None
    native=json.loads(path.read_text(encoding='utf8'))
    if native.get('sourceSha256')!=row['sourceSha256'] or native.get('status')!='SCANNED':return None
    page=next((p for p in native['pages'] if p['physicalPage']==row['bodyPage']),None)
    return printed_test_subject(page['lines'],row['exam'],row['testNumber'],categories) if page else None


def heading_category(headings,exam,subject,categories):
    parts=[p.strip() for line in headings for p in line['text'].split('>')[1:] if p.strip()]
    if not parts or not subject:return None
    result={}
    aliases={normalize(k):v for k,v in RULES.get(subject,{}).items()}
    for part in parts:
        target=aliases.get(normalize(part),part)
        matches=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c.get('exam')==exam
                 and c['subject']==subject and normalize(c['topic'])==normalize(target)]
        category=matches[0] if len(matches)==1 else match_title(part,exam,[subject],categories)
        if category is None:return None
        result[category['id']]=category
    return next(iter(result.values())) if len(result)==1 else None


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return
    path=BASE/'individual-tarama-pending-evidence/chapter-packages.json'
    data=json.loads(path.read_text(encoding='utf8'));decisions=load_decisions()
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    items=[];overlay=[];rules_sha=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    for row in data['items']:
        if skip_pdf(row['sourceSha256'],decisions):continue
        subject=source_subject(row['relativePath'],categories,row['exam'])
        category=heading_category(row['printedSourceHeadings'],row['exam'],subject,categories)
        if not category:continue
        overlay.append({'code':row['code'],'categoryId':category['id'],'headings':row['printedSourceHeadings']})
        items.append({**row,'subject':category['subject'],'subjectId':category['subjectId'],'subjectCandidates':[category['subject']],
            'categoryId':category['id'],'unit':category.get('unit'),'topic':category['topic'],'priorReviewReasons':row.get('reasons',[]),
            'reasons':[],'topicEvidence':{'basis':'EXACT_PRINTED_SINGLE_TOPIC_CONTAINMENT','rulesSha256':rules_sha,
                'sourceHeadings':row['printedSourceHeadings'],'sourceSubjectDirectory':row['relativePath'],'teacherApproved':False}})
    used={r['groupId'] for r in items}
    write_json(target,{'status':'INDIVIDUAL_TARAMA_ADDITIONAL_TOPIC_CANDIDATES_NOT_IMPORTED','items':items,
        'keyGroups':[g for g in data['keyGroups'] if g['groupId'] in used],'candidateBodies':len(items),
        'questionWrites':0,'questionComparisons':0,'teacherApprovalsCreated':0,'sourcePackageSha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    write_json(OUT/'topic-evidence.json',{'rows':overlay,'rulesSha256':rules_sha,'remainingFineTopicCandidates':len(data['items'])-len(items),
        'questionWrites':0,'questionComparisons':0,'studentVisible':False})
    print(json.dumps({'controlledTopicCandidates':len(items),'remainingFineTopicCandidates':len(data['items'])-len(items)}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/individual-tarama-topics.lock'):run()
