"""Reviewed chapter-to-main-table containment, never fuzzy topic similarity.

Only source chapters wholly covered by an existing topic are listed.
Mixed chapters such as permutation/combinations/binomial or atom/radioactivity
remain question-level work; no single leaf is guessed for those chapters.
"""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP, BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

RULES = {
 'Matematik': {
  'Polinomlar ve Çarpanlara Ayırma':'Polinom Kavramı ve Polinomlarda İşlemler/ Polinomların Çarpanlara Ayrılması',
  'Mutlak Değer':'Birinci Dereceden Denklemler ve Eşitsizlikler (denklem çözme, basit eşitsizlik, mutlak değer)',
  'Olasılık':'Olasılık (basit olaylar, koşullu olasılık)',
  'Bölme - Bölünebilme Kuralları':'Bölünebilme Kuralları (bölme-bölünebilme, EBOB-EKOK)',
  'Üslü ve Köklü İfadeler':'Üslü İfadeler ve Denklemler (üslü ve köklü sayılar)',
  'AYT Temel Kavramlar':"Temel Kavramlar (AYT'de sayılar, eşitsizlik, mutlak değer, üslü-köklü, oran-orantı tek başlıkta)",
  'Diziler':'Gerçek Sayı Dizileri (diziler)',
  'Türev':'Anlık Değişim Oranı ve Türev, Türevin Uygulamaları',
  'Anlık Değişim Oranı ve Türev':'Anlık Değişim Oranı ve Türev, Türevin Uygulamaları',
  'Türev Uygulamaları':'Anlık Değişim Oranı ve Türev, Türevin Uygulamaları',
  'Mantık':'Önermeler ve Bileşik Önermeler / Niceleyiciler / Tanım, Aksiyom, Teorem ve İspat Yöntemleri',
  'Veri':'Merkezi Eğilim ve Yayılım Ölçüleri/ Verilerin Grafikle Gösterilmesi (istatistik)',
  'Üstel ve Logaritmik Fonksiyonlar':'Üstel Fonksiyon, Logaritma Fonksiyonu (logaritma)',
  'Sayı, Kesir, Yaş, İşçi Problemleri':'Denklemler ve Eşitsizlikler ile İlgili Uygulamalar = PROBLEMLER (oran-orantı dahil)',
  'Oran ve Orantı':'Denklemler ve Eşitsizlikler ile İlgili Uygulamalar = PROBLEMLER (oran-orantı dahil)',
  'Kümeler':'Kümelerde Temel Kavramlar/ Kümelerde İşlemler',
  'İntegral':'Belirsiz İntegral, Belirli İntegral ve Uygulamaları',
  'Fonksiyon Kavramı ve Özellikleri':'Fonksiyon Kavramı ve Gösterimi/İki Fonksiyonun Bileşkesi ve Bir Fonksiyonun Tersi',
  'Trigonometrik Fonksiyonlar ve Grafikleri':'Yönlü Açılar, Trigonometrik Fonksiyonlar (trigonometri-1)',
 },
 'Geometri': {
  'Üçgende Eşlik ve Benzerlik':'Üçgenlerde Eşlik ve Benzerlik',
  'Üçgenler':'Üçgenlerde Temel Kavramlar',
  'Çokgen ve Dörtgenlerin Özellikleri':'Çokgenler /Dörtgenler ve Özellikleri',
  'Dörtgenler':'Çokgenler /Dörtgenler ve Özellikleri',
  'Katı Cisimler - Prizmalar':'Katı Cisimler',
  'Üçgenin Alanı':'Üçgenin Alanı/ Üçgenin Alanı ile ilgili Uygulamalar',
  'Kare, Deltoid':'Özel Dörtgenler',
  'Eşkenar Dörtgen, Dikdörtgen':'Özel Dörtgenler',
  'Yamuk, Paralelkenar':'Özel Dörtgenler',
  'Dik Üçgen ve Trigonometri':'Dik Üçgen ve Trigonometri (dik üçgende trigonometrik oranlar)',
 },
 'Fizik': {
  'Isı - Sıcaklık':'Isı, Sıcaklık ve Genleşme',
  'Elektrik Devreleri':'Elektrik Akımı ve Devreleri',
  'Vektör':'Vektörler',
  'Dalga Mekaniği / Dalgalarda Kırınım Girişim - Doppler - Elektromanyetik Dalgalar':'Dalga Mekaniği ve Elektromanyetik Dalgalar',
  'Kuvvet':'Hareket ve Kuvvet', 'Hareket':'Hareket ve Kuvvet',
  'Su - Ses - Deprem Dalgaları':'Su, Ses ve Deprem Dalgaları',
  "Newton'ın Hareket Yasaları":'Newton’un Hareket Yasaları',
  'İtme ve Çizgisel Momentum':'İtme ve Momentum',
  'Elektriksel Potansiyel':'Elektrik Alan ve Potansiyel',
  'Elektriksel Kuvvet ve Elektrik Alan':'Elektrik Alan ve Potansiyel',
  'Elektromanyetik İndüklenme':'Elektromanyetik İndüksiyon',
  'Düzlem Ayna':'Yansıma ve Düzlem Ayna',
  'Alternatif Akım - Transformatör':'Alternatif Akım ve Transformatörler',
  'Manyetizma': {'TYT':'Mıknatıslar ve Manyetizma','AYT':'Manyetik Alan ve Manyetik Kuvvet'},
 },
 'Coğrafya': {
  'Göç':'Nüfus ve Göç', 'Nüfus':'Nüfus ve Göç', 'Yerleşme':'Yerleşmeler',
  'Harita Bilimi':'Harita Okuryazarlığı',
  'Basınç, Rüzgâr, Nem, Yağış':'Atmosfer ve İklim Bilgisi',
  'Atmosfer, Hava Durumu ve İklim, Sıcaklık':'Atmosfer ve İklim Bilgisi',
  'İklim Tipleri ve Türkiye’de İklim':'Atmosfer ve İklim Bilgisi',
  'Yer ve Zaman, Koordinat Sistemi':'Coğrafi Koordinat Sistemi',
  'Türkiye’nin Yüzey Şekilleri':'Dünya’nın Yapısı ve Oluşum Süreci',
  'Dünya’nın Tektonik Oluşumu':'Dünya’nın Yapısı ve Oluşum Süreci',
  'İç Kuvvetler':'Dünya’nın Yapısı ve Oluşum Süreci',
  'Dış Kuvvetler':'Dünya’nın Yapısı ve Oluşum Süreci',
  'Üretim - Dağıtım - Tüketim, Doğal Kaynaklar':'Dünyada Doğal Kaynak ve Ekonomi',
  'Dünyada Ekonomi':'Dünyada Doğal Kaynak ve Ekonomi',
  'Çevre Sorunları':'Çevre Sorunları ve Geri Dönüşüm',
  'Biyoçeşitlilik ve Ekosistem':'Ekosistemlerin Özellikleri ve İşleyişi',
  'Türkiye’nin Turizm Potansiyeli, Kültürel Miras':'Türkiye’de Turizm',
  'Türk Kültürü ve Kültür Bölgeleri':'Kültür Bölgeleri ve Türk Kültürü',
  'Türkiye’nin İşlevsel Bölgeleri ve Kalkınma Projeleri':'İşlevsel Bölge ve Kalkınma Projeleri',
  'Konumsal Önem, Türkiye’nin Jeopolitik Konumu':'Jeopolitik Konum ve Ülkeler Arası Etkileşim',
  'Ekonomik Faaliyetler, Şehirleşme, Sanayi, Göç ve Geleceğin Dünyası':'Ekonomi, Şehirleşme ve Göç',
 },
 'Biyoloji': {
  'Denetleyici ve Düzenleyici Sistem - Endokrin Bezler':'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
  'Denetleyici ve Düzenleyici Sistem - Sinir Sistemi':'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
  'Duyu Organları':'Denetleyici ve Düzenleyici Sistem, Duyu Organları',
  'Karbonhidratlar - Lipitler - Proteinler':'Canlıların Yapısında Bulunan Temel Bileşikler',
  'Enzimler - Vitaminler - Hormonlar':'Canlıların Yapısında Bulunan Temel Bileşikler',
  'Nükleik Asitler - ATP':'Canlıların Yapısında Bulunan Temel Bileşikler',
  'Soyağaçları - Genetik Varyasyonlar ve Biyolojik Çeşitlilik':'Kalıtım ve Biyolojik Çeşitlilik',
  'Mendel İlkeleri ve Uygulamaları':'Kalıtım ve Biyolojik Çeşitlilik',
  'Eş Baskınlık - Çok Alellilik - Eşeye Bağlı Kalıtım':'Kalıtım ve Biyolojik Çeşitlilik',
  'Hücrenin Yapısı ve Kısımları':'Hücre',
  'Ekosistemin Canlı ve Cansız Bileşenleri - Canlılardaki Beslenme Şekilleri':'Ekosistem Ekolojisi',
  'Ekosistemde Madde ve Enerji Akışı - Madde Döngüleri':'Ekosistem Ekolojisi',
 },
}


