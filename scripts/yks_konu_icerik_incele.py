"""Source-grounded local topic suggestions; all results remain machine candidates."""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import sys
import time
import unicodedata
import hashlib

import pymupdf

from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_anahtar_pilotu import api,MODEL

APP=Path(__file__).resolve().parents[1]
INSTRUCTION=('Kaynak sorunun konu kapsamını sınıflandır. Soruyu çözme ve doğru cevap üretme. '
    'Yalnız izinli konu kimliklerinden, soru KÖKÜNÜN doğrudan ölçtüğü en dar konuyu seç. '
    'Sadece yanlış seçeneklerde geçen sözcüklerle konu seçme. Kaynak kökünden aynen kısa bir evidenceQuote al. '
    'İzinli konulardan hiçbiri uymuyorsa categoryId=null ve needsReview=true yaz. '
    'Birden fazla farklı kapsam varsa veya yalnız görsel okunarak karar verilebiliyorsa needsReview=true yaz. '
    'Bir anahtar kelimenin varlığı tek başına onay değildir. Bu sonuç otomatik adaydır, öğretmen kararı değildir.')
SCHEMA={'type':'object','properties':{'categoryId':{'type':['string','null']},'evidenceQuote':{'type':'string'},
    'reason':{'type':'string'},'needsReview':{'type':'boolean'}},'required':['categoryId','evidenceQuote','reason','needsReview'],
    'additionalProperties':False}
OPTIONS={'num_ctx':8192,'num_predict':500,'temperature':0}
LINE_INSTRUCTION=('Kaynak sorunun doğrudan ölçtüğü en dar kayıtlı konuyu seç; soruyu çözme, doğru seçenek veya çözüm yazma. '
    'Yalnız izinli categoryId kullan. Yanlış seçeneklerde geçen sözcükler konu kanıtı değildir. '
    'Kanıt olarak KAYNAK KÖKÜ SATIRLARI listesinden tam bir evidenceLineIds kimliği seç; metni yeniden yazma. '
    'Uygun konu veya yeterli kaynak kanıtı yoksa categoryId=null, evidenceLineIds=[] ve needsReview=true döndür. '
    'reason sadece sorunun ölçtüğü konu kapsamını açıklasın. Bu bir makine adayıdır, öğretmen onayı değildir.')
LINE_SCHEMA={'type':'object','properties':{'categoryId':{'type':['string','null']},
    'evidenceLineIds':{'type':'array','maxItems':1,'items':{'type':'integer','minimum':1}},
    'reason':{'type':'string'},'needsReview':{'type':'boolean'}},
    'required':['categoryId','evidenceLineIds','reason','needsReview'],'additionalProperties':False}

DOCUMENT_INSTRUCTION=('Sorunun ölçtüğü en dar MEBİ konusunu belirle. Soruyu çözme, doğru cevap veya seçenek üretme. '
    'Konu başlıkları alt kavramları da kapsar; soru ile başlığın kelimesi kelimesine aynı olması gerekmez. '
    'Her izinli konunun gerçek MEBİ PDF alıntılarını oku; soru kökü ve konu PDF içeriği birlikte kararın dayanağıdır. '
    'Yanlış seçeneklerde geçen sözcükleri kanıt sayma. categoryId yalnız izinli listeden seçilir. '
    'questionEvidenceLineId soru kökünden, topicEvidenceSnippetId seçilen konunun PDF alıntılarından birer kimlik olmalı. '
    'Birden fazla konu doğrudan ölçülüyorsa needsReview=true yaz. Hiçbiri kapsamı karşılamıyorsa kimlikleri null ve needsReview=true yaz. '
    'reason yalnız konu ilişkisini anlatsın; cevap harfi yazma. Bu makine adayıdır; öğretmen onayı değildir.')
DOCUMENT_SCHEMA={'type':'object','properties':{'categoryId':{'type':['string','null']},
    'questionEvidenceLineId':{'type':['integer','null'],'minimum':1},
    'topicEvidenceSnippetId':{'type':['integer','null'],'minimum':1},
    'reason':{'type':'string'},'needsReview':{'type':'boolean'}},
    'required':['categoryId','questionEvidenceLineId','topicEvidenceSnippetId','reason','needsReview'],
    'additionalProperties':False}


def document_schema(allowed):
    schema=json.loads(json.dumps(DOCUMENT_SCHEMA))
    schema['properties']['categoryId']['enum']=[None]+[c['categoryId'] for c in allowed]
    return schema


