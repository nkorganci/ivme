"""Read official keys for individually identical chemistry source questions.

Native key and independent rendered Turkish OCR must agree for the entire
section. Only the explicitly identical questions receive a bound answer;
changed questions in that same test never inherit any letter.
"""
from collections import Counter
from contextlib import ExitStack
import hashlib
from pathlib import Path

import pymupdf
from PIL import Image
import io
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_ayri_anahtar import key_section
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_pilot_kirpim_kontrol import check_pixels
from pdf_ocr_cache import model_hash
from pdf_source_reconcile import text_fingerprint


def answer_for_question(question,key):
    if question['status']!='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL':return None
    if [p['dpi'] for p in question['pixels']]!=[180,330] or any(p['sourceRgbSha256']!=p['bookRgbSha256'] for p in question['pixels']):
        raise ValueError('Individual question pixel proof is incomplete')
    if key['status']!='NATIVE_AND_INDEPENDENT_RENDERED_SECTION_KEY_AGREE':return None
    if key['nativeAnswers']!=key['independentAnswers']:raise ValueError('Printed source key readings disagree')
    rows=[a for a in key['nativeAnswers'] if a['number']==question['printedNumber']]
    if len(rows)!=1:raise ValueError('Exact printed source question key entry missing')
    return rows[0]['answer']


