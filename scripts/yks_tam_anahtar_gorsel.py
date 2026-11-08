"""Independently read only full-scan printed key crops with unresolved OCR."""
import argparse
from collections import Counter
from pathlib import Path
import sys

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_anahtar_gorsel import transcription,MODEL
from yks_anahtar_pilotu import api
from yks_pilot_kaynaklari import APP,verified_source_scope


def eligible(row):
    return row['status']=='PRINTED_KEY_READING_DISAGREEMENT_REVIEW_REQUIRED' and row.get('bodyNumberProof',{}).get('status')=='PASS'


def source_signature(cohort):
    # Per-pass counters/cache-hit flags do not change the printed source proof.
    fields=['sourceSha256','sourcePath','status','exam','course','sourcePageCount','sourceKeyPage',
        'sourceKeyDocumentSha256','nativePrintedAnswers','sourceAnswers','bodyNumberProof','cropSha256',
        'ocrEvidenceSha256','keyEvidenceSha256','scopeIssue','method','printedExamScopes','printedTestIdentity']
    return signature({'groups':cohort['identity']['sourceGroupsSha256'],
        'results':[{k:r.get(k) for k in fields} for r in cohort['results']]})


def resolved_rows(cohort,decisions):
    rows=[]
    for row in cohort['results']:
        chosen=decisions.get(row['sourceSha256'])
        if chosen:
            if not eligible(row) or (chosen['status']=='SOURCE_KEY_VERIFIED' and chosen['sourceAnswers']!=row['nativePrintedAnswers']):
                raise ValueError('Visual resolution cannot change a printed key or relax a blocked source scope')
            row={**row,**chosen}
        rows.append(row)
    return rows


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int)
    parser.add_argument('--cached-only',action='store_true');args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive new-model-call limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    if store.verify(state,'YKS-10','pilot')['status']!='VERIFIED':raise ValueError('Verified actual pilot required')
    folder=root/'pdf-on-tarama/full-key-scan';source=folder/'progress.json';cohort=read_json(source);source_sha=digest(source)
    if cohort['status']!='SUPPORTED_DIAGNOSTIC_LAYOUT_PASS_COMPLETE':raise ValueError('Complete supported native/OCR diagnostic pass first')
    output=folder/'visual-resolution-report.json';old=read_json(output) if output.is_file() else {}
    evidence_signature=source_signature(cohort)
    if old.get('sourceEvidenceSignature') not in [None,evidence_signature] or (
        old.get('sourceEvidenceSignature') is None and old.get('sourceScanSha256') not in [None,source_sha]):
        raise ValueError('Full key source evidence changed; revalidate previous visual resolutions')
    decisions={r['sourceSha256']:r for r in old.get('results',[])};cases=[r for r in cohort['results'] if eligible(r)]
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    calls=0
    def save(status):
        write_json(output,{'status':status,'scope':'FULL_SCAN_PRINTED_KEY_VISUAL_RESOLUTION_ONLY','sourceScanSha256':source_sha,
            'sourceEvidenceSignature':evidence_signature,
            'model':MODEL,'modelDigest':model['digest'],'toolSha256':digest(Path(__file__)),
            'states':dict(Counter(r['status'] for r in decisions.values())),
            'documents':len(cases),'pendingDocuments':len(cases)-len(decisions),'newModelCallsThisPass':calls,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'fullYks07Accepted':False,'results':list(decisions.values())})
        combined=resolved_rows(cohort,decisions)
        write_json(folder/'resolved-key-scope-report.json',{'status':'PARTIAL','scope':'ALL_DIAGNOSTIC_KEYS_WITH_VERIFIED_VISUAL_RESOLUTIONS',
            'sourceEvidenceSignature':evidence_signature,'sourceScanSha256':source_sha,'documents':len(combined),
            'states':dict(Counter(r['status'] for r in combined)),
            'verifiedPrintedAnswers':sum(len(r.get('sourceAnswers') or []) for r in combined if r['status']=='SOURCE_KEY_VERIFIED'),
            'pendingVisualDocuments':len(cases)-len(decisions),'fullYks07Accepted':False,'questionBankWrites':0,
            'sourceWrites':0,'teacherApproved':False,'results':combined})
    with process_lock(folder/'.visual-writer.lock'),ModelLease(role='yks-full-printed-key-reading',model=MODEL):
        try:
            save('RUNNING')
            for row in cases:
                sha=row['sourceSha256'];crop=Path(row['cropPath'])
                if digest(row['sourcePath'])!=sha or digest(crop)!=row['cropSha256']:raise ValueError('Actual printed key source or crop changed')
                if sha in decisions:
                    old=decisions[sha]
                    if old['sourceCropSha256']!=row['cropSha256'] or old['modelDigest']!=model['digest'] or digest(old['evidencePath'])!=old['evidenceSha256']:
                        raise ValueError('Saved full-key visual resolution changed')
                    continue
                if args.cached_only or args.limit is not None and calls>=args.limit:break
                for active in api('/api/ps').get('models',[]):
                    if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                cache=folder/sha/'vision';cache.mkdir(exist_ok=True)
                observed=transcription(model,crop,cache);calls+=not observed['cacheHit']
                agrees=observed['reading']==row['nativePrintedAnswers']
                # A model's agreement never relaxes the printed test/course or
                # complete body-number requirements already checked separately.
                with pymupdf.open(row['sourcePath']) as pdf:scope=verified_source_scope(row,pdf)
                decision={**scope,'sourceSha256':sha,'sourcePath':row['sourcePath'],'sourceKeyPage':row['sourceKeyPage'],
                    'sourceKeyDocumentSha256':sha,'sourceKeyPath':row['sourcePath'],'bodyPageCount':row['sourcePageCount']-1,
                    'sourceCropSha256':row['cropSha256'],'status':'SOURCE_KEY_VERIFIED' if agrees else 'IMAGE_READING_REQUIRES_SOURCE_REVIEW',
                    'sourceAnswers':row['nativePrintedAnswers'] if agrees else None,'independentImageReading':observed['reading'],
                    'bodyNumberProof':row['bodyNumberProof'],'method':'NATIVE_PLUS_INDEPENDENT_QWEN_CROP',
                    'keyEvidenceSha256':observed['evidenceSha256'],**{k:v for k,v in observed.items() if k!='reading'},
                    'teacherApproved':False,'questionBankWrites':0}
                decisions[sha]=decision;save('RUNNING')
                print(f'Full printed-key vision: {len(decisions)}/{len(cases)} {row["exam"]} {row["course"]}: {decision["status"]}',flush=True)
            if source_signature(read_json(source))!=evidence_signature:raise ValueError('Supported key source evidence changed during independent visual reading')
            save('COMPLETE' if len(decisions)==len(cases) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(output).items() if k!='results'})


if __name__=='__main__':main()
