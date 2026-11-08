"""Evaluate image-based local topic suggestions on three actually reviewed questions.

Registered competing topics and original PDF quotes are supplied. Expected
answers and the reviewer category never enter the prompt. This small diagnostic
cannot validate a whole subject or publish categories/questions.
"""
import base64
from collections import Counter
import json
import re
from pathlib import Path
import sys
import time

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_soru_pilotu import APP
from yks_anahtar_pilotu import api,MODEL
from yks_konu_girdileri import load_bound_cards
from yks_konu_icerik_incele import topic_snippets

INSTRUCTION=('Özgün soru GÖRSELİNİ ve gerçek MEBİ konu PDF alıntılarını karşılaştır. '
 'Ölçülen beceriyi esas alarak en dar kayıtlı konuyu seç. Deneyin adı veya yalnız bir malzeme adı konu belirlemez. '
 'Şekillerdeki araçları, bütün soru kökünü ve seçenekleri görselden oku; soruyu çözme, doğru cevap veya harf üretme. '
 'categoryId yalnız izinli listeden olabilir; yetersizse null. topicEvidenceSnippetId seçilen konunun gerçek alıntısı olsun. '
 'Konu başlığının genel çağrışımı yeterli değildir, alıntı ölçülen beceriyi doğrudan desteklemeli. '
 'reason yalnız konu ilişkisini ve görseldeki ölçülen beceriyi açıklasın. Bu makine adayıdır, öğretmen kararı değildir.')
OPTIONS={'num_ctx':8192,'num_predict':700,'temperature':0}


def schema(allowed):
    return {'type':'object','properties':{'categoryId':{'type':['string','null'],'enum':[None,*allowed]},
        'topicEvidenceSnippetId':{'type':['integer','null'],'minimum':1},'reason':{'type':'string'},
        'needsReview':{'type':'boolean'}},'required':['categoryId','topicEvidenceSnippetId','reason','needsReview'],'additionalProperties':False}


