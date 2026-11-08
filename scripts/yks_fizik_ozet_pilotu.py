"""Preserve three actually read raster-summary questions and their printed key.

This bounded source preparation is not new-question, topic or publication
acceptance. Source pixels, the actually viewed whole page and both existing
Tesseract key readings are required. Broken PDF ToUnicode text is not trusted.
"""
import argparse
import hashlib
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from pdf_source_reconcile import text_fingerprint
from yks_pilot_kaynaklari import APP
from yks_istisna_kirpim import original_image,verify_image
from yks_kayitli_anahtar_kesfi import signals
from yks_soru_pilotu import compare
from yks_gorsel_aday import VisualCandidates


SOURCE='04c593815b31de8012fb2412e88f690c48cabdd830727fbf85730e41f1d12c0f'
VIEWED='a6e7e524eb275c4186b14e20c13682762f3aafcd815caebb7e52227013106852'
QUESTIONS=[
    {'number':1,'bbox':[678,55,902,214],'answer':'D',
     'text':"1. Odak uzaklığı 12 cm olan çukur aynaya gönderilen I ışını şekildeki gibi yansıyor.\nBuna göre x uzaklığı kaç cm’dir?\nA) 12\nB) 13\nC) 14\nD) 15\nE) 16"},
    {'number':2,'bbox':[678,214,902,451],'answer':'D',
     'text':'2. Tümsek aynaya gönderilen I ışınının aynadaki yansıması şekildeki gibidir.\nBuna göre;\nI. KL = LP\nII. N noktası aynanın merkezidir.\nIII. Odak noktası P - N arasındadır.\nyargılarından hangileri doğrudur?\nA) Yalnız I\nB) I ve II\nC) I ve III\nD) II ve III\nE) I, II ve III'},
    {'number':3,'bbox':[678,453,902,628],'answer':'E',
     'text':'3. Odak uzaklıkları f₁ ve f₂ olan çukur aynalara gönderilen I ışık ışını şekildeki gibi yansıyor.\nBuna göre, aynalar arası mesafe f₁ ve f₂ cinsinden nedir?\nA) f₁ + f₂\nB) 2f₁ + f₂\nC) f₁ + 3f₂\nD) 2f₁\nE) f₁ + 2f₂'},
]


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--compare-bank',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'physics-summary-discovery';folder.mkdir(exist_ok=True)
    proof_path=root/'saved-key-signal-discovery'/(SOURCE+'.json');proof=read_json(proof_path)['result'];loc=proof['sourceLocation']
    path=Path(loc['root'])/loc['path'];view=folder/'04c593815b31-whole-source.png'
    if digest(path)!=SOURCE or digest(view)!=VIEWED:raise ValueError('Actually viewed original source/page changed')
    expected=[{'number':q['number'],'answer':q['answer']} for q in QUESTIONS];ocr=[]
    for reading in proof['readings']:
        file=Path(reading['savedReadingPath'])
        if digest(file)!=reading['savedReadingSha256']:raise ValueError('Original cached OCR key evidence changed')
        raw=read_json(file)
        if raw['sourceSha256']!=SOURCE or raw['page']!=1:raise ValueError('OCR belongs to another source/page')
        keys=signals(raw['text'])['headings']
        if len(keys)!=1 or keys[0]['unapprovedNumberLetterCandidates']!=expected:raise ValueError('Complete original source key readings disagree')
        ocr.append(reading)
    if {r['readingVersion'] for r in ocr}!={'tur-ocr-300dpi-summary-content-v1','tur-ocr-144dpi-v1'}:raise ValueError('Both saved source OCR resolutions required')
    key={'status':'ACTUALLY_VIEWED_ORIGINAL_PRINTED_KEY_AND_BOTH_CACHED_OCR_LISTS_AGREE',
        'sourceSha256':SOURCE,'sourcePath':str(path),'viewedSourcePageImage':str(view),'viewedSourcePageImageSha256':VIEWED,
        'sourceAnswers':expected,'savedOcrReadings':ocr,'contentReview':'ACTUAL_FULL_ORIGINAL_SOURCE_PAGE_READ_NOT_MODEL_ANSWER_GENERATION',
        'nativeToUnicodeReadingTrusted':False,'teacherApproved':False,'questionBankWrites':0}
    cards=[];pixel_proofs=[];new=0
    with process_lock(folder/'.writer.lock'),pymupdf.open(path) as doc:
        if len(doc)!=1:raise ValueError('Original one-page summary required')
        key_path=folder/'source-key.json';write_json(key_path,key)
        for row in QUESTIONS:
            regions=[{'pdfPage':1,'bboxPt':row['bbox']}];code='mebi-summary-'+SOURCE[:12]+'-q'+str(row['number']);image=folder/(code+'.webp')
            if not image.is_file():
                pixels,_=original_image(doc,regions);pixels.save(image,format='WEBP',lossless=True);new+=1
            pixel=verify_image(doc,regions,image);pixel_proofs.append(pixel)
            if re.findall(r'(?:^|\n)([A-E])\)',row['text'])!=list('ABCDE'):raise ValueError('Actually read five options required')
            cards.append({'code':code,'sourceSha256':SOURCE,'sourcePath':str(path),'printedNumber':row['number'],'pdfPage':1,
                'bboxPt':row['bbox'],'sourceRegions':regions,'exam':'TYT','subjectId':'fizik','answer':row['answer'],
                'image':str(image),'imageSha256':digest(image),'text':row['text'],'textSha256':hashlib.sha256(row['text'].encode()).hexdigest(),
                'textFingerprint':text_fingerprint(row['text']),'keyEvidenceSha256':digest(key_path),'pixelProof':pixel,
                'textReadingMethod':'ACTUAL_ORIGINAL_IMAGE_TRANSCRIPTION_PRESERVE_FIGURES_IN_SOURCE_PIXELS',
                'fineTopicAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
        if digest(path)!=SOURCE:raise ValueError('Original source changed during preparation')
        package=folder/'candidates.json';write_json(package,{'sourceSha256':SOURCE,'sourcePath':str(path),'questionCount':3,'cards':cards,'teacherApproved':False})
        report={'status':'COMPLETE','scope':'ONLY_THREE_ACTUALLY_READ_PHYSICS_SUMMARY_QUESTIONS_NOT_FULL_SOURCE_FAMILY_ACCEPTANCE',
            'sourceSha256':SOURCE,'questions':3,'printedAnswers':expected,'package':str(package),'packageSha256':digest(package),
            'keyEvidencePath':str(key_path),'keyEvidenceSha256':digest(key_path),'pixelProofs':pixel_proofs,
            'newCropsThisPass':new,'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,
            'sourceAnswerGenerationUsed':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))}
        write_json(folder/'report.json',report)
    if args.compare_bank:
        target=folder/'bank-comparison';target.mkdir(exist_ok=True)
        result=compare(cards,target,source_sha=SOURCE,shared_cache_folder=root/'question-cohort',visual_matcher_factory=VisualCandidates)
        write_json(folder/'comparison-report.json',{'status':'PASS','questions':3,'bankSnapshotSha256':result['bankSnapshotSha256'],
            'bankQuestions':result['bankQuestions'],'bankImagesCompared':result['bankImagesCompared'],'bankTextsCompared':result['bankTextsCompared'],
            'packageSha256':digest(package),'comparisonPath':str(target/'bank-comparison.json'),'comparisonSha256':digest(target/'bank-comparison.json'),
            'results':result['candidates'],'newQuestionAdmissionAccepted':False,'questionBankWrites':0,'teacherApproved':False})
    print({k:v for k,v in report.items() if k!='pixelProofs'})


if __name__=='__main__':main()
