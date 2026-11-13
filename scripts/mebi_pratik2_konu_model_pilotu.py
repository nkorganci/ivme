"""Small local topic-proposal pilot on source-verified, text-only questions.

Model output remains a proposal for review. No publication, teacher approval,
new topic identity, original-bank lookup or question duplicate comparison.
"""
import argparse
import hashlib
import json
import time
from collections import defaultdict,Counter
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_genisletilmis_kabul import vision
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from mebi_pratik2_tek_tarama_konu import source_subject
from yks_birlestirme import write_json,process_lock

OUT=BASE/'controlled-topic-model-pilot'


def validate(value,categories,text):
    index=value.get('choice');quote=value.get('quote')
    if type(index) is not int or not 0<=index<len(categories):return None,'NO_VALID_CONTROLLED_CATEGORY'
    if value.get('uncertain') is not False:return None,'MODEL_UNCERTAIN'
    if not isinstance(quote,str) or len(quote.strip())<8 or ' '.join(quote.split()) not in ' '.join(text.split()):
        return None,'GROUNDING_QUOTE_NOT_IN_ORIGINAL_TEXT'
    return categories[index],'AI_TOPIC_CANDIDATE_REQUIRES_REVIEW'


def select_verified(package,categories,reserved,decisions):
    directory=BASE/package;data=json.loads((directory/'chapter-packages.json').read_text(encoding='utf8'))
    groups={g['groupId']:g for g in data['keyGroups']};buckets=defaultdict(list)
    for row in data['items']:
        if row.get('categoryId') or row['code'] in reserved or skip_pdf(row['sourceSha256'],decisions):continue
        body_path=directory/'body-readings'/(row['code']+'.json')
        key_path=directory/'independent-keys'/(row['groupId']+'.json')
        if not body_path.exists() or not key_path.exists():continue
        body=json.loads(body_path.read_text(encoding='utf8'));key=json.loads(key_path.read_text(encoding='utf8'))
        if body.get('status')!='DETERMINISTIC_NATIVE_BODY_PROVED' or body.get('imageSha256')!=row['imageSha256']:continue
        group=groups[row['groupId']]
        if key.get('status')!='AGREES' or key.get('imageSha256')!=row['keyImageSha256']:continue
        if group['answers'].get(str(row['printedNumber']))!=row['answer']:raise ValueError('Printed answer identity differs')
        subject=source_subject(row['relativePath'],categories,row['exam']) or row.get('subject')
        allowed=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.')
                 and c.get('exam')==row['exam'] and c['subject']==subject]
        if allowed:buckets[(row['exam'],subject)].append((row,allowed,body_path,key_path))
    # Round-robin courses; do not mistake a single-course pilot for calibration.
    result=[]
    while any(buckets.values()):
        for key in sorted(buckets):
            if buckets[key]:result.append(buckets[key].pop(0))
    return result


def run(limit):
    if not 1<=limit<=24:raise ValueError('Bounded pilot only; no unattended full topic acceptance')
    OUT.mkdir(exist_ok=True)
    calibration=OUT/'agent-calibration-review.json'
    if calibration.exists() and json.loads(calibration.read_text(encoding='utf8')).get('status')=='FAIL_FOR_UNATTENDED_TOPIC_ACCEPTANCE':
        print(json.dumps({'status':'FAILED_TOPIC_PILOT_NOT_RETRIED','questionWrites':0,'modelCalls':0}),flush=True)
        return
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    reserved=set()
    for path in BASE.glob('*expansion/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8'))['items'])
    rows=select_verified('single-test-pending-evidence',categories,reserved,load_decisions())[:limit]
    frozen=OUT/'selected.json';selection={'codes':[r[0]['code'] for r in rows],'limit':limit,'questionWrites':0}
    if frozen.exists() and json.loads(frozen.read_text(encoding='utf8'))!=selection:raise ValueError('Pilot selection is frozen')
    if not frozen.exists():write_json(frozen,selection)
    module=vision();opened={};results=[];started=time.monotonic()
    try:
        for index,(row,allowed,body_path,key_path) in enumerate(rows,1):
            target=OUT/(row['code']+'.json')
            if target.exists():results.append(json.loads(target.read_text(encoding='utf8')));continue
            sha=row['sourceSha256']
            if sha not in opened:
                path=(SOURCE/row['relativePath']).resolve()
                if not path.is_relative_to(SOURCE):raise ValueError('Topic pilot leaves source archive')
                with path.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Topic pilot original changed')
                opened[sha]=pymupdf.open(path)
            image=BASE/row['image']
            if hashlib.sha256(image.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Topic pilot crop changed')
            words=opened[sha][row['bodyPage']-1].get_text('words',clip=pymupdf.Rect(row['bodyClip']),sort=True)
            text=' '.join(w[4] for w in words)
            labels=[{'choice':i,'topic':c['topic'],'unit':c.get('unit')} for i,c in enumerate(allowed)]
            prompt=('Bir YKS sorusunun ana konu adayı için yalnız verilen mevcut listeden seçim yap. Soruyu çözme, doğru cevabı söyleme. '
                'Soru kökündeki ölçülen beceriyi kullan; seçeneklerde rastlanan rastgele bir kelimeyle etiketleme. '
                'Tek bir ana konu açık değilse choice=-1 ve uncertain=true yaz. quote alanına sorunun metninden değiştirmeden kısa kanıt alıntısı koy. '
                'Bu bir inceleme önerisidir; öğretmen onayı değildir.\nSınav: '+row['exam']+'\nMevcut konular: '+json.dumps(labels,ensure_ascii=False)+
                '\nÖzgün kırpımdan native metin: '+text)
            schema={'type':'object','properties':{'choice':{'type':'integer','enum':[-1,*range(len(allowed))]},
                'uncertain':{'type':'boolean'},'quote':{'type':'string'},'reason':{'type':'string'}},
                'required':['choice','uncertain','quote','reason'],'additionalProperties':False}
            try:
                value,hit=module.ask(prompt,schema=schema,model='qwen3.5:9b',max_output_tokens=384)
                category,status=validate(value,allowed,text)
            except Exception as error:
                value={'errorType':type(error).__name__};hit=False;category=None;status='TOPIC_MODEL_ERROR_REVIEW_NO_RETRY'
            result={'code':row['code'],'sourceSha256':sha,'sourceRow':row,'originalNativeText':text,'model':'qwen3.5:9b',
                'reading':value,'cacheHit':hit,'status':status,'proposedCategoryId':category['id'] if category else None,
                'proposedTopic':category['topic'] if category else None,'bodyEvidence':str(body_path.relative_to(BASE)),
                'keyEvidence':str(key_path.relative_to(BASE)),'questionWrites':0,'questionComparisons':0,
                'teacherApproved':False,'studentVisible':False,'productionImportAllowed':False}
            write_json(target,result);results.append(result)
            print(json.dumps({'completed':index,'total':len(rows),'status':status,'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
        write_json(OUT/'report.json',{'status':'TOPIC_PROPOSAL_PILOT_REQUIRES_REVIEW_NOT_PUBLICATION',
            'records':[{'code':r['code'],'status':r['status'],'proposedTopic':r['proposedTopic']} for r in results],
            'counts':dict(Counter(r['status'] for r in results)),'questionWrites':0,'questionComparisons':0,
            'teacherApprovalsCreated':0,'allPrintedQuestionsExtracted':False})
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=12);args=parser.parse_args()
    with process_lock(BASE/'.jobs/topic-model-pilot.lock'):run(args.limit)
