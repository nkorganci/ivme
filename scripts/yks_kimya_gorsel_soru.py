"""Prepare only new individually identical questions with native/Qwen printed keys.

The original 150 OCR-backed questions and all changed questions are untouched.
Preparation is not question, category, answer-correction or full-test acceptance.
"""
from collections import Counter
import argparse
import hashlib
from pathlib import Path

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_soru_pilotu import APP
from yks_anahtar_gorsel import checked_reading
from yks_ayri_anahtar import key_section,normalized_body
from yks_pilot_kirpim_kontrol import check_pixels
from pdf_source_reconcile import text_fingerprint


def bound_answer(question,key):
    if question['status']!='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL':return None
    if key['status']!='CURRENT_OFFICIAL_NATIVE_AND_INDEPENDENT_QWEN_SECTION_KEY_AGREE':return None
    if key['nativePrintedAnswers']!=key['independentPrintedAnswers']:raise ValueError('Native/visual source key disagreement')
    pixels=question['pixels']
    if [p['dpi'] for p in pixels]!=[180,330] or any(not p['equal'] or p['sourceRgbSha256']!=p['bookRgbSha256'] for p in pixels):
        raise ValueError('Complete two-DPI individual question equality required')
    rows=[r for r in key['nativePrintedAnswers'] if r['number']==question['printedNumber']]
    if len(rows)!=1:raise ValueError('One exact printed source answer entry required')
    return rows[0]['answer']


def validate_key(key):
    if digest(key['cropPath'])!=key['cropSha256'] or digest(key['evidencePath'])!=key['evidenceSha256']:
        raise ValueError('Original key image or independent raw reading changed')
    raw=read_json(key['evidencePath'])
    if (raw['identity']['cropSha256']!=key['cropSha256'] or raw['identity']['modelDigest']!=key['modelDigest']
            or checked_reading(raw['response'])!=key['nativePrintedAnswers']):raise ValueError('Original independent printed key proof differs')
    if digest(key['sourceKeyPath'])!=key['sourceKeyDocumentSha256']:raise ValueError('Original official key book changed')
    with pymupdf.open(key['sourceKeyPath']) as doc:
        actual=key_section(doc[key['physicalKeyPage']-1],key['exam'],key['testNumber'])
    if not actual or actual['answers']!=key['nativePrintedAnswers'] or actual['bboxPt']!=key['sourceKeyBboxPt']:
        raise ValueError('Current actual official printed section identity or complete answers differ')