def content_words(text):
    return set(re.findall(r'[a-zçğıöşü]{3,}',text.lower().replace('i\u0307','i')))-{
        'bir','olan','olarak','için','ile','ise','hem','her','gibi','daha','çok','kadar','göre','hangi',
        'aşağıdaki','aşağıdakilerden','ilgili','sadece','yalnız','buna','bunu','onun','insan','allah'}


def topic_snippets(node,card,pdf_cache):
    """Select exact native PDF spans. No model-produced topic description is evidence."""
    terms=content_words(' '.join(stem_lines(card)));spans=[]
    for asset in node.get('assets',[]):
        if asset['kind']!='pdf':continue
        sha=asset['sourceSha256'];source=Path(asset['originalPath'])
        if sha not in pdf_cache:
            if digest(source)!=sha:raise ValueError('MEBI topic PDF changed')
            pages=[]
            with pymupdf.open(source) as document:
                for index,page in enumerate(document):
                    text=page.get_text(sort=True)
                    pages.append({'page':index+1,'text':text,
                        'nativeTextSha256':hashlib.sha256(text.encode()).hexdigest()})
            pdf_cache[sha]={'sourcePath':str(source),'pages':pages}
        for page in pdf_cache[sha]['pages']:
            text=page['text'];start=0
            while start<len(text):
                end=min(start+550,len(text))
                if end<len(text):
                    newline=text.rfind('\n',start+250,end)
                    if newline>start:end=newline
                quote=text[start:end].strip()
                if len(quote)>=40:
                    words=content_words(quote);score=sum(len(term) for term in terms&words)
                    spans.append({'sourceSha256':sha,'sourcePath':str(source),'page':page['page'],
                        'nativeTextSha256':page['nativeTextSha256'],'quote':quote,'score':score})
                start=end
    selected=sorted(spans,key=lambda s:(-s['score'],s['sourceSha256'],s['page']))[:2]
    return [{'id':i+1,**s} for i,s in enumerate(selected)]


def validate_document_choice(value,card,allowed,lines,contexts):
    if set(value)!=set(DOCUMENT_SCHEMA['required']):raise ValueError('Document topic response schema differs')
    identity=value['categoryId'];line=value['questionEvidenceLineId'];snippet=value['topicEvidenceSnippetId']
    if identity is None:
        if line is not None or snippet is not None:raise ValueError('Unresolved topic cannot claim source evidence')
        resolved={'categoryId':None,'evidenceQuote':'','reason':value['reason'],'needsReview':value['needsReview']}
        return validate_choice(resolved,card,allowed),resolved
    if type(line) is not int or not 1<=line<=len(lines):raise ValueError('Question evidence line does not exist')
    selected=next((c for c in contexts if c['categoryId']==identity),None)
    proof=next((p for p in selected['sourceSnippets'] if type(snippet) is int and p['id']==snippet),None) if selected else None
    if proof is None:raise ValueError('Topic PDF evidence is missing or belongs to another topic')
    resolved={'categoryId':identity,'evidenceQuote':lines[line-1],
        'reason':value['reason'],'needsReview':value['needsReview']}
    status=validate_choice(resolved,card,allowed)
    return status,{**resolved,'questionEvidenceLineId':line,'topicEvidence':proof}


def reusable_document_reading(cache,model_digest,card,allowed,lines,contexts):
    """A larger retrieval list does not invalidate an already source-bound reading."""
    for path in sorted(cache.glob('*.json')):
        record=read_json(path);identity=record.get('identity',{})
        schema=json.loads(json.dumps(identity.get('schema',{})))
        if 'categoryId' in schema.get('properties',{}):schema['properties']['categoryId'].pop('enum',None)
        if identity.get('modelDigest')!=model_digest or schema!=DOCUMENT_SCHEMA or identity.get('options')!=OPTIONS:
            continue
        if path.stem!=signature(identity):raise ValueError('Cached topic identity signature differs')
        if identity.get('sourceTextSha256')!=card['textSha256'] or identity.get('sourceImageSha256')!=card['imageSha256']:continue
        response=record.get('response',{})
        if response.get('done') is not True or response.get('done_reason')=='length':continue
        try:
            value=json.loads(response['response'])
            if value.get('categoryId') is None:continue
            previous=record.get('topicContexts')
            if previous is None:
                previous=json.loads(identity['prompt'].split('\nİZİNLİ KONULAR VE PDF ALINTILARI:\n',1)[1].split('\nKAYNAK KÖKÜ SATIRLARI:\n',1)[0])
            status,resolved=validate_document_choice(value,card,allowed,lines,previous)
            current=next(c for c in contexts if c['categoryId']==value['categoryId'])
            if resolved['topicEvidence'] not in current['sourceSnippets']:continue
        except (ValueError,KeyError,TypeError,StopIteration,IndexError):continue
        return path,status,resolved
    return None


