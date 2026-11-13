"""Add stronger native text/body proofs without rerendering existing crops."""
import json
import hashlib
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_uc_adim_kirpim import page_graphics,TEXT_SUBJECTS,OUT
from yks_birlestirme import write_json


def run():
    report=json.loads((OUT/'report.json').read_text(encoding='utf8'));items=[];groups=[];reviews=[]
    for source in report['sources']:
        data=json.loads((OUT/(source['sourceSha256']+'.json')).read_text(encoding='utf8'));groups.extend(data['keyGroups']);reviews.extend(data['reviewQueueAdditions'])
        with pymupdf.open(SOURCE/source['relativePath']) as pdf:
            graphics={}
            for row in data['items']:
                page=row['bodyPage']
                if row['subject'] in TEXT_SUBJECTS:
                    if page not in graphics:graphics[page]=page_graphics(pdf[page-1])
                    status='FULL_NATIVE_TEXT_NO_SHARED_CONTEXT_OR_GRAPHICS' if not graphics[page] else 'LOCAL_VISUAL_BODY_REVIEW_REQUIRED'
                else:status='LOCAL_VISUAL_BODY_REVIEW_REQUIRED'
                items.append({**row,'nativeBodyProofV2':{**row['nativeBodyProof'],'status':status,
                    'version':'NATIVE_COMPLETE_CHOICES_LINES_TEXT_BOUND_UNDERLINES_HEADER_FOOTER_V3',
                    'sourcePixelsChanged':False,'pageGraphics':graphics.get(page,True)}})
    output={'status':'NATIVE_BODY_EVIDENCE_RECONCILED_NOT_PUBLISHED','items':items,'keyGroups':groups,
        'reviewQueueAdditions':reviews,'candidateBodies':len(items),
        'counts':dict(Counter(r['nativeBodyProofV2']['status'] for r in items)),'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(OUT/'native-proof-v3.json',output);print(json.dumps({k:v for k,v in output.items() if k not in ('items','keyGroups','reviewQueueAdditions')}))


if __name__=='__main__':run()
