"""Read an explicitly numbered 61-answer physics key without a 60-item cutoff."""
from collections import Counter
import argparse
import hashlib
from pathlib import Path
import re
import sys

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,verified_source_scope
from yks_cevap_on_tarama import PAIR
from yks_tam_anahtar_taramasi import body_number_proof
from pdf_ocr_cache import model_hash


def large_pairs(text):
    rows=[{'number':int(m[1]),'answer':m[2].upper()} for m in PAIR.finditer(text)]
    if not 4<=len(rows)<=200 or [r['number'] for r in rows]!=list(range(1,len(rows)+1)):
        raise ValueError('Printed key numbers are missing, duplicated or out of order')
    return rows


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--visual',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);base=root/'pdf-on-tarama/full-key-scan'
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Verified actual pilot required')
    cohort=read_json(base/'progress.json');rows=[r for r in cohort['results'] if r['sourceSha256'].startswith('c9547667c0ec8b44')]
    if len(rows)!=1:raise ValueError('Expected actual 61-answer source key is missing/ambiguous')
    row=rows[0];source=Path(row['sourcePath']);sha=row['sourceSha256'];out=base/'large-key';out.mkdir(exist_ok=True)
    if digest(source)!=sha:raise ValueError('Original source changed')
    with process_lock(out/'.writer.lock'),pymupdf.open(source) as doc:
        page=doc[-1];native=page.get_text();answers=large_pairs(native)
        if len(answers)!=61 or len(native)>61*20+150:raise ValueError('Compact actual 61-answer printed key required')
        scope=verified_source_scope(row,doc);body=body_number_proof(doc,answers)
        words=page.get_text('words');box=pymupdf.Rect(min(w[0] for w in words)-6,min(w[1] for w in words)-6,
            max(w[2] for w in words)+6,max(w[3] for w in words)+6)&page.rect
        crop=out/'printed-key.png';pixmap=page.get_pixmap(dpi=330,clip=box,alpha=False);pixmap.save(crop);model=model_hash()
        identity={'sourceSha256':sha,'page':len(doc),'cropSha256':digest(crop),'ocrModelSha256':model,
            'rendererVersion':pymupdf.VersionBind,'method':'large-compact-native-independent-tur-v1'}
        file=out/(signature(identity)+'.json');new_ocr=0
        if file.is_file():observed=read_json(file)
        else:
            with pymupdf.open('pdf',pixmap.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:text=recognized[0].get_text()
            observed={'identity':identity,'text':text};write_json(file,observed);new_ocr=1
        if observed['identity']!=identity:raise ValueError('Large-key OCR cache identity differs')
        try:second=large_pairs(observed['text'])
        except ValueError:second=None
        agree=second==answers;visual=None
        if not agree and args.visual and body['status']=='PASS':
            from yks_anahtar_gorsel import transcription,MODEL
            from yks_anahtar_pilotu import api
            sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
            installed=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
            cache=out/'vision';cache.mkdir(exist_ok=True)
            with ModelLease(role='yks-large-printed-key-image',model=MODEL):
                try:
                    for active in api('/api/ps').get('models',[]):
                        if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                    visual=transcription(installed,crop,cache)
                    agree=visual['reading']==answers
                finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
        report={'status':'SOURCE_KEY_VERIFIED' if agree and body['status']=='PASS' else 'LARGE_KEY_READING_OR_BODY_LAYOUT_REVIEW_REQUIRED',
            'scope':'ACTUAL_61_ANSWER_PHYSICS_SOURCE_ONLY',**scope,'course':row['course'],'bodyNumberProof':body,'sourceSha256':sha,'sourcePath':str(source),
            'sourceKeyPage':len(doc),'sourceKeyDocumentSha256':sha,'sourceKeyPath':str(source),'bodyPageCount':len(doc)-1,
            'nativePrintedAnswers':answers,'independentOcrAnswers':second,'sourceAnswers':answers if agree and body['status']=='PASS' else None,
            'cropPath':str(crop),'cropSha256':digest(crop),'ocrEvidencePath':str(file),'keyEvidenceSha256':digest(file),
            'method':'NATIVE_PLUS_RENDERED_LARGE_KEY_CROP_TUR_OCR','newOcrCallsThisPass':new_ocr,
            'newModelCalls':int(visual is not None and not visual['cacheHit']),'questionBankWrites':0,'sourceWrites':0,
            'teacherApproved':False,'toolSha256':digest(Path(__file__))}
        if visual is not None:
            report.update({k:v for k,v in visual.items() if k!='reading'})
            report.update(independentImageAnswers=visual['reading'],keyEvidenceSha256=visual['evidenceSha256'],
                method='NATIVE_PLUS_INDEPENDENT_QWEN_LARGE_KEY_CROP')
        write_json(out/'report.json',report)
    print({k:v for k,v in report.items() if k not in ['bodyNumberProof','nativePrintedAnswers','independentOcrAnswers','independentImageAnswers','sourceAnswers']})


if __name__=='__main__':main()
