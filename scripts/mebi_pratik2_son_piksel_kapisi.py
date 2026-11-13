"""Re-render admitted source bodies/keys immediately before any live import.

Different extraction passes never repair or overwrite an existing proof.
Unmatched derived pixels are quarantined, without another model request.
"""
import hashlib
import json
import re
import time
from collections import defaultdict
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE,APP
from yks_istisna_kirpim import verify_image
from yks_birlestirme import write_json

SHARED=re.compile(r'(\d{1,3})\s*[.]?\s*(?:[-–—]|ve)\s*(\d{1,3})\s*[.]?\s*sorular',re.I)


def validate_legacy_shortcut(row,pdf,folder):
    """An old loaded worker must not turn VISUAL_REQUIRED into native proof.

    Keep its historical receipt, perform the actual missing review once, and
    admit only the replacement proof. This gate runs in each fresh batch child.
    """
    previous=row.get('bodyModelReview') or {}
    from mebi_pratik2_hizli_yol import STATUS,valid_receipt
    if previous.get('status')==STATUS:
        if not valid_receipt(previous,row):raise ValueError('Final gate: profile receipt binding differs')
        return row,[]
    if previous.get('status')!='DETERMINISTIC_NATIVE_BODY_PROVED' or (previous.get('basis') or {}).get('status')!='LOCAL_VISUAL_BODY_REVIEW_REQUIRED':
        return row,[]
    from mebi_pratik2_native_govde import prove
    from mebi_pratik2_genisletilmis_kabul import vision,complete
    from mebi_pratik2_govde_model_pilotu import PROMPT
    path=BASE/row['image'];sha=hashlib.sha256(path.read_bytes()).hexdigest()
    if sha!=row['imageSha256']:raise ValueError('Legacy review pixels changed')
    out=folder/'legacy-body-review';out.mkdir(exist_ok=True);target=out/(row['code']+'.json')
    if target.exists():
        proof=json.loads(target.read_text(encoding='utf8'))
        if proof.get('imageSha256')!=sha:raise ValueError('Legacy replacement evidence changed')
    else:
        proof=prove(pdf[row['bodyPage']-1],row,path)
        if proof is None:
            try:
                value,hit=vision().ask(PROMPT,image=path,as_json=True,model='qwen3.5:9b',max_output_tokens=256)
                proof={'status':'MODEL_NO_VISIBLE_ISSUE' if complete(value) else 'REVIEW_REQUIRED',
                       'imageSha256':sha,'reading':value,'cacheHit':hit,'method':'FIRST_ACTUAL_VISUAL_REVIEW_AFTER_INVALID_NATIVE_SHORTCUT'}
            except Exception as error:
                proof={'status':'REVIEW_REQUIRED','imageSha256':sha,'errorType':type(error).__name__}
        write_json(target,proof)
    corrected={**row,'priorBodyCompletenessEvidence':previous,'bodyModelReview':proof}
    reasons=[] if proof['status'] in ('MODEL_NO_VISIBLE_ISSUE','DETERMINISTIC_NATIVE_BODY_PROVED') else ['ACTUAL_BODY_COMPLETENESS_REVIEW_NOT_CONFIRMED']
    return corrected,reasons


def verify(rows,folder):
    by_source=defaultdict(list)
    for row in rows:by_source[(row['sourceSha256'],row['relativePath'])].append(row)
    accepted=[];review=[];started=time.monotonic();last_log=started;bucket=-1;done=0;keys={}
    for (sha,relative),items in by_source.items():
        source=(SOURCE/relative).resolve()
        if not source.is_relative_to(SOURCE):raise ValueError('Final source proof leaves MEBI root')
        with source.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original source changed before import')
        with pymupdf.open(source) as pdf:
            for row in items:
                reasons=[];body=(BASE/row['image']).resolve();key_path=(BASE/row['keyImage']).resolve()
                if not body.is_relative_to(APP/'veri') or not key_path.is_relative_to(APP/'veri'):raise ValueError('Prepared image leaves evidence directory')
                if hashlib.sha256(body.read_bytes()).hexdigest()!=row['imageSha256']:reasons.append('ADMITTED_BODY_BYTES_CHANGED')
                if hashlib.sha256(key_path.read_bytes()).hexdigest()!=row['keyImageSha256']:reasons.append('ADMITTED_KEY_BYTES_CHANGED')
                if not reasons:
                    row,body_reasons=validate_legacy_shortcut(row,pdf,folder)
                    reasons.extend(body_reasons)
                # Read raw text: normalizing punctuation before this check
                # would erase the dash joining a shared-question range.
                if not row.get('priorSourcePixelProof'):
                    for page_index in range(max(0,row['bodyPage']-2),min(len(pdf),row['bodyPage']+1)):
                        for match in SHARED.finditer(pdf[page_index].get_text()):
                            if int(match[1])<=row['printedNumber']<=int(match[2]):reasons.append('SHARED_CONTEXT_REQUIRES_EXPLICIT_SOURCE_REGIONS')
                if not reasons:
                    if row.get('priorSourcePixelProof'):
                        try:verify_image(pdf,row['sourceRegions'],body)
                        except ValueError:reasons.append('FRESH_SOURCE_BODY_PIXELS_DIFFER')
                    else:
                        pix=pdf[row['bodyPage']-1].get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(row['bodyClip']),alpha=False)
                        saved=pymupdf.Pixmap(str(body))
                        if (pix.width,pix.height,pix.n,pix.samples)!=(saved.width,saved.height,saved.n,saved.samples):reasons.append('FRESH_SOURCE_BODY_PIXELS_DIFFER')
                    identity=(sha,row['keyPage'],tuple(row['keyClip']),row['keyImageSha256'])
                    if identity not in keys:
                        pix=pdf[row['keyPage']-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(row['keyClip']),alpha=False)
                        saved=pymupdf.Pixmap(str(key_path));keys[identity]=(pix.width,pix.height,pix.n,pix.samples)==(saved.width,saved.height,saved.n,saved.samples)
                    if not keys[identity]:reasons.append('FRESH_SOURCE_KEY_PIXELS_DIFFER')
                if reasons:review.append({**row,'status':'EXCLUDE_NO_RETRY','reasons':reasons,'productionImportAllowed':False,'studentVisible':False})
                else:accepted.append({**row,'freshPreImportSourcePixelsVerified':True})
                done+=1;now=time.monotonic();current=10*done//len(rows)
                if current>bucket or now-last_log>=300 or done==len(rows):
                    progress={'stage':'FINAL_PREIMPORT_PIXEL_GATE','completed':done,'total':len(rows),
                        'percent':round(100*done/len(rows),2),'accepted':len(accepted),'review':len(review),'elapsedSeconds':round(now-started,2)}
                    with (folder/'pixel-progress.jsonl').open('a',encoding='utf8') as stream:stream.write(json.dumps(progress)+'\n')
                    print(json.dumps(progress),flush=True);last_log=now;bucket=current
    output={'status':'FINAL_PREIMPORT_PIXEL_GATE_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
        'acceptedCount':len(accepted),'reviewCount':len(review),'modelCalls':0,'questionWrites':0}
    write_json(folder/'final-source-acceptance.json',output)
    return accepted