def normalize(text):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',text)).strip()


def validate_choice(value,card,allowed):
    if set(value)!={'categoryId','evidenceQuote','reason','needsReview'} or type(value['needsReview']) is not bool:
        raise ValueError('Topic response schema differs')
    if not isinstance(value['reason'],str) or not value['reason'].strip():raise ValueError('Source-grounded topic reason required')
    identity=value['categoryId']
    if identity is None:
        if not value['needsReview']:raise ValueError('Missing topic must remain under review')
        return 'NO_SUITABLE_REGISTERED_TOPIC_REVIEW_REQUIRED'
    selected=next((c for c in allowed if c['categoryId']==identity),None)
    if selected is None or selected['subjectId']!=card['subjectId'] or selected['sourceExam']!=card['exam']:
        raise ValueError('Proposed topic is outside registered question exam/subject scope')
    stem=re.split(r'(?:^|\s)A\s*\)',card['text'],maxsplit=1)[0]
    quote=value['evidenceQuote']
    if not isinstance(quote,str) or len(quote.strip())<12 or normalize(quote) not in normalize(stem):
        raise ValueError('Topic evidence is not an exact quotation from the source stem')
    if value['needsReview'] or card['containsGraphics'] or card['reviewConcerns']:
        return 'MACHINE_TOPIC_CANDIDATE_WITH_OPEN_SOURCE_REVIEW'
    return 'MACHINE_TOPIC_CANDIDATE_SOURCE_QUOTE_BOUND'


def stem_lines(card):
    stem=re.split(r'(?:^|\s)A\s*\)',card['text'],maxsplit=1)[0]
    return [line.strip() for line in stem.splitlines() if len(line.strip())>=12]


