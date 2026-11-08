"""Independently transcribe printed key crops; expected answers never enter a prompt.

The model reads a printed source, never solves questions. Disagreement, blanks,
duplicate numbers and truncation remain excluded until a source-bound review.
"""
import argparse
import base64
from collections import Counter
import json
from pathlib import Path
import sys
import time

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_anahtar_pilotu import api,MODEL

APP=Path(__file__).resolve().parents[1]
PROMPT=('Bu görsel basılı cevap anahtarının küçük kırpımıdır. Yalnız görünen soru numarası ile yanındaki '
        'A/B/C/D/E harfini aynen yaz. Soruları çözme ve eksik cevabı tahmin etme. Harfsiz boş şablon '
        'hücrelerini answers listesine ekleme. Bütün dolu hücreleri oku; başlıktaki test numarası cevap değildir. '
        'Okuyamadığın dolu hücre varsa incomplete=true yaz. Yalnız JSON üret.')
SCHEMA={'type':'object','properties':{'incomplete':{'type':'boolean'},'answers':{'type':'array','maxItems':200,
    'items':{'type':'object','properties':{'number':{'type':'integer','minimum':1,'maximum':200},
    'answer':{'type':'string','enum':list('ABCDE')}},'required':['number','answer'],'additionalProperties':False}}},
    'required':['incomplete','answers'],'additionalProperties':False}
OPTIONS={'num_ctx':4096,'num_predict':2400,'temperature':0}


def checked_reading(response):
    if response.get('done') is not True or response.get('done_reason')=='length':raise ValueError('Truncated/incomplete model response')
    value=json.loads(response['response'])
    if value.get('incomplete') is not False:raise ValueError('Printed source reading incomplete')
    rows=value.get('answers')
    if not isinstance(rows,list) or not rows:raise ValueError('No printed answers read')
    seen=set()
    for row in rows:
        if set(row)!={'number','answer'} or type(row['number']) is not int or not 1<=row['number']<=200:
            raise ValueError('Invalid source number')
        if row['number'] in seen:raise ValueError('Duplicated source number')
        if row['answer'] not in list('ABCDE'):raise ValueError('Invalid source answer letter')
        seen.add(row['number'])
    return sorted(rows,key=lambda row:row['number'])