def validate_prepared_source(row):
    if row['status']!='PREPARED' or row['fullTestAccepted'] is not False:raise ValueError('Only individual prepared source questions may be verified')
    key=row['keyReading'];validate_key(key);package=read_json(row['package'])
    if digest(row['package'])!=row['packageSha256'] or digest(package['sourcePath'])!=row['sourceSha256']:
        raise ValueError('Current original source or prepared package differs')
    for card in package['cards']:
        if card['sourceSha256']!=row['sourceSha256'] or bound_answer(card['individualEditionProof'],key)!=card['answer']:
            raise ValueError('A changed question inherited an unbound key')
        if digest(card['image'])!=card['imageSha256'] or digest(card['pixelProof']['path'])!=card['pixelProof']['sha256']:
            raise ValueError('Current question image/pixel proof differs')
        proof=read_json(card['pixelProof']['path'])['pixelProof']
        if proof['sourcePixelSha256']!=proof['preparedPixelSha256']:raise ValueError('Original/prepared question pixels differ')
    return len(package['cards'])


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--verify-only',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    if args.verify_only:
        source=root/'partial-chemistry-visual-preparation/progress.json';report=read_json(source)
        if report['status']!='COMPLETE':raise ValueError('Complete question preparation required')
        questions=sum(validate_prepared_source(r) for r in report['results'] if r['status']=='PREPARED')
        if questions!=report['questionsPrepared']:raise ValueError('Current question count differs')
        output={'status':'PASS','sourcePreparationSha256':digest(source),'questions':questions,
            'documents':sum(r['status']=='PREPARED' for r in report['results']),'validatorSha256':digest(Path(__file__)),
            'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'teacherApproved':False}
        write_json(source.parent/'current-source-verification.json',output);print(output);return
    source=root/'partial-chemistry-visual-keys/progress.json';keys=read_json(source);key_sha=digest(source)
    body_path=root/'pdf-on-tarama/chemistry-question-editions/report.json';body=read_json(body_path)
    if keys['status']!='COMPLETE' or keys['individualBodyProofSha256']!=digest(body_path):raise ValueError('Finish all independent source key observations first')
    prior=read_json(root/'partial-chemistry-preparation/progress.json');already={r['sourceSha256'] for r in prior['results'] if r['status']=='PREPARED'}
    bodies={r['sourceSha256']:r for r in body['results']};folder=root/'partial-chemistry-visual-preparation';folder.mkdir(exist_ok=True);results=[]
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'ONLY_ADDITIONAL_INDIVIDUAL_NATIVE_AND_TWO_DPI_IDENTICAL_QUESTIONS_WITH_NATIVE_QWEN_KEYS',
            'sourceVisualKeyReportSha256':key_sha,'sourceBodyProofSha256':digest(body_path),'documents':len(keys['results']),
            'completed':len(results),'pending':len(keys['results'])-len(results),'questionsPrepared':sum(r['questions'] for r in results),
            'states':dict(Counter(r['status'] for r in results)),'results':results,'toolSha256':digest(Path(__file__)),
            'newModelCalls':0,'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False})
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for key in keys['results']:
                sha=key['sourceSha256'];original=bodies[sha];cards=[]
                if sha in already:raise ValueError('This source was already prepared by the native/OCR cohort; do not duplicate it')
                if key['status']=='CURRENT_OFFICIAL_NATIVE_AND_INDEPENDENT_QWEN_SECTION_KEY_AGREE':
                    validate_key(key)
                    if digest(original['sourcePath'])!=sha:raise ValueError('Original individual source PDF changed')
                    out=folder/sha[:16];out.mkdir(exist_ok=True)
                    with pymupdf.open(original['sourcePath']) as doc:
                        for question in original['questions']:
                            answer=bound_answer(question,key)
                            if answer is None:continue
                            page=doc[question['sourcePage']-1];box=question['sourceRegionPt'];text=page.get_text(clip=pymupdf.Rect(box)).strip()
                            if hashlib.sha256(normalized_body(text).encode()).hexdigest()!=question['nativeBodySha256']:
                                raise ValueError('Current original question body differs from the proved individual source version')
                            image=out/(question['sourceCode']+'.webp');stamp=out/(question['sourceCode']+'.crop.json')
                            identity=signature([sha,question['sourcePage'],box,180,pymupdf.VersionBind,'individual-chemistry-visual-key-lossless-v1'])
                            cached=read_json(stamp) if stamp.is_file() else {}
                            if cached.get('identity')!=identity or not image.is_file() or digest(image)!=cached.get('imageSha256'):
                                pix=page.get_pixmap(dpi=180,clip=pymupdf.Rect(box),alpha=False)
                                if hashlib.sha256(pix.samples).hexdigest()!=question['pixels'][0]['sourceRgbSha256']:
                                    raise ValueError('Current original question pixels differ from the existing equality proof')
                                Image.frombytes('RGB',(pix.width,pix.height),pix.samples).save(image,format='WEBP',lossless=True,method=0)
                                proof=check_pixels(page,{'image':str(image),'bboxPt':box})
                                write_json(stamp,{'identity':identity,'imageSha256':digest(image),'pixelProof':proof})
                            cards.append({'code':question['sourceCode'],'sourceSha256':sha,'sourcePath':original['sourcePath'],
                                'exam':original['exam'],'printedExamScopes':[original['exam']],'subjectId':'kimya','subject':'Kimya',
                                'printedNumber':question['printedNumber'],'pdfPage':question['sourcePage'],'bboxPt':box,
                                'sourceRegions':[{'pdfPage':question['sourcePage'],'bboxPt':box,'role':'INDIVIDUALLY_IDENTICAL_ORIGINAL_QUESTION'}],
                                'image':str(image),'imageSha256':digest(image),'pixelProof':{'path':str(stamp),'sha256':digest(stamp)},
                                'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'textFingerprint':text_fingerprint(text),
                                'answer':answer,'sourceKeyPath':key['sourceKeyPath'],'sourceKeyDocumentSha256':key['sourceKeyDocumentSha256'],
                                'sourceKeyPage':key['physicalKeyPage'],'keyEvidenceSha256':key['evidenceSha256'],
                                'answerOrigin':'INDIVIDUALLY_IDENTICAL_QUESTION_FROM_OFFICIAL_PRINTED_SECTION_KEY',
                                'answerReadingMethods':'NATIVE_PLUS_INDEPENDENT_QWEN_KEY_CROP','individualEditionProof':question,
                                'containsGraphics':True,'reviewConcerns':['CONTENT_GRAPHICS_FINE_TOPIC_AND_DUPLICATE_REVIEW_REQUIRED'],
                                'importDecision':'NOT_ACCEPTED_FOR_IMPORT','teacherApproved':False})
                    package=out/'candidates.json';write_json(package,{'sourceSha256':sha,'sourcePath':original['sourcePath'],'cards':cards,'teacherApproved':False})
                else:package=None
                results.append({'sourceSha256':sha,'status':'PREPARED' if cards else 'KEY_OR_BODY_REVIEW_REQUIRED','questions':len(cards),
                    'package':str(package) if package else None,'packageSha256':digest(package) if package else None,
                    'keyReading':key,'fullTestAccepted':False,'teacherApproved':False})
                save('RUNNING')
            if digest(source)!=key_sha:raise ValueError('Source key observations changed during partial question preparation')
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