def validate_line_choice(value,card,allowed,lines):
    if set(value)!={'categoryId','evidenceLineIds','reason','needsReview'}:raise ValueError('Source line response schema differs')
    ids=value['evidenceLineIds']
    if not isinstance(ids,list) or any(type(i) is not int or not 1<=i<=len(lines) for i in ids):
        raise ValueError('Source evidence line ID does not exist')
    if value['categoryId'] is not None and len(ids)!=1:raise ValueError('One exact source stem line is required')
    if value['categoryId'] is None and ids:raise ValueError('Unresolved topic cannot cite a made-up association')
    resolved={'categoryId':value['categoryId'],'evidenceQuote':lines[ids[0]-1] if ids else '',
        'reason':value['reason'],'needsReview':value['needsReview']}
    return validate_choice(resolved,card,allowed),{**resolved,'evidenceLineIds':ids}


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--subject',default='din');parser.add_argument('--limit',type=int)
    args=parser.parse_args()
    if args.limit is not None and args.limit<1:parser.error('Positive limit required')
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    folder=root/'question-topics'/args.subject;file=folder/'topic-candidates.json';retrieval=read_json(file)
    if retrieval['subject']!=args.subject:raise ValueError('Source retrieval scope differs')
    cards={}
    for name,sha in retrieval['questionPackages'].items():
        if digest(name)!=sha:raise ValueError('Source topic question package changed')
        cards.update({c['code']:c for c in read_json(name)['cards']})
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    cache=folder/'content-readings';cache.mkdir(exist_ok=True);results=[];calls=0
    tree=state['stages']['YKS-04:full']
    tree_file=next(root/a['path'] for a in tree['artifacts'] if a['path'].endswith('navigation-candidate.json'))
    if digest(tree_file)!=retrieval['providerTreeSha256']:raise ValueError('Registered MEBI tree changed')
    nodes={t['categoryId']:t for c in read_json(tree_file)['navigation'] for u in c['units'] for t in u['topics']}
    pdf_cache={}
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    def save(status):
        report={'status':status,'scope':'LOCAL_SOURCE_TOPIC_CONTENT_SUGGESTIONS_ONLY','model':MODEL,'modelDigest':model['digest'],
            'retrievalSha256':digest(file),'toolSha256':digest(Path(__file__)),'newModelCallsThisPass':calls,
            'states':dict(Counter(r['status'] for r in results)),'pendingQuestions':len(retrieval['results'])-len(results),
            'categoryAssignmentsWritten':0,'teacherApproved':False,'questionBankWrites':0,'results':results}
        write_json(folder/'content-topic-review.json',report)
    with process_lock(folder/'.content-writer.lock'),ModelLease(role='yks-source-topic-content',model=MODEL):
        try:
            save('RUNNING')
            for entry in retrieval['results']:
                card=cards[entry['sourceCode']]
                if card['textSha256']!=entry['sourceTextSha256'] or digest(card['image'])!=entry['sourceImageSha256']:
                    raise ValueError('Source topic text/image evidence differs')
                allowed=[c for c in entry['candidates'] if c['sourceExam']==card['exam']]
                if not allowed:raise ValueError('No registered same-exam topic candidates')
                options=[{k:c[k] for k in ['categoryId','sourceExam','subjectId','unit','title']} for c in allowed]
                lines=stem_lines(card)
                contexts=[{**option,'sourceSnippets':topic_snippets(nodes[option['categoryId']],card,pdf_cache)} for option in options]
                schema=document_schema(allowed)
                prompt_contexts=[{k:c[k] for k in ['categoryId','unit','title']}|{'sourceSnippets':[
                    {'id':s['id'],'page':s['page'],'text':s['quote']} for s in c['sourceSnippets']]} for c in contexts]
                prompt=DOCUMENT_INSTRUCTION+'\nSINAV: '+card['exam']+'\nDERS: '+card['subject']+'\nİZİNLİ KONULAR VE PDF ALINTILARI:\n'+json.dumps(prompt_contexts,ensure_ascii=False)+'\nKAYNAK KÖKÜ SATIRLARI:\n'+json.dumps(
                    [{'id':i+1,'text':line} for i,line in enumerate(lines)],ensure_ascii=False)
                identity={'modelDigest':model['digest'],'prompt':prompt,'schema':schema,'options':OPTIONS,
                    'sourceTextSha256':card['textSha256'],'sourceImageSha256':card['imageSha256'],'topicContextsSha256':signature(contexts)}
                evidence_file=cache/(signature(identity)+'.json')
                reused=reusable_document_reading(cache,model['digest'],card,allowed,lines,contexts)
                if reused is not None:
                    evidence_file,status,value=reused;response=read_json(evidence_file)['response'];hit=True
                elif evidence_file.is_file():
                    evidence=read_json(evidence_file)
                    if evidence['identity']!=identity:raise ValueError('Topic model cache differs')
                    response=evidence['response'];hit=True
                else:
                    if args.limit is not None and calls>=args.limit:break
                    for active in api('/api/ps').get('models',[]):
                        if active['name']!=MODEL:api('/api/generate',{'model':active['name'],'keep_alive':0})
                    started=time.monotonic();response=api('/api/generate',{'model':MODEL,'prompt':prompt,'format':schema,
                        'stream':False,'think':False,'keep_alive':'5m','options':OPTIONS},timeout=900)
                    evidence={'identity':identity,'topicContexts':contexts,'response':response,'seconds':round(time.monotonic()-started,2)}
                    write_json(evidence_file,evidence);hit=False;calls+=1
                if reused is None:value=None
                try:
                    if response.get('done') is not True or response.get('done_reason')=='length':raise ValueError('Source topic response incomplete')
                    if reused is None:status,value=validate_document_choice(json.loads(response['response']),card,allowed,lines,contexts)
                    error=None
                except (ValueError,TypeError,KeyError) as exc:status='SOURCE_TOPIC_RESPONSE_REVIEW_REQUIRED';error=str(exc)
                results.append({'sourceCode':card['code'],'sourceTextSha256':card['textSha256'],'sourceImageSha256':card['imageSha256'],
                    'status':status,'suggestion':value,'validationError':error,'modelEvidencePath':str(evidence_file),
                    'modelEvidenceSha256':digest(evidence_file),'cacheHit':hit,'teacherApproved':False,'categoryAssignmentWritten':False})
                save('RUNNING');print(f'Topic source reading: {len(results)}/{len(retrieval["results"])} {card["code"]}: {status}',flush=True)
            save('COMPLETE' if len(results)==len(retrieval['results']) else 'PARTIAL')
        except BaseException:
            save('INTERRUPTED');raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    if any(digest(record['sourcePath'])!=sha for sha,record in pdf_cache.items()):raise ValueError('Topic source PDF changed during review')
    print(json.dumps({k:v for k,v in read_json(folder/'content-topic-review.json').items() if k!='results'}))


if __name__=='__main__':main()
