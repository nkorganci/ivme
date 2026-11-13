"""Bounded alternative source reading, explicitly authorized after first failure.

Recover a wrongly read heading with independent Turkish/English image OCR;
recover an answer row only when the fresh OCR exactly matches the native
printed numbered cells. Reuse successful independent numeric readings,
never infer answers, repeat failed prompts or fabricate teacher approval.
"""
import hashlib
import json
import re
import time
from collections import defaultdict,Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_genisletilmis_kabul import vision,complete
from mebi_pratik2_govde_model_pilotu import PROMPT
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'bounded-answer-recovery'
CELL=re.compile(r'(?<!\d)(\d{1,3})\s*[-–—.:]\s*([ABCDE])\b')


def step_token(value):
    match=re.fullmatch(r'([123]) adim(?: ([ab]))?',normalize(value))
    return match[1]+(match[2].upper() if match[2] else '') if match else None


def ocr(pdf,page,clip,folder,name):
    image=folder/(name+'.png');receipt=folder/(name+'.json')
    if receipt.exists():
        result=json.loads(receipt.read_text(encoding='utf8'))
        if hashlib.sha256(image.read_bytes()).hexdigest()!=result['imageSha256']:raise ValueError('Alternative OCR source pixels changed')
        return result
    pix=pdf[page-1].get_pixmap(matrix=pymupdf.Matrix(5,5),clip=pymupdf.Rect(clip),alpha=False);pix.save(image)
    try:
        data=pix.pdfocr_tobytes(language='tur+eng',tessdata=str(APP/'veri/tessdata'))
        with pymupdf.open('pdf',data) as document:text='\n'.join(p.get_text() for p in document)
        result={'status':'OCR_READ','text':text,'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
            'page':page,'clip':list(clip),'method':'INDEPENDENT_TESSERACT_TUR_ENG_5X_ORIGINAL_PIXELS'}
    except Exception as error:result={'status':'REVIEW_REQUIRED','errorType':type(error).__name__,'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest()}
    write_json(receipt,result);return result


def run():
    OUT.mkdir(exist_ok=True);folder=OUT/'alternative-key-readings';folder.mkdir(exist_ok=True)
    package_path=BASE/'three-step-crops/native-proof-v3.json';package=json.loads(package_path.read_text(encoding='utf8'))
    groups={g['groupId']:g for g in package['keyGroups']};rows=defaultdict(list)
    for row in package['items']:rows[row['groupId']].append(row)
    failed={}
    for path in (BASE/'three-step-acceptance/key-readings').glob('*.json'):
        result=json.loads(path.read_text(encoding='utf8'))
        if path.stem in groups and result['status']!='AGREES':failed[path.stem]=result
    started=time.monotonic();recovered={};reviews=[];opened={};discoveries={};last=started;bucket=-1
    try:
        for index,(group_id,prior) in enumerate(failed.items(),1):
            group=groups[group_id];sha=group['sourceSha256'];receipt=folder/(group_id+'-recovery.json')
            if receipt.exists():result=json.loads(receipt.read_text(encoding='utf8'))
            else:
                if sha not in opened:
                    source=(SOURCE/group['relativePath']).resolve()
                    if not source.is_relative_to(SOURCE):raise ValueError('Recovery leaves MEBI source root')
                    with source.open('rb') as stream:
                        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Recovery original source changed')
                    opened[sha]=pymupdf.open(source)
                    discoveries[sha]=json.loads((BASE/'three-step-discovery-v3'/(sha+'.json')).read_text(encoding='utf8'))
                native=next(g for g in discoveries[sha]['groups'] if g['chapter']==group['chapter'] and g['stepToken']==group['stepToken'])
                if native['status']!='NATIVE_CHAPTER_STEP_BINDING_CANDIDATE':raise ValueError('Recovery native source identity was not bound')
                row=native['keyRows'][0];header_box=row['chapterBBox'];header_identity=hashlib.sha256(json.dumps([sha,row['page'],header_box]).encode()).hexdigest()[:24]
                header=ocr(opened[sha],row['page'],[header_box[0]-4,header_box[1]-3,header_box[2]+4,header_box[3]+3],folder,header_identity+'-heading')
                header_agrees=header['status']=='OCR_READ' and normalize(header['text'])==normalize(group['chapter'])
                previous=prior.get('reading',{});old_answers=previous.get('answers',{})
                old_agrees=(old_answers==group['answers'] and prior.get('parsedStepToken')==group['stepToken'] and previous.get('uncertainty') is False)
                alternative=None;label=None;new_agrees=False
                if header_agrees and not old_agrees:
                    keys=native['keys'];clip=[min(k['bbox'][0] for k in keys)-3,min(k['bbox'][1] for k in keys)-3,
                        max(k['bbox'][2] for k in keys)+3,max(k['bbox'][3] for k in keys)+3]
                    alternative=ocr(opened[sha],row['page'],clip,folder,group_id+'-numbered-row')
                    label_box=row['stepBBox'];label=ocr(opened[sha],row['page'],[label_box[0]-3,label_box[1]-3,label_box[2]+3,label_box[3]+3],folder,group_id+'-row-label')
                    matches=CELL.findall(alternative.get('text',''));answers={str(int(n)):a for n,a in matches}
                    new_agrees=(len(matches)==len(answers) and answers==group['answers'] and step_token(label.get('text',''))==group['stepToken'])
                agreed=header_agrees and (old_agrees or new_agrees)
                result={'status':'SOURCE_KEY_RECOVERED' if agreed else 'REVIEW_REQUIRED','groupId':group_id,
                    'method':'ALTERNATIVE_PRINTED_HEADER_OCR_PLUS_INDEPENDENT_NUMBERED_KEY_READING',
                    'imageSha256':group['keyImageSha256'],'nativeChapter':group['chapter'],'nativeStepToken':group['stepToken'],
                    'headingOcr':header,'numericIndependentReadingPreserved':prior if old_agrees else None,
                    'alternativeNumberedRowOcr':alternative,'alternativeRowLabelOcr':label,
                    'answers':group['answers'] if agreed else None,'previousFailedReadingRetained':True,
                    'userAuthorization':'DO_NOT_GIVE_UP_ON_FIRST_MISSING_ANSWER_TRY_BOUNDED_ALTERNATIVE_METHOD',
                    'teacherApproved':False,'newModelKeyCalls':0}
                write_json(receipt,result)
            if result['status']=='SOURCE_KEY_RECOVERED':recovered[group_id]=result
            else:
                for row in rows[group_id]:reviews.append({**row,'status':'REVIEW_REQUIRED','reasons':['BOUNDED_ALTERNATIVE_KEY_READING_STILL_UNRESOLVED'],'recoveryEvidence':str(receipt.relative_to(BASE)),'studentVisible':False})
            now=time.monotonic();current=10*index//len(failed)
            if current>bucket or now-last>=300 or index==len(failed):
                progress={'stage':'ALTERNATIVE_KEY_RECOVERY','completedGroups':index,'totalGroups':len(failed),'percent':round(100*index/len(failed),2),
                    'recoveredGroups':len(recovered),'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                write_json(OUT/'progress-current.json',progress);print(json.dumps(progress),flush=True);last=now;bucket=current
    finally:
        for document in opened.values():document.close()
    write_json(OUT/'key-recovery-report.json',{'status':'BOUNDED_ALTERNATIVE_KEY_PASS_COMPLETE','recoveredGroups':list(recovered.values()),'recoveredCount':len(recovered),'attemptedGroups':len(failed),'questionWrites':0})
    # Use one first body reading where none existed: failed-key groups never
    # reached that earlier body gate. Prior failed body readings are not rerun.
    while not (BASE/'compiled-tarama-acceptance/source-pixel-acceptance.json').exists():time.sleep(5)
    module=vision();body_folder=OUT/'body-readings';body_folder.mkdir(exist_ok=True)
    candidates=[row for group_id in recovered for row in rows[group_id]];accepted=[];body_started=time.monotonic();last=body_started;bucket=-1
    for index,row in enumerate(candidates,1):
        if hashlib.sha256((BASE/row['image']).read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Recovery body source pixels changed')
        receipt=body_folder/(row['code']+'.json')
        if row['nativeBodyProofV2']['status']=='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS':body={'status':'NATIVE_BODY_COMPLETENESS_PROVED','basis':row['nativeBodyProofV2']}
        elif receipt.exists():body=json.loads(receipt.read_text(encoding='utf8'))
        else:
            try:
                value,hit=module.ask(PROMPT,image=BASE/row['image'],as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                body={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'reading':value,'cacheHit':hit}
            except Exception as error:body={'status':'REVIEW_REQUIRED','imageSha256':row['imageSha256'],'errorType':type(error).__name__}
            write_json(receipt,body)
        if body.get('imageSha256',row['imageSha256'])!=row['imageSha256']:raise ValueError('Recovery body cache changed')
        if body['status'] in ('NATIVE_BODY_COMPLETENESS_PROVED','MODEL_NO_VISIBLE_ISSUE'):
            accepted.append({**row,'keySecondReading':recovered[row['groupId']],'bodyModelReview':body,
                'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                'acceptanceBasis':'BOUNDED_ALTERNATIVE_HEADER_OR_KEY_OCR_NATIVE_TEST_STEP_IDENTITY_INDEPENDENT_ANSWERS_COMPLETE_SOURCE_BODY'})
        else:reviews.append({**row,'status':'REVIEW_REQUIRED','reasons':['RECOVERED_KEY_BODY_COMPLETENESS_NOT_CONFIRMED'],'bodyModelReview':body,'studentVisible':False})
        now=time.monotonic();current=10*index//max(1,len(candidates))
        if current>bucket or now-last>=300 or index==len(candidates):
            progress={'stage':'RECOVERED_KEY_FIRST_BODY_REVIEW','completed':index,'total':len(candidates),'percent':round(100*index/len(candidates),2),
                'accepted':len(accepted),'reviewRecords':len(reviews),'elapsedSeconds':round(now-body_started,1),'estimatedRemainingSeconds':None}
            write_json(OUT/'progress-current.json',progress)
            with (OUT/'progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
            write_json(OUT/'source-pixel-acceptance.partial.json',{'accepted':accepted,'reviewQueueAdditions':reviews,'progress':progress})
            print(json.dumps(progress),flush=True);last=now;bucket=current
    report={'status':'BOUNDED_ANSWER_RECOVERY_COMPLETE','accepted':accepted,'reviewQueueAdditions':reviews,
        'acceptedCount':len(accepted),'reviewCount':len(reviews),'recoveredKeyGroups':len(recovered),'attemptedKeyGroups':len(failed),
        'ocrLanguageModelSha256':{name:hashlib.sha256((APP/'veri/tessdata'/name).read_bytes()).hexdigest() for name in ['tur.traineddata','eng.traineddata']},
        'newKeyModelCalls':0,'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(OUT/'source-pixel-acceptance.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('accepted','reviewQueueAdditions')}))


if __name__=='__main__':run()
