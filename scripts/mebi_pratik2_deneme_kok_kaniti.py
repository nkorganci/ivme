"""Reuse verified mock source evidence and explicit language-question intent.

Rules inspect the question command before the choices, within a printed
Turkish/language section. They do not infer a topic from incidental words in
the options. Unmatched or competing intents remain in the review queue.
"""
import hashlib
import json
import re
import time
from collections import Counter
from pathlib import Path
import pymupdf
from PIL import Image
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_genisletilmis_kabul import vision,complete
from mebi_pratik2_govde_model_pilotu import PROMPT
from mebi_pratik2_uc_adim_kirpim import page_graphics
from yks_deneme_anahtar_pilotu import partition_key
from yks_birlestirme import write_json

OUT=BASE/'mock-language-intent'
PATTERNS={
 'Sözcükte Anlam':r'(?:alti cizili (?:soz|sozcuk)|numaralanmis soz).*(?:anlam|anlatilmak|karsilayacak|parantez|vurgulan)',
 'Cümlede Anlam':r'(?:bu cumle(?:de|den|nin)?|alti cizili cumle).*(?:kesin.*cikaril|anlatilmak isten|anlamca|vurgulan)',
 'Paragrafta Anlam':r'bu parca(?:da|dan|nin)?.*(?:asil anlatilmak|vurgulan|yakini|soylenemez|deginil|cikaril)',
 'Yazım Kuralları':r'yazim yanlisi|yaziminda yanlislik',
 'Noktalama İşaretleri':r'noktalama (?:isaret|yanlis)',
 'Ses Bilgisi':r'ses olay',
 'Anlatım Bozukluğu':r'anlatim bozuklugu',
}


def classify(text):
    stem=re.split(r'(?<!\w)A\s*\)',text,maxsplit=1)[0]
    value=normalize(stem[-700:]);matched=[name for name,pattern in PATTERNS.items() if re.search(pattern,value)]
    if re.search(r'alti cizili (?:soz|sozcuk|cumle)|numaralanmis soz',value):
        matched=[name for name in matched if name!='Paragrafta Anlam']
    return (matched[0],stem[-700:]) if len(matched)==1 else (None,stem[-700:])


