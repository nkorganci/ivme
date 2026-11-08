"""Record five actual Din image readings and amend one contaminated crop.

Original packages/model results stay immutable. Only the amended versions may
enter subsequent comparison; original topic reading for Q24 is invalidated.
"""
from collections import Counter
import hashlib
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_soru_pilotu import APP
from yks_konu_girdileri import load_bound_cards
from yks_istisna_kirpim import original_image,verify_image
from yks_deneme_govde import FLAGS
from yks_soru_yenilik_kontrol import parts
from pdf_source_reconcile import text_fingerprint

VIEWED={
 'mebi-b5113a1d1f9c-q1':('61ed6910a01c086fcda58fb9b97b8d2f5b47e5349556ee145f716e709b747849','C','ACTUAL_TABLE_ROWS_READ_NATIVE_COLUMN_ORDER_RECONSTRUCTED'),
 'mebi-d7ad84157bdb-q15':('d0f5341d7123e4464c7a68eac8e33fcd5ba37edd5e56319d4a61793c0f0e4f7f','C','ACTUAL_TABLE_LABELS_A_TO_D_DISTINGUISHED_FROM_ANSWER_OPTIONS'),
 'mebi-mock-fd0fdf7c0577-s2-q19':('a020834ca61fcf5a66854a64d92d89c0893fc16a8e53874cbb2d75944c9f7460','D','PRINTED_IDENTICAL_D_AND_E_OPTIONS_EXCLUDE_NEW_INTAKE'),
 'mebi-din-book-0d71ed945447-t7-q8':('9a82377355dddb2f2d88bf4c0d97c12ed83448b7b5de10fb4638f54d4e194678','C','ACTUAL_SAME_TABLE_QUESTION_AS_DIAGNOSTIC_15_KEEP_SINGLE_IDENTITY'),
 'mebi-din-book-3294337d6b62-t1-q24':('b826011dc54d6e6e3a647a848058405f51ff090584ac447e548b624521fceebe','E','OLD_CROP_CONTAINS_UNRELATED_QUESTION_26_REPLACED_BY_LEFT_BODY_ONLY'),
}
TABLE=('1. Aşağıdakilerden hangisinde maddi, manevi ve hem maddi hem manevi değerlere doğru örnekler verilmiştir?\n'
 'Sütunlar: Maddi Değer | Manevi Değer | Maddi ve Manevi Değer\n'
 'A) Örf-Âdet | İnanç | Selimiye Camii\nB) Gelenekler | Giysiler | El sanatları\n'
 'C) Giysiler | İnanç | Selimiye Camii\nD) Tarihî çeşmeler | Gelenekler | Giysiler\n'
 'E) Örf-Âdet | Selimiye Camii | Tarihî çeşmeler')