def validate(value,contexts):
    if set(value)!=set(schema([])['required']) or type(value['needsReview']) is not bool or not isinstance(value['reason'],str) or not value['reason'].strip():
        raise ValueError('Complete image-topic candidate schema required')
    if re.search(r'(?:doğru\s+(?:cevap|yanıt|seçenek)\s*[:=]?\s*[A-E]\b|(?:[A-E])\s+(?:şıkkı|seçeneği))',value['reason'],re.I):
        raise ValueError('Topic-only model response contains an unsolicited answer choice; no category admission')
    if value['categoryId'] is None:
        if value['topicEvidenceSnippetId'] is not None or value['needsReview'] is not True:raise ValueError('Unresolved image topic cannot claim a source quote')
        return {**value,'topicEvidence':None}
    topic=next((c for c in contexts if c['categoryId']==value['categoryId']),None)
    if topic is None:raise ValueError('Unregistered source image topic')
    number=value['topicEvidenceSnippetId']
    proof=next((p for p in topic['sourceSnippets'] if type(number) is int and p['id']==number),None)
    if proof is None:raise ValueError('Source image topic quote belongs to another topic or is absent')
    return {**value,'topicEvidence':proof}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'kimya-topic-vision-pilot';folder.mkdir(exist_ok=True)
    reference_path=root/'kimya-topic-pilot-actual/report.json';reference=read_json(reference_path)
    if reference['status']!='PASS' or reference['questions']!=3:raise ValueError('Three actual source image review records required')
    retrieval_path=root/'full-question-topics/kimya/topic-candidates.json';retrieval=read_json(retrieval_path);cards=load_bound_cards(retrieval)
    tree_path=next(root/a['path'] for a in state['stages']['YKS-04:full']['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    if digest(tree_path)!=retrieval['providerTreeSha256']:raise ValueError('Registered MEBI source tree changed')
    nodes={t['categoryId']:t for c in read_json(tree_path)['navigation'] for u in c['units'] for t in u['topics']}
    choices={r['sourceCode']:r for r in retrieval['results']};pdf_cache={};results=[];calls=0
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    if 'vision' not in api('/api/show',{'model':MODEL}).get('capabilities',[]):raise ValueError('Installed source model has no image capability')
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        write_json(folder/'report.json',{'status':status,'scope':'THREE_ACTUALLY_REVIEWED_IMAGE_TOPIC_DIAGNOSTIC_NOT_GENERAL_SUBJECT_ACCEPTANCE',
            'actualReferenceSha256':digest(reference_path),'retrievalSha256':digest(retrieval_path),'toolSha256':digest(Path(__file__)),
            'model':MODEL,'modelDigest':model['digest'],'questions':3,'completed':len(results),'pending':3-len(results),
            'newModelCallsThisPass':calls,'states':dict(Counter(r['status'] for r in results)),
            'agreesWithActualSourceReview':sum(r['agreesWithActualSourceReview'] for r in results),
            'results':results,'categoryAssignmentsWritten':0,'questionBankWrites':0,'teacherApproved':False})
    with process_lock(folder/'.writer.lock'),ModelLease(role='yks-three-source-topic-image-pilot',model=MODEL):
        try:
            save('RUNNING')
            for reviewed in reference['results']:
                code=reviewed['sourceCode'];card=cards[code]
                if digest(card['image'])!=reviewed['sourceImageSha256']:raise ValueError('Actually reviewed source image changed')
                options=choices[code]['candidates'];contexts=[]
                # The same deterministic retrieval shortlist is used, rather
                # than inserting only the reviewer preferred answer category.
                for choice in options:
                    node=nodes[choice['categoryId']]
                    if node['subjectId']!=card['subjectId'] or node['sourceExam']!=card['exam']:raise ValueError('Wrong exam/subject topic candidate')
                    snippets=topic_snippets(node,card,pdf_cache)
                    contexts.append({k:choice[k] for k in ['categoryId','unit','title']}|{'sourceSnippets':snippets})
                allowed=[c['categoryId'] for c in contexts];format_schema=schema(allowed)
                prompt_contexts=[{k:c[k] for k in ['categoryId','unit','title']}|{'sourceSnippets':[
                    {'id':s['id'],'page':s['page'],'text':s['quote']} for s in c['sourceSnippets']]} for c in contexts]
                prompt=INSTRUCTION+'\nSINAV: '+card['exam']+'\nDERS: '+card['subject']+'\nKONU PDF ALINTILARI:\n'+json.dumps(prompt_contexts,ensure_ascii=False)
                identity={'modelDigest':model['digest'],'prompt':prompt,'schema':format_schema,'options':OPTIONS,
                    'sourceImageSha256':card['imageSha256'],'sourceTextSha256':card['textSha256'],'topicContextsSha256':signature(contexts)}
                cache=folder/(signature(identity)+'.json')
                if cache.is_file():
                    raw=read_json(cache)
                    if raw['identity']!=identity:raise ValueError('Image model observation cache changed')
                    response=raw['response'];hit=True
                else:
                    started=time.monotonic();response=api('/api/generate',{'model':MODEL,'prompt':prompt,
                        'images':[base64.b64encode(Path(card['image']).read_bytes()).decode()],'format':format_schema,
                        'stream':False,'think':False,'keep_alive':'5m','options':OPTIONS},timeout=900)
                    write_json(cache,{'identity':identity,'response':response,'topicContexts':contexts,'seconds':round(time.monotonic()-started,2)})
                    calls+=1;hit=False
                value=None;issue=None
                try:
                    if response.get('done') is not True or response.get('done_reason')=='length':raise ValueError('Image topic response incomplete')
                    value=validate(json.loads(response['response']),contexts)
                except (ValueError,KeyError,TypeError) as exc:issue=str(exc)
                agrees=bool(value and value['categoryId']==reviewed['proposedCategoryId'])
                results.append({'sourceCode':code,'sourceImageSha256':card['imageSha256'],'status':'IMAGE_TOPIC_CANDIDATE_AGREES_WITH_ACTUAL_SOURCE_REVIEW' if agrees else 'IMAGE_TOPIC_RESPONSE_OR_SCOPE_REVIEW_REQUIRED',
                    'suggestion':value,'validationError':issue,'evidencePath':str(cache),'evidenceSha256':digest(cache),
                    'agreesWithActualSourceReview':agrees,'cacheHit':hit,'fineTopicAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False})
                save('RUNNING');print(code,results[-1]['status'],flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in read_json(folder/'report.json').items() if k!='results'})


if __name__=='__main__':main()
