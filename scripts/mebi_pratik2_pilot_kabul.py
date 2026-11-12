"""Freeze the actual visual review of the 21-question breathing-system pilot.

The expected answers below were read from all 21 original key crops. This is
bounded agent review, not teacher approval or full-archive acceptance.
"""
import hashlib
import json
from mebi_pratik2_tam_pdf_tarama import APP, BASE
from yks_birlestirme import write_json

ANSWERS='C D A A A C E D E A B B B A D B E D E C E'.split()
CATEGORY='excel.ayt.biyoloji.03fef08f029e99373ac8'
SHA='2f2b7ab1d291e372fbf6b848ee7a247dc2491925681c568aa7c3c7113c42052b'


def run():
    manifest=BASE/'single-test-crop-pilot/manifest.json'
    crops=json.loads(manifest.read_text(encoding='utf8'))['crops']
    taxonomy=APP/'backend/src/main/resources/content-taxonomy.json'
    category=next(c for c in json.loads(taxonomy.read_text(encoding='utf8'))['categories'] if c['id']==CATEGORY)
    if category['exam']!='AYT' or category['topic']!='Solunum Sistemi' or not category['selectable']:
        raise ValueError('Controlled pilot topic changed')
    if len(crops)!=21 or [r['printedNumber'] for r in crops]!=list(range(1,22)):
        raise ValueError('Only the visually reviewed 21-question pilot is authorized by this proof')
    items=[]
    for row,answer in zip(crops,ANSWERS):
        if row['sourceSha256']!=SHA or row['answer']!=answer:raise ValueError('Printed key differs from actual visual reading')
        for field,sha_field in [('image','imageSha256'),('keyImage','keyImageSha256')]:
            if hashlib.sha256((BASE/row[field]).read_bytes()).hexdigest()!=row[sha_field]:
                raise ValueError('Reviewed pixels changed')
        items.append({**row,'code':f'MEBI2-{SHA[:16]}-Q{row["printedNumber"]:03}',
            'bank':'MEBI_PRACTICE_2','exam':'AYT','subjectId':'biyoloji','categoryId':CATEGORY,
            'unit':'İnsan Fizyolojisi','topic':'Solunum Sistemi',
            'visualReview':'AGENT_READ_BODY_AND_PRINTED_KEY_IMAGES',
            'visibleTruncationObserved':False,'teacherApproved':False,
            'status':'BOUNDED_PILOT_SOURCE_PACKAGE_READY','studentVisible':False})
    write_json(BASE/'single-test-crop-pilot/reviewed-package.json',{
        'status':'BOUNDED_PILOT_SOURCE_PACKAGE_READY','items':items,
        'scope':'ONLY_21_REVIEWED_SOLUNUM_TEST_7_QUESTIONS','reviewedBodyImages':21,
        'reviewedKeyImages':21,'taxonomySha256':hashlib.sha256(taxonomy.read_bytes()).hexdigest(),
        'manifestSha256':hashlib.sha256(manifest.read_bytes()).hexdigest(),
        'questionWrites':0,'fullStage02Complete':False,'fullStage03Complete':False})
    print(json.dumps({'pilotQuestions':21,'bodyImagesRead':21,'keyImagesRead':21,'questionWrites':0}))


if __name__=='__main__':run()
