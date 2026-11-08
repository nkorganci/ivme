"""Independently challenge local topic suggestions against their actual PDF quote."""
import argparse
from collections import Counter
import json
from pathlib import Path
import sys
import time

import pymupdf
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_anahtar_pilotu import api
from yks_konu_icerik_incele import stem_lines

APP=Path(__file__).resolve().parents[1]
MODEL='gpt-oss:20b'
INSTRUCTION=('Bir konu eşlemesi adayını bağımsız denetle. Soruyu çözme, cevap harfi üretme. '
    'Yalnız verilen gerçek soru kökü, kayıtlı konu başlığı ve gerçek konu PDF alıntısına dayan. '
    'Öneriyi doğru kabul etme; konu kimliğinin varlığı veya bir alıntı gösterilmesi anlamsal doğruluk kanıtı değildir. '
    'Alıntı sorunun DOĞRUDAN ölçtüğü konuya dayanak veriyor mu? Başka bir konuyu anlatıyorsa CONFLICT; '
    'ilişki dolaylı, kapsam fazla geniş veya eksikse INSUFFICIENT; açıkça aynı kapsamı destekliyorsa SUPPORTED. '
    'Gerekçede yalnız sağlanan metinleri karşılaştır, dışarıdan bilgi ekleme. '
    'questionLineId ve topicLineId kararına dayanak olan gerçek satır kimlikleri olsun; kanıt yoksa null. '
    'Bu makine denetimidir, öğretmen onayı değildir.')
SCHEMA={'type':'object','properties':{'verdict':{'type':'string','enum':['SUPPORTED','CONFLICT','INSUFFICIENT']},
    'questionLineId':{'type':['integer','null'],'minimum':1},'topicLineId':{'type':['integer','null'],'minimum':1},
    'reason':{'type':'string'}},'required':['verdict','questionLineId','topicLineId','reason'],'additionalProperties':False}
OPTIONS={'num_ctx':4096,'num_predict':900,'temperature':0,'num_gpu':0}


