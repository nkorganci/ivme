"""Freeze 24 actually viewed retrieved image comparisons; no novelty inference."""
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank


COMPARISON='276e947e35984efd3127d02e4f99d3198d98a6c5de3fbfdd41847afab9baf089'
READINGS={
    1:[
        ('dd-tyt-fizik-95-26','Çukur+tümsek iki ayna ve odak oranı soruluyor; kaynak tek çukur aynada 12 cm odak/9 cm/x uzaklığıdır.'),
        ('sb-22035','Birim kareli tümsek+düzlem ayna ve beş farklı ışın şekli; kaynak tek çukur aynada sayısal x uzaklığıdır.'),
        ('sb-5064','ABCD karesinin alanını soran geometri şekli; sayı seçenekleri benzer olsa da ayna sorusu değildir.'),
        ('sb-1098','Tek çukur aynanın merkez konumu L-M/M/M-N/N/N-P ile soruluyor; kaynakta 12 cm odak, 9 cm ve x vardır.'),
        ('mt-tyt-fizik-09-20','Çukur+düzlem iki aynada eşit d aralıkları ve odak uzunluğu; kaynakta tek çukur ayna vardır.'),
        ('sb-1021','4 saniyede 12 dalga ve 5 cm tepe aralığıyla dalga hızı sorusu; sayısal seçenek kalıbı eşleşmiş, gövde farklıdır.'),
        ('3d-tyt-11-06','Kesirli çarpım sonucu soruluyor; kaynak ayna şekli ve beş sayı seçeneği farklıdır.'),
        ('3a-tyt-fizik-61-05','Düzlem+çukur aynada iki ışın ve x/f oranı; kaynak tek çukur aynada x cm değeridir.'),
    ],
    2:[
        ('3a-tyt-fizik-62-05','Tümsek aynada nesne/görüntü ve dört yargı var; kaynakta KL=LP, N merkez, odak P-N arasında biçiminde üç farklı yargı vardır.'),
        ('sb-26105','Ag/Mn/Al yarı pil potansiyelleri; aynı Roma rakamı/seçenek kalıbı dışında ayna sorusuyla ortak gövde yok.'),
        ('sb-26118','F/Cl periyodik özellikleri; Roma rakamı/seçenek kalıbı ortak, kaynak kökü ve şekli farklı.'),
        ('sb-26470','Organik bileşiklerin özellikleri; Roma rakamı/seçenek kalıbı ortak, kaynak ayna gövdesi yok.'),
        ('sb-26551','Organik molekül/hibridleşme ve bağ sayıları; kaynak ayna şekli/kökü ile aynı değil.'),
        ('sb-26526','Karbon nanotüplerin özellikleri; kaynak KLPN ayna yargılarıyla aynı değil.'),
        ('sb-26127','Mg/Ag elektrokimyasal pil ve üç yargı; kaynak ayna çizimi/kökü farklı.'),
        ('sb-25830','Yanıcı madde uyarı işareti ve üç güvenlik yargısı; kaynak ayna çizimi/kökü farklı.'),
        ('3a-ayt-matematik-43-06','ABC üçgeninde sinüs sorusu; görsel hash mesafesi eşit soru kanıtı değildir.'),
    ],
    3:[
        ('sb-22029','İki çukur aynada ışın her iki yüzeye dik gelip kendi yolundan dönüyor; kaynakta bir paralel ışın ve farklı yansıma yolu var. Şekil ve beş odak ifadesi farklıdır.'),
        ('sb-1102','Düzlem aynada 30 derece yansımadan gelme açısı soruluyor; kaynak iki çukur ayna arası mesafedir.'),
        ('dd-tyt-fizik-95-06','Çukur+düzlem ayna ve X/Y/Z ışınlarının geri dönmesi; kaynak iki çukur ayna arası mesafedir.'),
        ('3a-tyt-fizik-65-09','İnce/kalın kenarlı iki mercek ve üç yargı; kaynak iki çukur ayna çizimi/kökü farklı.'),
        ('mt-tyt-fizik-09-19','Üç ayrı çukur aynada f1/f2/f3 sıralaması; kaynak aynı sistemde iki ayna arası mesafedir.'),
        ('3a-tyt-fizik-62-07','Tümsek+çukur+düzlem ayna ve odak oranı; kaynakta iki çukur ayna vardır, şekil ve seçenekler farklı.'),
        ('sb-1098','Tek çukur aynanın merkez konumu soruluyor; kaynak iki çukur ayna arası mesafedir.'),
    ],
}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'physics-summary-discovery'
    compare_path=folder/'comparison-report.json';package_path=folder/'candidates.json';comparison=read_json(compare_path);package=read_json(package_path)
    if digest(compare_path)!=COMPARISON or digest(package_path)!=comparison['packageSha256']:raise ValueError('Actually read comparison/source package changed')
    bank,_=live_bank(APP);bank_sha=signature(bank)
    if bank_sha!=comparison['bankSnapshotSha256']:raise ValueError('Current canonical bank changed')
    bank_by_code={q['code']:q for q in bank};cards={c['code']:c for c in package['cards']}
    fingerprint_path=APP/'veri/pdf-source-registry/bank-image-fingerprints.json';fingerprints={r['code']:r for r in read_json(fingerprint_path)['images']}
    results=[]
    for row in comparison['results']:
        source=cards[row['sourceCode']];number=source['printedNumber'];actual=READINGS[number]
        retrieved={m['code'] for field in ['textMatches','visualMatches'] for m in row[field]}
        if {code for code,reason in actual}!=retrieved:raise ValueError('Every retrieved candidate image must have its actual reading')
        if digest(source['image'])!=source['imageSha256']:raise ValueError('Actually viewed source crop changed')
        for code,reason in actual:
            old=bank_by_code[code];fp=fingerprints[code];image=APP/'veri/resimler-pilot'/old['image']
            if fp.get('error') or old['stamp']!=fp['stamp'].partition(':')[0] or digest(image)!=fp['fileSha256']:raise ValueError('Actually viewed canonical image/version differs from original comparison snapshot')
            results.append({'sourceRelationId':source['code']+'::'+code,'sourceCode':source['code'],'sourceSha256':source['sourceSha256'],'canonicalCandidateCode':code,
                'status':'ACTUAL_RETRIEVED_IMAGE_HAS_DIFFERENT_QUESTION_BODY_OR_FIGURE_NO_IDENTITY_LINK',
                'sourceImagePath':source['image'],'sourceImageSha256':source['imageSha256'],'sourcePrintedAnswer':source['answer'],
                'viewedBankImagePath':str(image),'viewedBankImageSha256':fp['fileSha256'],'canonicalVersion':old['stamp'],
                'canonicalAnswerPreserved':old['correct_answer'],'actualSourceAndCandidateImagesRead':True,'sourceReading':reason,
                'sameQuestionAccepted':False,'noveltyAccepted':False,'newQuestionAdmissionAccepted':False,'fineTopicAccepted':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=bank_sha:raise ValueError('Current canonical bank changed during actual review')
    write_json(folder/'actual-bank-image-review.json',{'status':'PASS','scope':'ONLY_24_RETRIEVED_SOURCE_CANDIDATE_IMAGE_RELATIONS_NOT_WHOLE_BANK_MANUAL_OR_NOVELTY_ACCEPTANCE',
        'sourceQuestions':3,'sourceCandidateRelationsActuallyRead':len(results),'distinctCanonicalImagesActuallyRead':len({r['canonicalCandidateCode'] for r in results}),
        'bankSnapshotSha256':bank_sha,'comparisonSha256':COMPARISON,'sourcePackageSha256':digest(package_path),'bankFingerprintEvidenceSha256':digest(fingerprint_path),
        'externalEvidenceFiles':{r['viewedBankImagePath']:r['viewedBankImageSha256'] for r in results},
        'results':results,'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'newQuestionAdmissionAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))})
    print({'status':'PASS','sourceQuestions':3,'actualCandidateRelations':len(results),'newQuestionAdmissionAccepted':False})


if __name__=='__main__':main()
