"""Join actual source/geometry/topic/key/body-model proofs without publication."""
import hashlib
import json
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def run():
    root=BASE/'single-test-crops';inputs={}
    def load(name):
        path=root/name;raw=path.read_bytes();inputs[name]=hashlib.sha256(raw).hexdigest()
        return json.loads(raw)
    crops=load('manifest.json')['crops'];gates=load('gate-report.json')['rows']
    keys={r['code']:r for r in load('second-reading/report.json')['results']}
    model={r['code']:r for r in load('body-model-review/report.json')['results']}
    gate_by_code={r['code']:r for r in gates};items=[];review=[]
    for crop in crops:
        code=f'MEBI2-{crop["sourceSha256"][:16]}-Q{crop["printedNumber"]:03}'
        gate=gate_by_code[code];reading=model.get(code)
        reasons=[r for r in gate['reasons'] if r!='ACTUAL_BODY_CONTENT_REVIEW_REQUIRED']
        if not reading or reading['status']!='MODEL_NO_VISIBLE_ISSUE':reasons.append('BODY_MODEL_REVIEW_NOT_PASSED')
        if keys[code]['status']!='AGREES':reasons.append('KEY_SECOND_READING_NOT_PASSED')
        if reasons:
            review.append({'code':code,'reasons':sorted(set(reasons)),'studentVisible':False});continue
        for field,sha_field in [('image','imageSha256'),('keyImage','keyImageSha256')]:
            if hashlib.sha256((BASE/crop[field]).read_bytes()).hexdigest()!=crop[sha_field]:raise ValueError('Evidence pixels changed')
        if reading['imageSha256']!=crop['imageSha256']:raise ValueError('Body model reviewed a different crop')
        if keys[code]['imageSha256']!=crop['keyImageSha256']:raise ValueError('Key model reviewed a different key')
        items.append({**crop,'code':code,'bank':'MEBI_PRACTICE_2','categoryId':gate['categoryId'],
            'bodyModelReview':reading,'keySecondReading':keys[code],
            'status':'TECHNICAL_EVIDENCE_PACKAGE_READY_NOT_PUBLISHED','teacherApproved':False,
            'studentVisible':False,'productionImportAllowed':False})
    result={'status':'TECHNICAL_PACKAGES_RECONCILED','items':items,'reviewQueueAdditions':review,
        'technicalCandidates':len(items),'remainingCandidates':len(review),'inputHashes':inputs,
        'questionWrites':0,'publicationPerformed':False,'teacherApprovalInferred':False}
    write_json(root/'technical-packages.json',result)
    print(json.dumps({k:v for k,v in result.items() if k not in ('items','reviewQueueAdditions','inputHashes')}))


if __name__=='__main__':run()
