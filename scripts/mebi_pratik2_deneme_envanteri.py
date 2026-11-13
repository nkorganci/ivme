"""Reconcile every existing mock-body package against the current MEBI archive.

This reuses physical crops and printed source keys, never prior novelty or
teacher decisions. Full mock coverage is tracked even before topic admission.
"""
import hashlib
import json
import time
from collections import Counter
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from yks_birlestirme import write_json


def run():
    root=APP/'veri/yks-birlestirme/20261107t212333-f17dbdba/full-mock-bodies'
    progress=root/'progress.json';prior=json.loads(progress.read_text(encoding='utf8'))
    inventory={str((SOURCE/r['relativePath']).resolve()):r['sha256'] for r in json.loads((BASE/'inventory.json').read_text(encoding='utf8'))['items']}
    out=BASE/'full-mock-source-reuse';out.mkdir(exist_ok=True);records=[];sources=[];checked={};started=time.monotonic();bucket=-1
    def digest(path):
        key=str(path)
        if key not in checked:
            with path.open('rb') as stream:checked[key]=hashlib.file_digest(stream,'sha256').hexdigest()
        return checked[key]
    for index,result in enumerate(prior['results'],1):
        if result['status']!='SECTION_BODY_SEQUENCE_AND_PIXELS_PREPARED':
            sources.append({'sourceSha256':result['sourceSha256'],'status':'EXCLUDE_NO_RETRY','priorSourceDecision':result['status'],'studentVisible':False});continue
        package=Path(result['package']).resolve()
        if not package.is_relative_to(APP/'veri') or digest(package)!=result['packageSha256']:raise ValueError('Frozen mock package changed')
        data=json.loads(package.read_text(encoding='utf8'));source=Path(data['sourcePath']).resolve();sha=data['sourceSha256']
        if not source.is_relative_to(SOURCE) or inventory.get(str(source))!=sha:
            sources.append({'sourceSha256':sha,'status':'OUTSIDE_CURRENT_MEBI_SCOPE','studentVisible':False});continue
        if digest(source)!=sha:raise ValueError('Current original mock source differs')
        count=0
        for card in data['cards']:
            image=Path(card['image']).resolve();pixel=Path(card['pixelProof']['path']).resolve()
            if not image.is_relative_to(APP/'veri') or not pixel.is_relative_to(APP/'veri'):raise ValueError('Mock evidence leaves repository data scope')
            reasons=[]
            if digest(image)!=card['imageSha256']:reasons.append('PRIOR_BODY_CROP_CHANGED')
            if digest(pixel)!=card['pixelProof']['sha256']:reasons.append('PRIOR_CROP_PROOF_CHANGED')
            if card.get('reviewConcerns'):reasons.extend(card['reviewConcerns'])
            if any(card['optionCounts'].get(c)!=1 for c in 'ABCDE'):reasons.append('NATIVE_CHOICES_REQUIRE_REVIEW')
            section=card['sectionId'].split(':')[-1]
            code=f'MEBI2-{sha[:12]}-S{section}-Q{card["printedNumber"]:03}'
            records.append({'code':code,'sourceSha256':sha,'relativePath':str(source.relative_to(SOURCE)),
                'sourceEvidence':card,'frozenPackage':str(package),'frozenPackageSha256':result['packageSha256'],
                'status':'SOURCE_BODY_CONTENT_REVIEW_REQUIRED' if reasons else 'SOURCE_BODY_KEY_PREPARED_SUBJECT_TOPIC_REVIEW_REQUIRED',
                'reasons':reasons or ['PRINTED_SECTION_BRANCH_AND_CONTROLLED_TOPIC_REVIEW_REQUIRED'],
                'studentVisible':False,'productionImportAllowed':False,'teacherApprovalInherited':False,'noveltyCheckRequired':False})
            count+=1
        sources.append({'sourceSha256':sha,'relativePath':str(source.relative_to(SOURCE)),'preparedQuestionRecords':count,'status':'CURRENT_SOURCE_CROP_PROOFS_RECONCILED_NOT_ADMITTED'})
        current=10*index//len(prior['results'])
        if current>bucket:
            print(json.dumps({'completedDocuments':index,'totalDocuments':len(prior['results']),'preparedQuestionRecords':len(records),'elapsedSeconds':round(time.monotonic()-started,2)}),flush=True);bucket=current
    if len(records)!=len({r['code'] for r in records}):raise ValueError('Mock source identities collided')
    report={'status':'MOCK_SOURCE_COVERAGE_RECONCILED_NOT_PUBLICATION','records':records,'sources':sources,
        'preparedQuestionRecords':len(records),'states':dict(Counter(r['status'] for r in records)),
        'sourceStates':dict(Counter(r['status'] for r in sources)),
        'priorManifestSha256':digest(progress),'questionWrites':0,'modelCalls':0,'sourceWrites':0}
    write_json(out/'report.json',report);print(json.dumps({k:v for k,v in report.items() if k not in ('records','sources')}))


if __name__=='__main__':run()
