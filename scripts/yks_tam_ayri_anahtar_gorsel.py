"""Resolve separate official keys only after exact complete question-body proof."""
from collections import Counter
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,test_identities
from yks_ayri_anahtar import key_section
from yks_anahtar_gorsel import transcription,MODEL
from yks_anahtar_pilotu import api


def eligible(row):
    return row['status']=='SEPARATE_KEY_PRINTED_READINGS_DISAGREE_REVIEW_REQUIRED' and row.get('fullQuestionBodyTextAndPixelsEqual') is True \
        and row.get('bodyNumberProof',{}).get('status')=='PASS' and all(p.get('matches') for p in row.get('bodyChecks',[]))


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);base=root/'pdf-on-tarama/full-key-scan'
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Verified actual isolated pilot required')
    files=[base/'separate-chemistry/progress.json',base/'separate-tarih/progress.json'];rows=[]
    for path in files:rows.extend(r for r in read_json(path)['results'] if eligible(r))
    output=base/'separate-visual-report.json';results=[];calls=0
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        write_json(output,{'status':status,'scope':'EXACT_BODY_SEPARATE_OFFICIAL_PRINTED_KEY_VISUAL_READINGS',
            'sourceReports':{str(p):digest(p) for p in files},'documents':len(rows),'pending':len(rows)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'newModelCallsThisPass':calls,'model':MODEL,'modelDigest':model['digest'],
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':results})
    with process_lock(base/'.separate-visual-writer.lock'),ModelLease(role='yks-full-separate-key-image',model=MODEL):
        try:
            save('RUNNING')
            for row in rows:
                sha=row['sourceSha256'];crop=Path(row['cropPath'])
                if digest(row['sourcePath'])!=sha or digest(row['sourceKeyPath'])!=row['sourceKeyDocumentSha256'] or digest(crop)!=row['cropSha256']:
                    raise ValueError('Separate key exact-body source evidence changed')
                with pymupdf.open(row['sourceKeyPath']) as book:
                    section=key_section(book[row['sourceKeyPage']-1],row['exam'],row['testNumber'])
                if not section or section['answers']!=row['nativePrintedAnswers']:raise ValueError('Actual printed separate key identity or content differs')
                cache=crop.parent/'vision';cache.mkdir(exist_ok=True)
                for active in api('/api/ps').get('models',[]):
                    if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                observed=transcription(model,crop,cache);calls+=not observed['cacheHit']
                agree=observed['reading']==row['nativePrintedAnswers']
                results.append({**row,'status':'SEPARATE_KEY_VERIFIED' if agree else 'SEPARATE_KEY_IMAGE_READING_REVIEW_REQUIRED',
                    'sourceAnswers':row['nativePrintedAnswers'] if agree else None,'independentImageReading':observed['reading'],
                    'keyEvidenceSha256':observed['evidenceSha256'],'method':'NATIVE_PLUS_INDEPENDENT_QWEN_KEY_CROP',
                    **{k:v for k,v in observed.items() if k!='reading'}})
                save('RUNNING');print(f'Separate printed-key image: {len(results)}/{len(rows)} {row["exam"]} {row["subject"]}: {results[-1]["status"]}',flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(output).items() if k not in ('sourceReports','results')})


if __name__=='__main__':main()
