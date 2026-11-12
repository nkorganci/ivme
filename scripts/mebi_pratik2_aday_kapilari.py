"""Reconcile completed independent gates, retaining every rejected candidate.

Even all technical gates do not silently become agent visual/semantic review.
The reviewed 21-item pilot is the explicit content-review evidence available.
"""
import json
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import BASE
from yks_birlestirme import write_json


def run():
    root=BASE/'single-test-crops'
    crops=json.loads((root/'manifest.json').read_text(encoding='utf8'))['crops']
    geometry={(r['sourceSha256'],r['printedNumber']):r for r in json.loads((root/'geometry-report.json').read_text(encoding='utf8'))['rows']}
    topics={r['sourceSha256']:r for r in json.loads((root/'topic-candidates.json').read_text(encoding='utf8'))['rows']}
    keys={r['code']:r for r in json.loads((root/'second-reading/report.json').read_text(encoding='utf8'))['results']}
    pilot=json.loads((BASE/'single-test-crop-pilot/reviewed-package.json').read_text(encoding='utf8'))['items']
    reviewed={r['code']:r for r in pilot};rows=[]
    for crop in crops:
        sha=crop['sourceSha256'];number=crop['printedNumber'];code=f'MEBI2-{sha[:16]}-Q{number:03}'
        reasons=[];g=geometry[(sha,number)];t=topics[sha];k=keys[code]
        if g['status']!='NATIVE_GEOMETRY_ONLY_PASS':reasons.extend(g['reasons'])
        if t['status']!='EXACT_PRINTED_TOPIC_CANDIDATE':reasons.append('KONU_BELIRSIZ')
        if k['status']!='AGREES':reasons.append('SECOND_PRINTED_KEY_READING_NOT_AGREED')
        if code not in reviewed:reasons.append('ACTUAL_BODY_CONTENT_REVIEW_REQUIRED')
        if code in reviewed and reviewed[code]['answer']!=crop['answer']:raise ValueError('Pilot source answer changed')
        rows.append({'code':code,'sourceSha256':sha,'printedNumber':number,'image':crop['image'],
            'keyImage':crop['keyImage'],'reasons':reasons,
            'status':'REVIEW_QUEUE' if reasons else 'REVIEWED_PILOT_PACKAGE_READY',
            'categoryId':reviewed[code]['categoryId'] if code in reviewed else
                t['matches'][0]['categoryId'] if t['status']=='EXACT_PRINTED_TOPIC_CANDIDATE' else None,
            'studentVisible':False})
    result={'status':'CANDIDATE_GATES_RECONCILED','rows':rows,
        'counts':dict(Counter(r['status'] for r in rows)),
        'reasons':dict(Counter(reason for r in rows for reason in r['reasons'])),
        'questionWrites':0,'bankPublicationPerformed':False}
    write_json(root/'gate-report.json',result)
    print(json.dumps({k:v for k,v in result.items() if k!='rows'}))


if __name__=='__main__':run()