def run():
    OUT.mkdir(exist_ok=True);(OUT/'crops').mkdir(exist_ok=True);(OUT/'body-readings').mkdir(exist_ok=True)
    prior=BASE/'prior-source-proof-reuse.json';records=json.loads(prior.read_text(encoding='utf8'))['candidates']
    cats=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    rows=[];review=[]
    for candidate in records:
        row=candidate['sourceEvidence'];section=row.get('sectionId','')
        if not (section=='TYT:1' or section=='AYT:1' and row['printedNumber']<=6):continue
        title,quote=classify(row['text']);choices=[c for c in cats if c['id'].startswith('excel.') and c['exam']==row['exam'] and c['subject']=='Türkçe' and c['topic']==title and c.get('selectable')]
        if len(choices)!=1:
            review.append({'sourceCode':row['code'],'sourceSha256':row['sourceSha256'],'pdfPage':row['pdfPage'],
                'printedNumber':row['printedNumber'],'reasons':['EXPLICIT_SOURCE_LANGUAGE_INTENT_NOT_UNIQUE'],'studentVisible':False});continue
        rows.append((row,choices[0],quote))
    module=vision();accepted=[];opened={};verified=set();key_groups={};graphics={};started=time.monotonic();last_log=started;bucket=-1
    try:
        for index,(card,category,quote) in enumerate(rows,1):
            reasons=[];sha=card['sourceSha256'];source=Path(card['sourcePath']).resolve();old_image=Path(card['image']).resolve()
            if not source.is_relative_to(SOURCE) or not old_image.is_relative_to(APP/'veri'):raise ValueError('Evidence leaves approved roots')
            if sha not in verified:
                with source.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original mock changed')
                verified.add(sha);opened[sha]=pymupdf.open(source)
            pdf=opened[sha]
            if hashlib.sha256(old_image.read_bytes()).hexdigest()!=card['imageSha256']:raise ValueError('Previously verified body image changed')
            pixel=card['pixelProof'];proof_path=Path(pixel['path']).resolve()
            if not proof_path.is_relative_to(APP/'veri') or hashlib.sha256(proof_path.read_bytes()).hexdigest()!=pixel['sha256']:raise ValueError('Source crop proof changed')
            if card.get('reviewConcerns') or any(card['optionCounts'].get(c)!=1 for c in 'ABCDE'):
                reasons.append('PREVIOUS_BODY_STRUCTURE_NOT_COMPLETE')
            section=card['sectionId'];group_id=(sha,section)
            if group_id not in key_groups:
                current=next(s for s in partition_key(pdf[card['sourceKeyPage']-1],card['exam']) if s['sectionId']==section)
                relative='mock-language-intent/crops/'+sha[:16]+'-'+section.replace(':','-')+'-key.png'
                pix=pdf[card['sourceKeyPage']-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(current['keyBboxPt']),alpha=False);pix.save(BASE/relative)
                key_groups[group_id]={'answers':current['answers'],'image':relative,'sha256':hashlib.sha256((BASE/relative).read_bytes()).hexdigest(),'clip':current['keyBboxPt']}
            key=key_groups[group_id];answer=next((a['answer'] for a in key['answers'] if a['number']==card['printedNumber']),None)
            if answer!=card['answer']:reasons.append('FRESH_PRINTED_KEY_DIFFERS_FROM_PRIOR_DOUBLE_READING')
            code=f'MEBI2-{sha[:12]}-S1-Q{card["printedNumber"]:03}'
            image='mock-language-intent/crops/'+code+'.png'
            if not (BASE/image).exists():
                with Image.open(old_image) as original:
                    original.load();original.save(BASE/image,format='PNG')
                    with Image.open(BASE/image) as converted:
                        if (converted.mode,converted.size,converted.tobytes())!=(original.mode,original.size,original.tobytes()):raise ValueError('Lossless source conversion changed pixels')
            image_sha=hashlib.sha256((BASE/image).read_bytes()).hexdigest()
            gkey=(sha,card['pdfPage'])
            if gkey not in graphics:graphics[gkey]=page_graphics(pdf[card['pdfPage']-1])
            receipt=OUT/'body-readings'/(code+'.json')
            if reasons:body={'status':'REVIEW_REQUIRED','reasons':reasons}
            elif not graphics[gkey]:body={'status':'NATIVE_SOURCE_BODY_PROVED','basis':'PRESERVED_PIXEL_PROOF_FIVE_OPTIONS_FULL_NATIVE_TEXT_NO_PAGE_GRAPHICS'}
            elif receipt.exists():
                body=json.loads(receipt.read_text(encoding='utf8'))
                if body['imageSha256']!=image_sha:raise ValueError('Cached reading image changed')
            else:
                try:
                    value,hit=module.ask(PROMPT,image=BASE/image,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                    body={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED','imageSha256':image_sha,'reading':value,'cacheHit':hit}
                except Exception as error:body={'status':'REVIEW_REQUIRED','imageSha256':image_sha,'errorType':type(error).__name__}
                write_json(receipt,body)
            result={'code':code,'sourceSha256':sha,'relativePath':str(source.relative_to(SOURCE)),'exam':card['exam'],
                'subject':'Türkçe','subjectId':category['subjectId'],'topic':category['topic'],'unit':category.get('unit'),'categoryId':category['id'],
                'printedNumber':card['printedNumber'],'testNumber':str(card['printedMockNumber'])+' / '+section,
                'answer':card['answer'],'bodyPage':card['pdfPage'],'bodyClip':card['bboxPt'],'sourceRegions':card['sourceRegions'],
                'image':image,'imageSha256':image_sha,'keyImage':key['image'],'keyImageSha256':key['sha256'],'keyPage':card['sourceKeyPage'],'keyClip':key['clip'],
                'bodyModelReview':body,'sourceIntentEvidence':{'quote':quote,'rule':PATTERNS[category['topic']],'reference':card['code']},
                'keySecondReading':card['sourceKeyProof'],'priorSourcePixelProof':pixel,'originalVerifiedImageSha256':card['imageSha256'],
                'teacherApproved':False,'bank':'MEBI_PRACTICE_2','studentVisible':False}
            if body['status'] in ('NATIVE_SOURCE_BODY_PROVED','MODEL_NO_VISIBLE_ISSUE'):
                accepted.append({**result,'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                    'acceptanceBasis':'EXPLICIT_LANGUAGE_QUESTION_INTENT_REUSED_DOUBLE_KEY_FRESH_NATIVE_KEY_LOSSLESS_BODY_AND_COMPLETENESS'})
            else:review.append({**result,'status':'REVIEW_REQUIRED','reasons':reasons or ['BODY_COMPLETENESS_NOT_CONFIRMED']})
            now=time.monotonic();current=10*index//len(rows)
            if current>bucket or now-last_log>=300 or index==len(rows):
                progress={'completed':index,'total':len(rows),'percent':round(100*index/len(rows),2),'accepted':len(accepted),'reviewRecords':len(review),
                    'elapsedSeconds':round(now-started,1),'estimatedRemainingSeconds':None}
                with (OUT/'progress.jsonl').open('a',encoding='utf8') as log:log.write(json.dumps(progress)+'\n')
                write_json(OUT/'progress-current.json',progress);print(json.dumps(progress),flush=True);last_log=now;bucket=current
    finally:
        for doc in opened.values():doc.close()
    report={'status':'EXPLICIT_MOCK_LANGUAGE_INTENT_REVIEW_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
        'acceptedCount':len(accepted),'reviewCount':len(review),'priorSourceManifestSha256':hashlib.sha256(prior.read_bytes()).hexdigest(),
        'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(OUT/'source-pixel-acceptance.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('accepted','reviewQueueAdditions')}))


if __name__=='__main__':run()