def validate_prepared_source(row):
    if row['status']!='PREPARED' or row['fullTestAccepted'] is not False:raise ValueError('Only explicitly partial prepared sources are supported')
    key=row['keyReading'];raw=Path(key['rawEvidencePath']);image=Path(key['cropPath']);source_sha=row['sourceSha256']
    if digest(raw)!=key['rawEvidenceSha256'] or digest(image)!=key['cropSha256']:raise ValueError('Independent printed key crop/raw evidence changed')
    reading=read_json(raw)
    if reading['identity']!=key['identity'] or read_pairs(reading['ocrText'],OCR_PAIR)!=key['nativeAnswers']:
        raise ValueError('Independent printed key observations disagree')
    if key['identity']['ocrModelSha256']!=model_hash() or key['identity']['cropSha256']!=digest(image):raise ValueError('Independent source key model/crop differs')
    source=read_json(row['package']);source_path=Path(source['sourcePath'])
    if digest(source_path)!=source_sha or source['sourceSha256']!=source_sha or digest(row['package'])!=row['packageSha256']:
        raise ValueError('Original source or partial source package changed')
    if digest(key['sourceKeyPath'])!=key['sourceKeyDocumentSha256']:raise ValueError('Actual separate official key source changed')
    with pymupdf.open(key['sourceKeyPath']) as official:
        current=key_section(official[key['physicalKeyPage']-1],key['identity']['exam'],key['identity']['sourceTestNumber'])
    if not current or current['answers']!=key['nativeAnswers']:raise ValueError('Current actual printed section key changed')
    for card in source['cards']:
        if card['sourceSha256']!=source_sha or answer_for_question(card['individualEditionProof'],key)!=card['answer']:
            raise ValueError('A changed or unbound question entered the partial answer package')
        if digest(card['image'])!=card['imageSha256'] or digest(card['pixelProof']['path'])!=card['pixelProof']['sha256']:
            raise ValueError('Prepared original question/pixel proof changed')
        pixels=read_json(card['pixelProof']['path'])['pixelProof']
        if pixels['sourcePixelSha256']!=pixels['preparedPixelSha256']:raise ValueError('Original and prepared question pixels differ')
    return len(source['cards'])


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);body_path=root/'pdf-on-tarama/chemistry-question-editions/report.json';body=read_json(body_path)
    if body['status']!='COMPLETE':raise ValueError('Complete individual original chemistry edition proofs required')
    folder=root/'partial-chemistry-preparation';folder.mkdir(exist_ok=True);results=[];calls=0;key_hits=0;models=0;ocr_model=model_hash()
    key_rows=[]
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'ONLY_INDIVIDUALLY_IDENTICAL_QUESTIONS_WITH_TWO_AGREEING_OFFICIAL_KEY_READINGS',
            'documents':len(body['results']),'completed':len(results),'pending':len(body['results'])-len(results),
            'questionsPrepared':sum(r.get('questions',0) for r in results),'states':dict(Counter(r['status'] for r in results)),
            'keyReadingStates':dict(Counter(k['status'] for k in key_rows)),'newOcrCallsThisPass':calls,'cachedKeyReadingsThisPass':key_hits,
            'sourceBodyProofSha256':digest(body_path),'ocrModelSha256':ocr_model,'toolSha256':digest(Path(__file__)),
            'newModelCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results,'sourceKeyReadings':key_rows})
    with process_lock(folder/'.writer.lock'),ExitStack() as stack:
        books={}
        try:
            save('RUNNING')
            for source in body['results']:
                sha=source['sourceSha256'];questions=[q for q in source['questions'] if q['status']=='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL']
                if not questions:
                    results.append({'sourceSha256':sha,'status':'NO_INDIVIDUALLY_IDENTICAL_QUESTIONS_PREPARED','questions':0});continue
                book_sha=source['officialBookSha256'];book_path=source['officialBookPath'];path=Path(source['sourcePath']);test=source['testNumber'];exam=source['exam']
                if book_sha not in books:
                    if digest(book_path)!=book_sha:raise ValueError('Official separate key source changed')
                    books[book_sha]=stack.enter_context(pymupdf.open(book_path))
                book=books[book_sha];section=key_section(book[source['officialKeyPage']-1],exam,test)
                if not section or section['answers']!=source['officialNativePrintedAnswers'] or section['bboxPt']!=source['officialKeyBboxPt']:
                    raise ValueError('Actual official chemistry section key changed')
                out=folder/sha[:16];out.mkdir(exist_ok=True);crop=out/'official-printed-key.png'
                pix=book[section['page']-1].get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False);pix.save(crop)
                identity={'sourceKeyDocumentSha256':book_sha,'sourceKeyPhysicalPage':section['page'],'sourceTestNumber':test,'exam':exam,
                    'cropSha256':digest(crop),'ocrModelSha256':ocr_model,'rendererVersion':pymupdf.VersionBind,'protocol':'partial-source-key-native-independent-tur-330-v1'}
                raw=out/(signature(identity)+'.json')
                if raw.is_file():reading=read_json(raw);key_hits+=1
                else:
                    with pymupdf.open('pdf',pix.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
                    reading={'identity':identity,'ocrText':text};write_json(raw,reading);calls+=1
                if reading['identity']!=identity:raise ValueError('Independent section key cache changed')
                second=read_pairs(reading['ocrText'],OCR_PAIR)
                key={'sourceSha256':sha,'sourceKeyDocumentSha256':book_sha,'sourceKeyPath':book_path,'physicalKeyPage':section['page'],
                    'nativeAnswers':section['answers'],'independentAnswers':second,'cropPath':str(crop),'cropSha256':digest(crop),
                    'rawEvidencePath':str(raw),'rawEvidenceSha256':digest(raw),'identity':identity,
                    'status':'NATIVE_AND_INDEPENDENT_RENDERED_SECTION_KEY_AGREE' if second==section['answers'] else 'PRINTED_SECTION_KEY_READINGS_DISAGREE_NO_INTAKE'}
                key_rows.append(key);cards=[]
                if digest(path)!=sha:raise ValueError('Original source chemistry diagnostic changed')
                with pymupdf.open(path) as doc:
                    for question in questions:
                        answer=answer_for_question(question,key)
                        if answer is None:continue
                        page=doc[question['sourcePage']-1];box=question['sourceRegionPt'];image=out/(question['sourceCode']+'.webp');stamp=out/(question['sourceCode']+'.crop.json')
                        crop_key=signature([sha,page.number+1,box,180,pymupdf.VersionBind,'individual-exact-chemistry-original-lossless-v1'])
                        old=read_json(stamp) if stamp.is_file() else {}
                        if not image.is_file() or old.get('identity')!=crop_key or digest(image)!=old.get('imageSha256'):
                            pixels=page.get_pixmap(dpi=180,clip=pymupdf.Rect(box),alpha=False)
                            with Image.open(io.BytesIO(pixels.tobytes('png'))) as actual:actual.save(image,format='WEBP',lossless=True,method=0)
                            proof=check_pixels(page,{'image':str(image),'bboxPt':box});write_json(stamp,{'identity':crop_key,'imageSha256':digest(image),'pixelProof':proof})
                        text=page.get_text(clip=pymupdf.Rect(box)).strip()
                        cards.append({'code':question['sourceCode'],'sourceSha256':sha,'sourcePath':str(path),'exam':exam,'subjectId':'kimya','subject':'Kimya',
                            'printedNumber':question['printedNumber'],'pdfPage':question['sourcePage'],'bboxPt':box,
                            'sourceRegions':[{'pdfPage':question['sourcePage'],'bboxPt':box,'role':'INDIVIDUALLY_IDENTICAL_ORIGINAL_QUESTION'}],
                            'image':str(image),'imageSha256':digest(image),'pixelProof':{'path':str(stamp),'sha256':digest(stamp)},
                            'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'textFingerprint':text_fingerprint(text),
                            'answer':answer,'sourceKeyPage':section['page'],'sourceKeyPath':book_path,'sourceKeyDocumentSha256':book_sha,
                            'keyEvidenceSha256':digest(raw),'answerOrigin':'EXPLICIT_OFFICIAL_PRINTED_KEY_FOR_EXACT_INDIVIDUAL_QUESTION_ONLY',
                            'answerReadingMethods':'NATIVE_PLUS_INDEPENDENT_RENDERED_TUR_OCR','individualEditionProof':question,
                            'containsGraphics':True,'reviewConcerns':[],'topicAssignment':'NOT_YET_VERIFIED','teacherApproved':False,'importAccepted':False})
                package=out/'candidates.json';write_json(package,{'status':'PREPARED' if cards else 'EXCLUDED_UNTIL_INDEPENDENT_KEY_READINGS_AGREE',
                    'sourceSha256':sha,'sourcePath':str(path),'fullTestKeyTransferred':False,'cards':cards,'teacherApproved':False})
                results.append({'sourceSha256':sha,'status':'PREPARED' if cards else 'KEY_READING_REVIEW_REQUIRED','questions':len(cards),
                    'package':str(package),'packageSha256':digest(package),'keyReading':key,'fullTestAccepted':False,'teacherApproved':False})
                save('RUNNING')
                if len(results)%10==0:print('Partial chemistry source keys',len(results),'/',len(body['results']),sum(r.get('questions',0) for r in results),flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    report=read_json(folder/'progress.json');print({k:v for k,v in report.items() if k not in ['results','sourceKeyReadings']})


if __name__=='__main__':main()
