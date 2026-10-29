"""Build source-reading decisions separately from raw Ollama proposals.

These are automated content-maintenance decisions, not attributed teacher reviews.
New-question decisions still require the complete duplicate comparison gate.
"""
import hashlib
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,write_json

MATCHES={
    3:('yk-turk-dili-ve-edebiyati-tyt-test-01-01-04','TYPOGRAPHIC_VARIANT'),
    4:('3a-tyt-turkce-94-02','PARAPHRASE'),5:('3a-tyt-turkce-65-05','OPTION_PRESENTATION'),
    10:('yk-turk-dili-ve-edebiyati-ayt-test-15-01-04','PARAPHRASE'),11:('3a-ayt-turk-dili-ve-edebiyati-28-04','PARAPHRASE'),
    12:('3a-ayt-turk-dili-ve-edebiyati-62-06','PARAPHRASE'),13:('yk-turk-dili-ve-edebiyati-ayt-test-07-01-04','DISTRACTOR_VARIANT'),
    16:('sb-22663','TYPOGRAPHIC_VARIANT'),18:('sb-7979','TYPOGRAPHIC_VARIANT'),20:('3a-ayt-tarih-63-10','SAME_DIAGRAM_AND_OPTIONS'),
    22:('sb-27906','EXACT_TEXT'),23:('sb-11088','EXACT_TEXT'),24:('sb-21692','EXACT_TEXT'),
    27:('sb-2116','DISTRACTOR_VARIANT'),28:('sb-2391','EXACT_TEXT'),29:('sb-2420','PARAPHRASE'),
    31:('cd-2021-mini-deneme-3-01-40','SAME_DIAGRAM_AND_OPTIONS'),46:('3a-tyt-fizik-11-03','SAME_DIAGRAM_AND_OPTIONS'),
    48:('yk-fizik-test-09-01-12','DISTRACTOR_VARIANT'),50:('3a-ayt-fizik-66-05','PARAPHRASE'),
    51:('sb-22365','PARAPHRASE'),53:('sb-6875','SAME_DIAGRAM_AND_OPTIONS'),54:('3a-ayt-kimya-64-05','DISTRACTOR_VARIANT'),55:('sb-20824','SAME_DIAGRAM_AND_OPTIONS'),
    57:('3a-tyt-biyoloji-60-09','OPTION_PERMUTATION'),58:('3a-tyt-biyoloji-46-06','OPTION_PERMUTATION'),59:('sb-3648','EXACT_TEXT')}

# Topics are chosen from the first-sheet controlled registry, based on the task
# asked in the question. Mixed YKS material may legitimately use both exam scopes.
OVERRIDES={
    1:('TYT','turkce',['Sözcükte Anlam']),2:('TYT','turkce',['Sözcükte Anlam']),8:('TYT','turkce',['Sözcükte Anlam']),
    10:('AYT','edebiyat',['Halk Edebiyatı','Divan Edebiyatı']),11:('AYT','edebiyat',['Halk Edebiyatı']),
    13:('AYT','edebiyat',['Cumhuriyet Dönemi Türk Edebiyatı']),
    16:('AYT','tarih',['İlk Çağ’da Başlıca Medeniyet Havzaları']),
    17:('AYT','tarih',['Anadolu’da Türk Siyasi Birliğini Sağlama Çabaları']),
    19:('AYT','tarih',['I. Dünya Savaşı’nın Sonuçları']),20:('AYT','tarih',['Toplumsal Alandaki İnkılaplar','Hukuk Alanındaki Gelişmeler']),
    26:('TYT','felsefe',['İlk Neden (Arkhe) ve Değişim Problemi']),
    28:('TYT','felsefe',['Bilginin Kaynağı ile İlgili Görüşler']),30:('TYT','felsefe',['20. Yüzyıl Filozoflarının Görüşleri']),
    31:('TYT','matematik',['Birinci Dereceden Denklemler ve Eşitsizlikler (denklem çözme, basit eşitsizlik, mutlak değer)']),
    32:('TYT','matematik',['Denklemler ve Eşitsizlikler ile İlgili Uygulamalar = PROBLEMLER (oran-orantı dahil)']),
    34:('AYT','matematik',['Binom']),36:('TYT','matematik',['Üslü İfadeler ve Denklemler (üslü ve köklü sayılar)']),
    40:('TYT','matematik',['Sıralama ve Seçme – Permütasyon, Kombinasyon']),
    42:('AYT','geometri',['Çember ve Daire']),44:('TYT','geometri',['Özel Dörtgenler']),
    45:('AYT','geometri',['Doğrunun Analitik İncelenmesi']),49:('TYT','fizik',['Enerji']),
    52:('TYT','kimya',['Yaygın Günlük Hayat Kimyasalları'])}


def main():
    source=APP/'veri/content-labels/pdf-extraction/mini-test-04/candidates.json'
    package=json.loads(source.read_text(encoding='utf-8'))
    labels={r['code']:r for r in json.loads((OUT/'mini-test-04-label-proposals.json').read_text(encoding='utf-8'))['labels']}
    categories=json.loads(query(db_connection('ivme'),"SELECT json_agg(definition) FROM learning_catalog.current_categories"))
    items=[]
    for card in package['cards']:
        number=card['printedNumber'];proposal=labels[card['code']]
        selected=[]
        if number==51:
            selected=[next(c for c in categories if c['id']=='tyt.kimya.doga-ve-kimya')]
            exam,subject='TYT','kimya'
        elif number in OVERRIDES:
            exam,subject,topics=OVERRIDES[number]
            for topic in topics:
                matches=[c for c in categories if c['exam']==exam and c['subjectId']==subject and c.get('topic')==topic and c.get('canonicalUnit')]
                if len(matches)!=1:raise ValueError(f'Controlled topic ambiguity: {number}/{topic}')
                selected.append(matches[0])
        else:
            selected=[next(c for c in categories if c['id']==proposal['categoryId'])]
            exam,subject=selected[0]['exam'],selected[0]['subjectId']
        canonical,kind=MATCHES.get(number,(None,'NEW_SOURCE_QUESTION'))
        items.append({'sourceCode':card['code'],'decision':'MATCH' if canonical else 'NEW','canonicalCode':canonical,
            'matchType':kind,'exam':exam,'subject':selected[0]['subject'],'subjectId':subject,
            'categoryIds':[c['id'] for c in selected],'topic':selected[0]['topic'],
            'imageSha256':card['imageSha256'],'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
            'scopeReview':'SOURCE_TASK_AND_CONTROLLED_TOPIC','teacherApproved':False,
            'answerPermutation':{'C':'D','D':'C'} if number==58 else {},
            'reason':'Kaynak kökü, seçenekler ve gerektiğinde şekil karşılaştırıldı; varyant bilgisi korunur.' if canonical
                     else 'Kaynak soru, basılı anahtarın iki okuması ve kontrollü konu kapsamı incelendi; tekrar denetimi son kabulde zorunludur.'})
    value={'sourceSha256':package['sourceSha256'],'packageSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
           'sourcePackage':source.relative_to(APP).as_posix(),'teacherApproved':False,
           'reviewMethod':'SOURCE_CONTENT_AND_CONTROLLED_SCOPE','items':items}
    write_json(OUT/'mini-test-04-content-review.json',value)
    print(json.dumps({'reviewed':len(items),'existingQuestionMatches':len(MATCHES),'newCandidates':len(items)-len(MATCHES),
                      'correctedModelScopes':len(OVERRIDES)}),flush=True)


if __name__=='__main__':main()
