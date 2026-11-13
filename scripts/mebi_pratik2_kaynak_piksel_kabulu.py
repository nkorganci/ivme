"""Verify technical candidates against current original PDF pixels and headers.

This adds independent source-byte/pixel verification to native geometry and
local visual readings. It does not create teacher approval or publish data.
"""
import hashlib
import json
import re
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json


def run():
    root=BASE/'single-test-crops'
    candidates=json.loads((root/'technical-packages.json').read_text(encoding='utf8'))['items']
    categories={c['id']:c for c in json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']}
    groups={}
    for row in candidates:groups.setdefault(row['sourceSha256'],[]).append(row)
    accepted=[];review=[]
    for sha,items in groups.items():
        path=(SOURCE/items[0]['relativePath']).resolve()
        if not path.is_relative_to(SOURCE):raise ValueError('Unsafe source path')
        with path.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original source changed')
        with pymupdf.open(path) as pdf:
            native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
            header_lines=[l['text'] for l in native['pages'][0]['lines'] if l['bbox'][1]<75]
            scopes={m for line in header_lines for m in re.findall(r'\b(AYT|TYT)\s+TARAMA',line)}
            for row in items:
                c=categories[row['categoryId']];reasons=[];proofs=[]
                if scopes!={c['exam']}:reasons.append('PRINTED_EXAM_SCOPE_MISMATCH')
                if normalize(c['subject']) not in {normalize(t) for t in header_lines}:reasons.append('PRINTED_SUBJECT_SCOPE_MISMATCH')
                for prefix,page,clip,image in [('body',row['bodyPage'],row['bodyClip'],row['image']),
                    ('key',row['keyPage'],row['keyClip'],row['keyImage'])]:
                    scale=2 if prefix=='body' else 3
                    original=pdf[page-1].get_pixmap(matrix=pymupdf.Matrix(scale,scale),clip=pymupdf.Rect(clip),alpha=False)
                    saved=pymupdf.Pixmap(str(BASE/image))
                    same=(original.width,original.height,original.n,original.samples)==(saved.width,saved.height,saved.n,saved.samples)
                    if not same:reasons.append(prefix.upper()+'_PIXELS_DIFFER')
                    proofs.append({'kind':prefix,'page':page,'clip':clip,'width':original.width,'height':original.height,
                        'pixelSha256':hashlib.sha256(original.samples).hexdigest(),'pixelsEqual':same})
                if reasons:review.append({'code':row['code'],'reasons':reasons,'studentVisible':False});continue
                accepted.append({**row,'sourcePixelProofs':proofs,'exam':c['exam'],'subject':c['subject'],
                    'subjectId':c['subjectId'],'topic':c['subtopic'] or c['topic'],'unit':c.get('unit'),
                    'status':'SOURCE_VERIFIED_READY_FOR_INSERT_ONLY','productionImportAllowed':True,
                    'acceptanceBasis':'ORIGINAL_PIXELS_PRINTED_SCOPE_EXACT_TOPIC_NATIVE_GEOMETRY_TWO_KEY_READINGS_LOCAL_BODY_REVIEW',
                    'teacherApproved':False})
    output={'status':'ORIGINAL_SOURCE_VERIFICATION_COMPLETE','accepted':accepted,'reviewQueueAdditions':review,
        'acceptedCount':len(accepted),'reviewCount':len(review),'questionWrites':0,'publicationPerformed':False}
    write_json(root/'source-pixel-acceptance.json',output)
    print(json.dumps({k:v for k,v in output.items() if k not in ('accepted','reviewQueueAdditions')}))


if __name__=='__main__':run()