def transcription(model,crop,folder):
    data=crop.read_bytes();crop_sha=digest(crop)
    identity={'model':MODEL,'modelDigest':model['digest'],'prompt':PROMPT,'schema':SCHEMA,
        'options':OPTIONS,'cropSha256':crop_sha,'protocol':'printed-key-image-transcription-v1'}
    file=folder/(signature(identity)+'.json')
    if file.is_file():
        evidence=read_json(file)
        if evidence.get('identity')!=identity:raise ValueError('Visual key cache identity mismatch')
        response=evidence['response'];cached=True
    else:
        started=time.monotonic()
        response=api('/api/generate',{'model':MODEL,'prompt':PROMPT,
            'images':[base64.b64encode(data).decode()],'format':SCHEMA,'stream':False,'think':False,
            'keep_alive':'5m','options':OPTIONS},timeout=900)
        evidence={'identity':identity,'response':response,'wallSeconds':round(time.monotonic()-started,2)}
        write_json(file,evidence);cached=False
    if digest(crop)!=crop_sha:raise ValueError('Printed source crop changed during reading')
    try:reading=checked_reading(response);error=None
    except (ValueError,TypeError,KeyError) as exc:reading=None;error=str(exc)
    return {'reading':reading,'error':error,'cacheHit':cached,'evidencePath':str(file),'evidenceSha256':digest(file),
        'cropSha256':crop_sha,'modelDigest':model['digest']}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int)
    args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/pdf-on-tarama/key-cohort')
    source_file=folder/'cohort-report.json';source_sha=digest(source_file);cohort=read_json(source_file)
    output=folder/'visual-resolution-report.json';prior=read_json(output) if output.is_file() else {}
    if prior.get('sourceCohortSha256') not in (None,source_sha):raise ValueError('Cohort input changed; reconcile prior visual decisions')
    decisions={row['sourceSha256']:row for row in prior.get('results',[])}
    models=api('/api/tags')['models'];model=next(m for m in models if m['name']==MODEL)
    if 'vision' not in api('/api/show',{'model':MODEL}).get('capabilities',[]):raise ValueError('Installed model has no vision capability')
    cases=[]
    for row in cohort['results']:
        if row['status']=='TWO_PRINTED_SOURCE_READINGS_AGREE':continue
        if row['status']=='UNSUPPORTED_KEY_LAYOUT_REVIEW_REQUIRED':continue
        cases.append(row)
    # Input/cache identity checks happen even on an all-reused pass.
    sys.path.insert(0,str(APP.parent/'pipeline'))
    from model_runtime import ModelLease
    calls=0
    def save(status):
        report={'status':status,'scope':'PRINTED_SOURCE_KEY_TRANSCRIPTION_RESOLUTION','sourceCohortSha256':source_sha,
            'toolSha256':digest(Path(__file__)),'model':MODEL,'modelDigest':model['digest'],
            'states':dict(Counter(row['status'] for row in decisions.values())),
            'newModelCallsThisPass':calls,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,
            'results':list(decisions.values()),'pendingDocuments':len(cases)-len(decisions)}
        write_json(output,report)
    with process_lock(folder/'.visual-writer.lock'):
        save('RUNNING')
        with ModelLease(role='yks-printed-key-cohort',model=MODEL):
            try:
                for row in cases:
                    crop=Path(row['cropPath'])
                    if digest(crop)!=row['cropSha256'] or digest(row['sourcePath'])!=row['sourceSha256']:
                        raise ValueError('Printed source or crop differs from original cohort evidence')
                    cache_folder=folder/row['sourceSha256']/'vision';cache_folder.mkdir(exist_ok=True)
                    cache_id=signature({'model':MODEL,'modelDigest':model['digest'],'prompt':PROMPT,'schema':SCHEMA,
                        'options':OPTIONS,'cropSha256':row['cropSha256'],'protocol':'printed-key-image-transcription-v1'})
                    cached=(cache_folder/(cache_id+'.json')).is_file()
                    if not cached and args.limit is not None and calls>=args.limit:break
                    if not cached:
                        for active in api('/api/ps').get('models',[]):
                            if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                    observed=transcription(model,crop,cache_folder)
                    calls+=not observed['cacheHit']
                    agrees=observed['reading']==row['nativePrintedAnswers']
                    decisions[row['sourceSha256']]={'sourceSha256':row['sourceSha256'],'sourceKeyPage':row['sourceKeyPage'],
                        'exam':row['exam'],'course':row['course'],'sourceCropPath':str(crop),
                        'status':'SOURCE_TEXT_AND_IMAGE_AGREE' if agrees else 'IMAGE_READING_REQUIRES_SOURCE_REVIEW',
                        'nativePrintedAnswers':row['nativePrintedAnswers'],'independentImageReading':observed['reading'],
                        **{k:v for k,v in observed.items() if k!='reading'},
                        'acceptedSourceAnswers':row['nativePrintedAnswers'] if agrees else None,
                        'questionNumbersComplete':row['questionNumbersComplete'],'teacherApproved':False}
                    save('RUNNING')
                    print(f'Visual key: {len(decisions)}/{len(cases)} {row["exam"]} {row["course"]}: {decisions[row["sourceSha256"]]["status"]}',flush=True)
                if digest(source_file)!=source_sha:raise ValueError('Cohort input changed during visual reading')
                save('COMPLETE' if len(decisions)==len(cases) else 'PARTIAL')
            except BaseException:
                save('INTERRUPTED');raise
            finally:
                api('/api/generate',{'model':MODEL,'keep_alive':0})
    print(json.dumps({k:v for k,v in read_json(output).items() if k!='results'}))


if __name__=='__main__':main()