def distinguish_table_labels(text):
    prefix,separator,suffix=text.partition('Buna göre doğru eşleştirme')
    if not separator:raise ValueError('Actually read table question boundary changed')
    # A-D are names in the source table. Preserve them as table labels rather
    # than silently dropping their content or treating them as answer options.
    prefix=re.sub(r'(?m)^(\s*[A-D])\)',r'\1:',prefix)
    return prefix+separator+suffix


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);topic=root/'full-question-topics/din'
    retrieval=read_json(topic/'topic-candidates.json');cards=load_bound_cards(retrieval)
    secondary_path=topic/'secondary-bank-comparison.json';secondary=read_json(secondary_path)
    if {r['sourceCode'] for r in secondary['deferredSourceQuestions']}!=set(VIEWED):raise ValueError('Actual exception image scope changed')
    folder=root/'din-question-amendments';folder.mkdir(exist_ok=True);results=[];amended=[]
    with process_lock(folder/'.writer.lock'):
        for code,(image_sha,answer,status) in VIEWED.items():
            original=cards[code]
            if original['imageSha256']!=image_sha or digest(original['image'])!=image_sha or original['answer']!=answer:
                raise ValueError('Actually read original source image/key changed')
            card=dict(original);observation=status
            if code.endswith('-t1-q24'):
                regions=[r for r in original['sourceRegions'] if r['role']=='ORIGINAL_QUESTION_BODY']
                if len(regions)!=1 or regions[0]['pdfPage']!=19:raise ValueError('Actually read Q24 body region changed')
                if digest(original['sourcePath'])!=original['sourceSha256']:raise ValueError('Actual book PDF changed')
                image=folder/(code+'.webp');proof_path=folder/(code+'.pixels.json')
                with pymupdf.open(original['sourcePath']) as doc:
                    pixels,_=original_image(doc,regions);pixels.save(image,format='WEBP',lossless=True,method=0)
                    proof=verify_image(doc,regions,image)
                    text=doc[18].get_text(clip=pymupdf.Rect(regions[0]['bboxPt']),flags=FLAGS).strip()
                if '26.' in text or Counter(re.findall(r'(?:^|\s)([A-E])\s*\)',text))!=Counter('ABCDE'):
                    raise ValueError('Corrected Q24 must contain exactly one full question and all five options')
                write_json(proof_path,proof)
                card.update(sourceRegions=regions,image=str(image),imageSha256=digest(image),text=text,
                    pixelProof={'path':str(proof_path),'sha256':digest(proof_path)},optionCounts=dict(Counter('ABCDE')))
                observation='Eski kırpımın sağ devamı aslında tam 26. sorudur; 24 sol sütunda E seçeneğiyle bitiyor. Yeni bölge yalnız sol gövde, kaynak E anahtarı aynen korunur.'
            elif code=='mebi-b5113a1d1f9c-q1':
                card['text']=TABLE;observation='Gerçek beş tablo satırı ve üç sütun okundu. C satırı Giysiler / İnanç / Selimiye Camii; bütün yanlış seçenek hücreleri de korunur.'
            elif code=='mebi-mock-fd0fdf7c0577-s2-q19':
                observation='Kaynağın kendisinde D ve E aynı I ve III seçeneğini basıyor. Basılı anahtar D olsa da iki aynı seçenek sessizce düzeltilmez; soru yeni alım dışında.'
            else:
                card['text']=distinguish_table_labels(original['text'])
                observation='Tablo A-D âlim etiketleri cevap seçeneği değildir; gerçek A-E seçenekleri Buna göre kökünden sonradır. İki nüshada tüm tablo, seçenekler ve C anahtarı aynıdır.'
            row={'sourceCode':code,'sourceSha256':original['sourceSha256'],'status':status,'oldSourceImagePath':original['image'],
                'oldSourceImageSha256':image_sha,'oldSourceTextSha256':original['textSha256'],
                'sourceReading':observation,'actualOriginalImageRead':True,'sourcePrintedAnswer':answer,
                'newQuestionAdmissionAccepted':False,'teacherApproved':False}
            if code!='mebi-mock-fd0fdf7c0577-s2-q19':
                if not parts(card['text'])[1]:raise ValueError('Actual amended question must retain five distinct option contents')
                card.update(textSha256=hashlib.sha256(card['text'].encode()).hexdigest(),textFingerprint=text_fingerprint(card['text']),
                    originalNativeText=original['text'],originalSourceImageSha256=image_sha,
                    comparisonTextProvenance='ACTUAL_SOURCE_TABLE_READING' if card['imageSha256']==image_sha else 'CORRECTED_ORIGINAL_PDF_REGION_NATIVE_TEXT',
                    importDecision='NOT_ACCEPTED_FOR_IMPORT',teacherApproved=False)
                amended.append(card);row.update(amendedImagePath=card['image'],amendedImageSha256=card['imageSha256'],
                    amendedTextSha256=card['textSha256'],sourceTopicReadingInvalidated=code.endswith('-t1-q24'))
            results.append(row)
        package=folder/'candidates.json';write_json(package,{'status':'AMENDED_SOURCE_REVIEW_NOT_ADMISSION','cards':amended,'teacherApproved':False})
        preparations=[]
        for card in amended:
            sub=folder/card['code'];sub.mkdir(exist_ok=True);path=sub/'candidates.json'
            write_json(path,{'sourceSha256':card['sourceSha256'],'cards':[card],'teacherApproved':False})
            preparations.append({'sourceSha256':card['sourceSha256'],'status':'PREPARED','questions':1,
                'package':str(path),'packageSha256':digest(path)})
        write_json(folder/'progress.json',{'status':'COMPLETE','results':preparations,'questionsPrepared':4,
            'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False})
        output={'status':'PASS','scope':'FIVE_ACTUAL_SOURCE_EXCEPTION_READINGS_AND_FOUR_EXPLICIT_AMENDED_VERSIONS',
            'sourceComparisonSha256':digest(secondary_path),'bankSnapshotSha256':secondary['bankSnapshotSha256'],
            'questionsRead':5,'amendedQuestions':len(amended),'excludedAmbiguousPrintedQuestions':1,
            'sourcePackages':{p:s for p,s in retrieval['questionPackages'].items() if any(code in [c['code'] for c in read_json(p)['cards']] for code in VIEWED)},
            'amendedPackage':str(package),'amendedPackageSha256':digest(package),
            'additionalActuallyReadDuplicateGroups':[{'members':['mebi-d7ad84157bdb-q15','mebi-din-book-0d71ed945447-t7-q8'],
                'maximumCanonicalQuestions':1,'printedAnswer':'C','newQuestionAdmissionAccepted':False}],
            'results':results,'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'teacherApproved':False}
        write_json(folder/'report.json',output)
    print({k:v for k,v in output.items() if k not in ['results','sourcePackages']})


if __name__=='__main__':main()
