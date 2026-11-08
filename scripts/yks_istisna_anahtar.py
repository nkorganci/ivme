"""Read printed keys for six explicitly documented body-layout exceptions.

Body exceptions never relax key, source/test/course or image-transcription rules.
The prior 259+2 accepted sources and their cached work are left untouched.
"""
from collections import Counter
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,verified_source_scope
from yks_govde_istisna_incele import inspect,READINGS
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api


def validate_reading(expected,observed):
    if not expected or [r['number'] for r in expected]!=list(range(1,len(expected)+1)):
        raise ValueError('Complete ordered native source key required')
    if any(r['answer'] not in 'ABCDE' or len(r['answer'])!=1 for r in expected):
        raise ValueError('Invalid printed answer')
    if observed!=expected:raise ValueError('Independent printed key readings disagree')


def validate_key(row):
    sha=row['sourceSha256']
    if row['status']!='SOURCE_KEY_VERIFIED' or digest(row['sourcePath'])!=sha:
        raise ValueError('Verified unchanged source required')
    if not any(sha.startswith(p) for p in READINGS):raise ValueError('Unreviewed source exception')
    if digest(row['cropPath'])!=row['cropSha256'] or digest(row['evidencePath'])!=row['evidenceSha256']:
        raise ValueError('Printed key crop or independent raw response changed')
    raw=read_json(row['evidencePath'])
    if raw['identity']['cropSha256']!=row['cropSha256'] or raw['identity']['modelDigest']!=row['modelDigest']:
        raise ValueError('Independent model/crop identity differs')
    validate_reading(row['sourceAnswers'],checked_reading(raw['response']))
    original=row['originalObservation']
    if original['sourceSha256']!=sha or original['cropSha256']!=row['cropSha256']:
        raise ValueError('Original native key observation differs')
    validate_reading(original['nativePrintedAnswers'],row['sourceAnswers'])
    if signature(inspect(original))!=row['bodyProofSignature']:
        raise ValueError('Explicit body sequence/option/continuation proof changed')
    with pymupdf.open(row['sourcePath']) as doc:
        scope=verified_source_scope(original,doc)
        if any(row[k]!=v for k,v in scope.items()):raise ValueError('Current printed test/exam/course differs')
    return row


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    original=read_json(root/'pdf-on-tarama/full-key-scan/progress.json')
    bodies=read_json(root/'pdf-on-tarama/diagnostic-body-exceptions/report.json')
    sources={r['sourceSha256']:r for r in original['results']}
    folder=root/'pdf-on-tarama/full-key-scan/body-exception-keys';folder.mkdir(exist_ok=True)
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    results=[];calls=0
    def save(status):
        write_json(folder/'report.json',{'status':status,'scope':'SIX_EXPLICIT_BODY_EXCEPTIONS_INDEPENDENT_KEYS_ONLY',
            'documents':len(bodies['results']),'completed':len(results),'states':dict(Counter(r['status'] for r in results)),
            'verifiedAnswers':sum(len(r['sourceAnswers'] or []) for r in results),'newModelCallsThisPass':calls,
            'newOcrCalls':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,
            'toolSha256':digest(Path(__file__)),'results':results})
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-body-exception-printed-keys',model=MODEL):
        try:
            save('RUNNING')
            for body in bodies['results']:
                sha=body['sourceSha256'];row=sources[sha];current=inspect(row)
                if signature(current)!=signature(body):raise ValueError('Prepared explicit body proof changed')
                if digest(row['cropPath'])!=row['cropSha256']:raise ValueError('Native source key crop changed')
                with pymupdf.open(row['sourcePath']) as doc:scope=verified_source_scope(row,doc)
                out=folder/sha[:16];out.mkdir(exist_ok=True)
                # Reuse the same crop/protocol cache if a prior reader already
                # produced it; transcription also validates the cached identity.
                cache=Path(row['cropPath']).parent/'vision';cache.mkdir(exist_ok=True)
                observed=transcription(model,Path(row['cropPath']),cache);calls+=not observed['cacheHit']
                agree=observed['reading']==row['nativePrintedAnswers']
                result={**scope,'sourceSha256':sha,'sourcePath':row['sourcePath'],'course':row['course'],
                    'sourceAnswers':row['nativePrintedAnswers'] if agree else None,
                    'status':'SOURCE_KEY_VERIFIED' if agree else 'SOURCE_READINGS_DISAGREE_REVIEW_REQUIRED',
                    'cropPath':row['cropPath'],'sourceKeyPage':row['sourceKeyPage'],'sourceKeyPath':row['sourcePath'],
                    'sourceKeyDocumentSha256':sha,'bodyPageCount':row['sourcePageCount']-1,
                    'method':'NATIVE_PLUS_INDEPENDENT_QWEN_AND_EXPLICIT_BODY_LAYOUT_PROOF',
                    'bodyProofSignature':signature(current),'originalObservation':row,
                    'keyEvidenceSha256':observed['evidenceSha256'],**{k:v for k,v in observed.items() if k!='reading'},
                    'independentImageReading':observed['reading'],'teacherApproved':False,'questionBankWrites':0}
                if agree:validate_key(result)
                results.append(result);save('RUNNING');print(sha[:12],result['status'],flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'report.json').items() if k!='results'})


if __name__=='__main__':main()
