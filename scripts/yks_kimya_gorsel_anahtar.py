"""Resolve only 42 OCR key exceptions from the original printed strip with Qwen.

Expected answers never enter the model prompt. A matching key still accepts no
changed question or complete test; individual native/two-DPI body proof is separate.
"""
import argparse
from collections import Counter
from pathlib import Path
import sys

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest,process_lock
from yks_soru_pilotu import APP
from yks_anahtar_pilotu import api,MODEL
from yks_anahtar_gorsel import transcription
from yks_ayri_anahtar import key_section


def validate_section_reading(native,visual):
    if not native or visual is None or visual!=native:return False
    return [r['number'] for r in visual]==list(range(1,len(visual)+1)) and all(r['answer'] in list('ABCDE') for r in visual)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int);args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive call limit required')
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    source=root/'partial-chemistry-preparation/progress.json';base=read_json(source);base_sha=digest(source)
    body_path=root/'pdf-on-tarama/chemistry-question-editions/report.json';body=read_json(body_path);body_sha=digest(body_path)
    if base['status']!='COMPLETE' or body['status']!='COMPLETE':raise ValueError('Completed original partial source/answer observations required')
    cases=[r for r in base['sourceKeyReadings'] if r['status']=='PRINTED_SECTION_KEY_READINGS_DISAGREE_NO_INTAKE']
    if len(cases)!=42:raise ValueError('Expected the frozen 42 OCR exceptions; changed scope requires reconciliation')
    sources={r['sourceSha256']:r for r in body['results']};model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    if 'vision' not in api('/api/show',{'model':MODEL}).get('capabilities',[]):raise ValueError('Installed key-reading model must support source images')
    folder=root/'partial-chemistry-visual-keys';folder.mkdir(exist_ok=True);cache=folder/'readings';cache.mkdir(exist_ok=True)
    results=[];calls=0;verified_books=set()
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'ONLY_42_EXISTING_PARTIAL_CHEMISTRY_OCR_KEY_EXCEPTIONS',
            'basePreparationSha256':base_sha,'individualBodyProofSha256':body_sha,
            'model':MODEL,'modelDigest':model['digest'],'sourceDocuments':len(cases),'completed':len(results),'pending':len(cases)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'newModelCallsThisPass':calls,'toolSha256':digest(Path(__file__)),
            'sourceQuestionAnswersBound':False,'fullTestKeyTransferred':False,'sourceWrites':0,'questionBankWrites':0,
            'teacherApproved':False,'results':results})
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-partial-chemistry-key-exceptions',model=MODEL):
        try:
            save('RUNNING')
            for key in cases:
                if args.limit is not None and calls>=args.limit:break
                sha=key['sourceSha256'];original=sources[sha];path=Path(key['sourceKeyPath']);crop=Path(key['cropPath'])
                if digest(crop)!=key['cropSha256']:raise ValueError('Original source key strip changed')
                if path not in verified_books:
                    if digest(path)!=key['sourceKeyDocumentSha256']:raise ValueError('Original official book changed')
                    verified_books.add(path)
                with pymupdf.open(path) as doc:
                    page=doc[key['physicalKeyPage']-1];section=key_section(page,original['exam'],original['testNumber'])
                    if (not section or section['answers']!=key['nativeAnswers']
                            or section['bboxPt']!=original['officialKeyBboxPt']):raise ValueError('Original printed key identity or complete native answers changed')
                    pix=page.get_pixmap(dpi=330,clip=pymupdf.Rect(section['bboxPt']),alpha=False)
                    with Image.open(crop) as image:
                        if image.mode!='RGB' or image.size!=(pix.width,pix.height) or image.tobytes()!=pix.samples:
                            raise ValueError('Actual key image pixels differ from the official printed section')
                reading=transcription(model,crop,cache);calls+=int(not reading['cacheHit'])
                agree=validate_section_reading(key['nativeAnswers'],reading['reading'])
                results.append({'sourceSha256':sha,'exam':original['exam'],'testNumber':original['testNumber'],
                    'status':'CURRENT_OFFICIAL_NATIVE_AND_INDEPENDENT_QWEN_SECTION_KEY_AGREE' if agree else 'PRINTED_SOURCE_KEY_VISUAL_REVIEW_STILL_REQUIRED',
                    'sourceKeyPath':str(path),'sourceKeyDocumentSha256':key['sourceKeyDocumentSha256'],'physicalKeyPage':key['physicalKeyPage'],
                    'sourceKeyBboxPt':section['bboxPt'],'sourceCropPixelsEqual':True,'cropPath':str(crop),'cropSha256':key['cropSha256'],
                    'nativePrintedAnswers':key['nativeAnswers'],'independentPrintedAnswers':reading['reading'],
                    'originalOcrReading':key['independentAnswers'],'originalOcrEvidencePath':key['rawEvidencePath'],
                    'originalOcrEvidenceSha256':key['rawEvidenceSha256'],**{k:reading[k] for k in ['evidencePath','evidenceSha256','modelDigest','error','cacheHit']},
                    'individuallyIdenticalQuestionCandidates':sum(q['status']=='INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL' for q in original['questions']),
                    'fullTestKeyTransferred':False,'questionAnswersBound':False,'teacherApproved':False})
                save('RUNNING');print('Independent chemistry printed key',len(results),'/',len(cases),sha[:12],results[-1]['status'],flush=True)
            if digest(source)!=base_sha or digest(body_path)!=body_sha:raise ValueError('Original source/key scope changed during visual review')
            save('COMPLETE' if len(results)==len(cases) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
