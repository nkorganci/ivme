"""Resolve printed single-topic Tarama headings against existing main rows.

Only exact headings and explicit containment rules are used. A mixed chapter
keeps its fine-topic review status; file names never guess an individual topic.
"""
import hashlib
import json
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_konu_ayrintisi import match_title
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

OUT=BASE/'individual-tarama-topic-expansion'
RULES={
 'Biyoloji':{
  'Duyu Organları':'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
  'Nükleik Asitler':'Nükleik Asitlerin Keşfi ve Önemi',
  'Hücresel Yapılar ve Görevleri':'Hücre',
  'Kalıtımla İlgili Kavramlar, Olasılık İlkeleri, Gamet Çeşitlerinin Bulunması':'Kalıtım ve Biyolojik Çeşitlilik',
  'Mendel İlkeleri ve Çaprazlamalar':'Kalıtım ve Biyolojik Çeşitlilik',
  'Eş Baskınlık, Çok Alellilik, Kan Gruplarının Kalıtımı':'Kalıtım ve Biyolojik Çeşitlilik',
 },
 'Matematik':{
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
  **dict.fromkeys(['Su Dalgalarında Kırınım ve Girişim','Işığın Çift Yarıkta Girişimi','Işığın Tek Yarıkta Kırınımı',
                  'Işığın Dalga Doğası ve Doppler Olayı','Elektromanyetik Dalgalar'],'Dalga Mekaniği ve Elektromanyetik Dalgalar'),
  **dict.fromkeys(['Isı ve Sıcaklık Kavramları, Termometreler','Isı Alışverişi','Hâl Değişimi','Isıl Denge',
                  'Enerji İletim Yolları','Genleşme'],'Isı, Sıcaklık ve Genleşme'),
 },
 'Edebiyat':{'Divan Şiiri':'Divan Edebiyatı'},
}


def source_subject(path,categories,exam):
    pieces=path.split('\\')
    labels=[p.split(' (')[0] for p in pieces if p.endswith('(TYT)') or p.endswith('(AYT)') or p.endswith('(TYT-AYT)')]
    candidates={c['subject'] for c in categories if c.get('selectable') and c.get('exam')==exam and c['id'].startswith('excel.')}
    found={s for s in candidates for label in labels if normalize(s)==normalize(label)}
    return next(iter(found)) if len(found)==1 else None


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
