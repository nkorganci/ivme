"""Match only identical RGB question pixels and answers inside Practice 2.

Only empty white margins are trimmed. There is no resizing, OCR similarity,
perceptual hashing, old-bank novelty check or existing-ID merge/deletion.
Every duplicate source occurrence remains in a separate evidence manifest.
"""
import hashlib
import json
import struct
from PIL import Image,ImageChops
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json
from mebi_pratik2_pdf_tekrar_kapisi import load_policy


def fingerprint(path):
    with Image.open(path) as original:
        image=original.convert('RGB');box=ImageChops.difference(image,Image.new('RGB',image.size,'white')).getbbox()
        if box is None:return None
        trimmed=image.crop(box)
        digest=hashlib.sha256(struct.pack('>II',*trimmed.size)+trimmed.tobytes()).hexdigest()
        return {'rgbSha256':digest,'trimBox':list(box),'inkSize':list(trimmed.size),'sourceImageSize':list(image.size)}


def select_new(rows,folder):
    if load_policy(BASE).get('mode')=='PDF_LEVEL_ONLY':
        write_json(folder/'exact-duplicate-evidence.json',{'status':'QUESTION_COMPARISON_DISABLED_BY_USER_PDF_LEVEL_POLICY',
            'newSourceQuestions':len(rows),'additionalSourceOccurrences':[],'additionalSourceOccurrenceCount':0,
            'reviewQueueAdditions':[],'reviewCount':0,'questionComparisons':0,'existingIdMerges':0,'existingIdDeletes':0,'questionWrites':0})
        return rows
    cmd,env,_=db_connection('ivme')
    existing=json.loads(query((cmd,env,None),"SELECT coalesce(json_agg(s),'[]') FROM (SELECT code,correct_answer answer,image,exam_type::text exam,subject FROM questions WHERE bank='MEBI_PRACTICE_2' ORDER BY id) s"))
    index={};by_pixels={};missing=[]
    for row in existing:
        path=(APP/'veri/resimler-pilot'/row['image']).resolve()
        if not path.is_relative_to(APP/'veri/resimler-pilot'):raise ValueError('Existing Practice 2 image leaves image root')
        if not path.is_file():missing.append(row['code']);continue
        proof=fingerprint(path)
        if not proof:continue
        index.setdefault((proof['rgbSha256'],row['answer'],row['exam'],row['subject']),{'code':row['code'],'exam':row['exam'],'subject':row['subject'],'basis':'EXISTING_PRACTICE_2_QUESTION',**proof})
        by_pixels.setdefault(proof['rgbSha256'],set()).add(row['answer'])
    selected=[];aliases=[];review=[]
    for row in rows:
        path=(BASE/row['image']).resolve();proof=fingerprint(path)
        if not proof:
            review.append({**row,'reasons':['EMPTY_QUESTION_IMAGE'],'status':'EXCLUDE_NO_RETRY','productionImportAllowed':False,'studentVisible':False});continue
        identity=(proof['rgbSha256'],row['answer'],row['exam'],row['subject'])
        if identity in index:
            aliases.append({'sourceQuestion':row,'existingQuestionCode':index[identity]['code'],
                'status':'EXACT_RGB_AND_ANSWER_SOURCE_OCCURRENCE','comparison':proof,'reference':index[identity],
                'existingIdMergedOrDeleted':False,'studentQuestionInserted':False});continue
        if by_pixels.get(proof['rgbSha256'],set())-{row['answer']}:
            review.append({**row,'reasons':['IDENTICAL_PRACTICE_2_IMAGE_DIFFERENT_PRINTED_ANSWER'],'status':'EXCLUDE_NO_RETRY','productionImportAllowed':False,'studentVisible':False});continue
        selected.append(row);index[identity]={'code':row['code'],'exam':row['exam'],'subject':row['subject'],'basis':'EARLIER_ROW_IN_SAME_ATOMIC_SOURCE_BATCH',**proof}
        by_pixels.setdefault(proof['rgbSha256'],set()).add(row['answer'])
    report={'status':'EXACT_PRACTICE_2_DUPLICATE_CHECK_COMPLETE','newSourceQuestions':len(selected),'additionalSourceOccurrences':aliases,
        'additionalSourceOccurrenceCount':len(aliases),'reviewQueueAdditions':review,'reviewCount':len(review),
        'existingImagesUnavailable':missing,'sameExamAndSubjectRequiredForSourceAlias':True,'oldBankCompared':False,'existingIdMerges':0,'existingIdDeletes':0,'questionWrites':0}
    write_json(folder/'exact-duplicate-evidence.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('additionalSourceOccurrences','reviewQueueAdditions','existingImagesUnavailable')}),flush=True)
    return selected
