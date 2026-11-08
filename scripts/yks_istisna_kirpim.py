"""Preserve original pixels for independently keyed body-layout exceptions."""
from collections import Counter
import hashlib
from pathlib import Path

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_istisna_anahtar import validate_key
from yks_govde_istisna_incele import inspect
from yks_ortak_sekil_kirpim import source_region,join_regions
from yks_pilot_kirpim_kontrol import uncovered_body_lines
from pdf_source_reconcile import text_fingerprint

VERSION='explicit-body-source-regions-lossless-v1'


def original_image(doc,regions):
    if not regions:raise ValueError('Original source regions required')
    parts=[source_region(doc[r['pdfPage']-1],r['bboxPt']) for r in regions]
    result=parts[0]
    for part in parts[1:]:result=join_regions(result,part)
    return result,parts


def verify_image(doc,regions,path):
    expected,parts=original_image(doc,regions)
    with Image.open(path) as actual:
        if actual.mode!='RGB' or actual.size!=expected.size or actual.tobytes()!=expected.tobytes():
            raise ValueError('Question/continuation pixels or spacing differ from source')
    return {'sourceRegions':regions,'sourcePixelsPreserved':True,'sourceAndPreparedPixelsEqual':True,
        'compositeRgbSha256':hashlib.sha256(expected.tobytes()).hexdigest(),
        'regionRgbSha256':[hashlib.sha256(p.tobytes()).hexdigest() for p in parts],
        'gapPixels':24 if len(parts)>1 else 0,'imageSha256':digest(path)}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    source=root/'pdf-on-tarama/full-key-scan/body-exception-keys/report.json';keys=read_json(source)
    if keys['status']!='COMPLETE':raise ValueError('Complete independently read key pass first')
    folder=root/'full-question-exception-crops';folder.mkdir(exist_ok=True);results=[];hits=0
    with process_lock(folder/'.writer.lock'):
        for row in keys['results']:
            if row['status']!='SOURCE_KEY_VERIFIED':continue
            validate_key(row);sha=row['sourceSha256'];body=inspect(row['originalObservation'])
            out=folder/sha[:16];out.mkdir(exist_ok=True);cache=out/'technical-integrity.json'
            identity={'sourceSha256':sha,'keyEvidenceSha256':row['keyEvidenceSha256'],'bodyProofSignature':row['bodyProofSignature'],
                'sourceAnswers':row['sourceAnswers'],'version':VERSION,'rendererVersion':pymupdf.VersionBind,
                'readerFiles':{p:digest(APP/'scripts'/p) for p in ['yks_istisna_kirpim.py','yks_ortak_sekil_kirpim.py','yks_pilot_kirpim_kontrol.py']}}
            if cache.is_file() and read_json(cache)['identity']==identity:
                result=read_json(cache)['result']
                if digest(result['package'])!=result['packageSha256']:raise ValueError('Exception package changed')
                for card in read_json(result['package'])['cards']:
                    if digest(card['image'])!=card['imageSha256']:raise ValueError('Exception image changed')
                for proof in result['pixelProofs']:
                    if digest(proof['path'])!=proof['sha256']:raise ValueError('Exception pixel proof changed')
                hits+=1;results.append(result);continue
            answers={a['number']:a['answer'] for a in row['sourceAnswers']};cards=[];proofs=[];coverage=[]
            with pymupdf.open(row['sourcePath']) as doc:
                for original in body['cards']:
                    number=original['printedNumber'];regions=original['sourceRegions'];code='mebi-'+sha[:12]+'-q'+str(number)
                    image=out/(code+'.webp');pixels,_=original_image(doc,regions);pixels.save(image,format='WEBP',lossless=True)
                    proof=verify_image(doc,regions,image);proof.update(sourceSha256=sha,sourceCode=code)
                    proof_path=out/(code+'.pixels.json');write_json(proof_path,proof);proofs.append({'path':str(proof_path),'sha256':digest(proof_path)})
                    card={'code':code,'sourceSha256':sha,'printedNumber':number,'pdfPage':regions[0]['pdfPage'],
                        'bboxPt':regions[0]['bboxPt'],'sourceRegions':regions,'image':str(image),'imageSha256':digest(image),
                        'text':original['text'],'textSha256':original['textSha256'],'textFingerprint':text_fingerprint(original['text']),
                        'answer':answers[number],'sourceKeyPage':row['sourceKeyPage'],'keyEvidenceSha256':row['keyEvidenceSha256'],
                        'sourceKeyDocumentSha256':sha,'sourceKeyPath':row['sourcePath'],'answerOrigin':'EXPLICIT_PRINTED_SOURCE_KEY',
                        'answerReadingMethods':row['method'],**{k:row[k] for k in ['exam','printedExamScopes','subjectId','subject','testId']},
                        'nativeOptionProof':original['nativeOptionProof'],'containsGraphics':True,
                        'reviewConcerns':['CONTENT_GRAPHICS_AND_FINE_TOPIC_REVIEW_REQUIRED'],
                        'cropAcceptance':'ORIGINAL_BODY_AND_CONTINUATION_PIXELS_VERIFIED',
                        'topicAssignment':'NOT_YET_VERIFIED','importDecision':'NOT_ACCEPTED_FOR_IMPORT','teacherApproved':False}
                    cards.append(card)
                for page in list(doc)[:-1]:
                    regions=[r for c in cards for r in c['sourceRegions'] if r['pdfPage']==page.number+1]
                    missing=uncovered_body_lines(page,regions)
                    coverage.append({'page':page.number+1,'uncoveredBodyLines':missing})
            if digest(row['sourcePath'])!=sha:raise ValueError('Source changed while preparing exception crops')
            if [c['printedNumber'] for c in cards]!=list(answers):raise ValueError('Printed question/key sequence differs')
            path=out/'candidates.json';write_json(path,{'status':'PREPARED','sourceSha256':sha,'sourcePath':row['sourcePath'],
                'keyEvidenceSha256':row['keyEvidenceSha256'],'extractorVersion':VERSION,'cards':cards,'questionBankWrites':0,'teacherApproved':False})
            gaps=sum(len(r['uncoveredBodyLines']) for r in coverage)
            result={'sourceSha256':sha,'status':'PREPARED' if not gaps else 'NATIVE_BODY_LINE_COVERAGE_REVIEW_REQUIRED',
                'questions':len(cards),'package':str(path),'packageSha256':digest(path),'pixelProofs':proofs,'bodyCoverage':coverage,
                'uncoveredNativeBodyLines':gaps,'sourceAndPreparedPixelsEqual':True,'questionBankWrites':0,'teacherApproved':False}
            write_json(cache,{'identity':identity,'result':result});results.append(result)
        report={'status':'SUPPORTED_KEYED_DIAGNOSTIC_CROP_PASS_COMPLETE','scope':'SIX_EXPLICIT_BODY_EXCEPTIONS_ONLY',
            'sourceKeyIdentity':signature([[r['sourceSha256'],r['keyEvidenceSha256']] for r in keys['results'] if r['status']=='SOURCE_KEY_VERIFIED']),
            'documentsWithVerifiedKeys':len(results),'questionsPrepared':sum(r['questions'] for r in results if r['status']=='PREPARED'),
            'uncoveredNativeBodyLines':sum(r['uncoveredNativeBodyLines'] for r in results),'reusedDocumentsThisPass':hits,
            'sourceKeyReportSha256':digest(source),'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results}
        write_json(folder/'progress.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