def chapter_key(chapter):
    # Only remove the printed chapter-part index; never split a mixed title.
    return normalize(re.sub(r'\s*[-–]\s*\d+\s*$', '', chapter))


def controlled_match(chapter, exam, subjects, categories):
    choices={}
    for subject in subjects:
        rules={chapter_key(k):v for k,v in RULES.get(subject,{}).items()}
        target=rules.get(chapter_key(chapter))
        if isinstance(target,dict):target=target.get(exam)
        if not target:continue
        for c in categories:
            if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject']==subject and c['topic']==target:
                choices[c['id']]=c
    return next(iter(choices.values())) if len(choices)==1 else None


def run():
    out=BASE/'curated-chapter-expansion';out.mkdir(exist_ok=True)
    if (out/'chapter-packages.json').exists():
        raise ValueError('Prepared chapter package is immutable; resume mebi_pratik2_arsiv_kabul.py instead')
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    pending={r['code'] for r in json.loads((BASE/'teacher-review-export/current/question-candidates.json').read_text(encoding='utf8'))['records']}
    items=[];groups={};chapter_evidence={}
    for path in sorted((BASE/'three-step-all-bodies-v2').glob('*.json')):
        source=json.loads(path.read_text(encoding='utf8'))
        for g in source.get('keyGroups',[]):groups[g['groupId']]=g
        for row in source.get('items',[]):
            if row['code'] not in pending or row.get('categoryId'):continue
            group=groups[row['groupId']]
            category=controlled_match(group['chapter'],row['exam'],row['subjectCandidates'],categories)
            if not category:continue
            evidence={'printedChapter':group['chapter'],'sourceSha256':row['sourceSha256'],
                'sourceGroupId':row['groupId'],'categoryId':category['id'],'canonicalTopic':category['topic'],
                'basis':'REVIEWED_WHOLE_CHAPTER_CONTAINMENT_IN_EXISTING_MAIN_TABLE_TOPIC',
                'teacherApproved':False,'rulesSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
            chapter_evidence[row['groupId']]=evidence
            items.append({**row,'categoryId':category['id'],'subject':category['subject'],'subjectId':category['subjectId'],
                'topic':category['topic'],'unit':category.get('unit'),'topicDecision':'SOURCE_CHAPTER_CONTROLLED_CONTAINMENT',
                'topicEvidence':evidence,'productionImportAllowed':False})
    result={'status':'CURATED_CHAPTER_PACKAGES_READY_NOT_IMPORTED','items':items,
        'keyGroups':[groups[g] for g in chapter_evidence],'chapterEvidence':list(chapter_evidence.values()),
        'candidateBodies':len(items),'keyGroupCount':len(chapter_evidence),
        'byExamSubject':dict(Counter(r['exam']+':'+r['subject'] for r in items)),
        'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(out/'chapter-packages.json',result)
    print(json.dumps({k:v for k,v in result.items() if k not in ('items','keyGroups','chapterEvidence')}))


if __name__=='__main__':
    run()