def validate(value,question_lines,topic_lines):
    if set(value)!=set(SCHEMA['required']) or value['verdict'] not in SCHEMA['properties']['verdict']['enum']:
        raise ValueError('Semantic verifier schema differs')
    if not isinstance(value['reason'],str) or not value['reason'].strip():raise ValueError('Actual content reason required')
    if value['verdict']!='INSUFFICIENT' and any(value[k] is None for k in ['questionLineId','topicLineId']):
        raise ValueError('A supported/conflicting claim requires both original text lines')
    for key,lines in [('questionLineId',question_lines),('topicLineId',topic_lines)]:
        if value[key] is not None and (type(value[key]) is not int or not 1<=value[key]<=len(lines)):
            raise ValueError('Semantic evidence line does not exist')
    return {**value,'questionEvidence':question_lines[value['questionLineId']-1] if value['questionLineId'] else None,
        'topicEvidence':topic_lines[value['topicLineId']-1] if value['topicLineId'] else None}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject',default='din')
    parser.add_argument('--limit',type=int);parser.add_argument('--code',action='append');parser.add_argument('--scope',choices=['pilot','full'],default='pilot');args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/('full-question-topics' if args.scope=='full' else 'question-topics')/args.subject
    source=folder/'content-topic-review.json';report=read_json(source);retrieval=read_json(folder/'topic-candidates.json')
    if report['retrievalSha256']!=digest(folder/'topic-candidates.json'):raise ValueError('Topic retrieval changed')
    tree_path=next(root/a['path'] for a in state['stages']['YKS-04:full']['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    if digest(tree_path)!=retrieval['providerTreeSha256']:raise ValueError('MEBI registered topic tree changed')
    topics={t['categoryId']:t for c in read_json(tree_path)['navigation'] for u in c['units'] for t in u['topics']}
    from yks_konu_girdileri import load_bound_cards
    cards=load_bound_cards(retrieval)
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    selected=[r for r in report['results'] if not args.code or r['sourceCode'] in args.code]
    cache=folder/'semantic-readings';cache.mkdir(exist_ok=True);results=[];calls=0
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        write_json(folder/'semantic-topic-review.json',{'status':status,'scope':'INDEPENDENT_LOCAL_TOPIC_CONTENT_CHALLENGE',
            'model':MODEL,'modelDigest':model['digest'],'inputReviewSha256':digest(source),'toolSha256':digest(Path(__file__)),
            'newModelCallsThisPass':calls,'pendingQuestions':len(selected)-len(results),
            'states':dict(Counter(r['status'] for r in results)),'results':results,
            'questionBankWrites':0,'categoryAssignmentsWritten':0,'teacherApproved':False})
    with process_lock(folder/'.semantic-writer.lock'),ModelLease(role='yks-topic-independent-content',model=MODEL):
        try:
            save('RUNNING')
            for row in selected:
                code=row['sourceCode'];card=cards[code];suggestion=row['suggestion']
                if not suggestion or not suggestion.get('categoryId'):
                    results.append({'sourceCode':code,'status':'MISSING_SOURCE_TOPIC_REVIEW_REQUIRED'});continue
                if card['textSha256']!=row['sourceTextSha256'] or digest(card['image'])!=row['sourceImageSha256']:
                    raise ValueError('Source question changed')
                topic=topics[suggestion['categoryId']];proof=suggestion['topicEvidence']
                if digest(proof['sourcePath'])!=proof['sourceSha256']:raise ValueError('Topic PDF changed')
                with pymupdf.open(proof['sourcePath']) as doc:text=doc[proof['page']-1].get_text(sort=True)
                if proof['quote'] not in text:raise ValueError('Topic quote is not in the actual source PDF')
                if topic['subjectId']!=card['subjectId'] or topic['sourceExam']!=card['exam'] or not any(
                    a['sourceSha256']==proof['sourceSha256'] for a in topic['assets']):raise ValueError('Wrong topic source association')
                question_lines=stem_lines(card);topic_lines=[line.strip() for line in proof['quote'].splitlines() if line.strip()]
                prompt=INSTRUCTION+'\nKAYITLI KONU: '+topic['unit']+' / '+topic['title']+'\nSORU KÖKÜ SATIRLARI:\n'+json.dumps(
                    [{'id':i+1,'text':s} for i,s in enumerate(question_lines)],ensure_ascii=False)+'\nGERÇEK KONU PDF ALINTISI SATIRLARI:\n'+json.dumps(
                    [{'id':i+1,'text':s} for i,s in enumerate(topic_lines)],ensure_ascii=False)
                identity={'modelDigest':model['digest'],'prompt':prompt,'schema':SCHEMA,'options':OPTIONS,'think':'low',
                    'sourceTextSha256':card['textSha256'],'topicPdfSha256':proof['sourceSha256'],'topicQuoteSha256':signature(proof['quote'])}
                path=cache/(signature(identity)+'.json')
                if path.is_file():
                    evidence=read_json(path)
                    if evidence['identity']!=identity:raise ValueError('Semantic cache identity differs')
                    response=evidence['response'];hit=True
                else:
                    if args.limit is not None and calls>=args.limit:break
                    for active in api('/api/ps').get('models',[]):
                        if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                    started=time.monotonic();response=api('/api/generate',{'model':MODEL,'prompt':prompt,'format':SCHEMA,
                        'stream':False,'think':'low','keep_alive':'5m','options':OPTIONS},timeout=1200)
                    write_json(path,{'identity':identity,'response':response,'seconds':round(time.monotonic()-started,2)});hit=False;calls+=1
                value=None;error=None
                try:
                    if response.get('done') is not True or response.get('done_reason')=='length':raise ValueError('Semantic response incomplete')
                    value=validate(json.loads(response['response']),question_lines,topic_lines)
                    status='INDEPENDENT_TOPIC_'+value['verdict']
                except (ValueError,KeyError,TypeError) as exc:status='SEMANTIC_RESPONSE_REVIEW_REQUIRED';error=str(exc)
                results.append({'sourceCode':code,'categoryId':suggestion['categoryId'],'status':status,'reading':value,
                    'validationError':error,'evidencePath':str(path),'evidenceSha256':digest(path),'cacheHit':hit,'teacherApproved':False})
                save('RUNNING');print(f'Independent topic check: {len(results)}/{len(selected)} {code}: {status}',flush=True)
            save('COMPLETE' if len(results)==len(selected) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'semantic-topic-review.json').items() if k!='results'})


if __name__=='__main__':main()
