"""Reuse all current mock source proofs without inheriting novelty decisions.

Original two key readings are checked against fresh 220-dpi source pixels;
the publication key is separately rendered at 3x. Existing body IDs survive.
Known language-command topics enter the publisher queue; the rest stay in a
separate evidence queue. No teacher approval or database write is created.
"""
import hashlib
import json
import time
from collections import Counter
from pathlib import Path
import pymupdf
from PIL import Image
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_deneme_kok_kaniti import classify
from yks_deneme_anahtar_pilotu import partition_key
from yks_tam_deneme_anahtar import mock_identity
from yks_anahtar_gorsel import checked_reading
from yks_anahtar_cohort import read_pairs,OCR_PAIR
from yks_istisna_kirpim import verify_image
from yks_birlestirme import write_json,process_lock

OUT=BASE/'full-mock-source-crops'
OLD=APP/'veri/yks-birlestirme/20261107t212333-f17dbdba/pdf-on-tarama/full-mock-keys'


def pairs(values):
    result={str(r['number']):r['answer'] for r in values}
    return result if result and len(result)==len(values) and all(v in 'ABCDE' and len(v)==1 for v in result.values()) else None


def validate_independent_section(section):
    proof=json.loads(Path(section['evidencePath']).read_text(encoding='utf8'))
    if section['readingMethod']=='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE':
        if proof['identity']['cropSha256']!=section['cropSha256']:raise ValueError('Original key/model image binding differs')
        actual=checked_reading(proof['response'])
    else:
        if proof['cropSha256']!=section['cropSha256']:raise ValueError('Original key/OCR image binding differs')
        actual=read_pairs(proof['text'],OCR_PAIR)
    if actual is None or pairs(actual)!=pairs(section['answers']) or pairs(actual)!=pairs(section['independentAnswers']):
        raise ValueError('Actual independent transcription differs from the saved summary')


def reuse_key(group,pdf,root,force_validation=False):
    target=root/'independent-keys'/(group['groupId']+'.json');target.parent.mkdir(exist_ok=True,parents=True)
    if target.exists() and not force_validation:
        result=json.loads(target.read_text(encoding='utf8'))
        if result['imageSha256']!=group['keyImageSha256']:raise ValueError('Mock key receipt pixels changed')
        return result
    report=(APP/group['priorKeyReport']).resolve()
    if not report.is_relative_to(APP/'veri') or hashlib.sha256(report.read_bytes()).hexdigest()!=group['priorKeyReportSha256']:
        raise ValueError('Prior mock key report changed')
    old=json.loads(report.read_text(encoding='utf8'))['result']
    selected=[s for s in old['sections'] if s['sectionId']==group['sectionId']]
    if old['sourceSha256']!=group['sourceSha256'] or old['status']!='SOURCE_MOCK_KEY_VERIFIED' or len(selected)!=1:
        raise ValueError('Prior source key section is not verified')
    section=selected[0]
    if section['status']!='TWO_PRINTED_SOURCE_READINGS_AGREE' or pairs(section['answers'])!=group['answers'] or pairs(section['independentAnswers'])!=group['answers']:
        raise ValueError('Prior independent numbered answers differ')
    for path_field,hash_field in [('cropPath','cropSha256'),('evidencePath','keyEvidenceSha256')]:
        path=Path(section[path_field]).resolve()
        if not path.is_relative_to(APP/'veri') or hashlib.sha256(path.read_bytes()).hexdigest()!=section[hash_field]:
            raise ValueError('Prior independent key evidence changed')
    validate_independent_section(section)
    if mock_identity(pdf,group['exam'])!=old['printedMockNumber']:raise ValueError('Printed body/key mock identity differs')
    page=pdf[group['keyPage']-1];fresh=page.get_pixmap(dpi=220,clip=pymupdf.Rect(group['keyClip']),alpha=False)
    saved=pymupdf.Pixmap(section['cropPath'])
    if (fresh.width,fresh.height,fresh.n,fresh.samples)!=(saved.width,saved.height,saved.n,saved.samples):
        raise ValueError('Prior key pixels do not match fresh original source')
    current=next(s for s in partition_key(page,group['exam']) if s['sectionId']==group['sectionId'])
    if pairs(current['answers'])!=group['answers']:raise ValueError('Fresh numbered mock key differs')
    result={'status':'AGREES','imageSha256':group['keyImageSha256'],'method':'PRIOR_TWO_SECTION_READINGS_FRESH_ORIGINAL_220_DPI_PIXELS_AND_NATIVE_NUMBERS',
            'priorEvidencePath':section['evidencePath'],'priorEvidenceSha256':section['keyEvidenceSha256'],
            'priorReport':group['priorKeyReport'],'priorReportSha256':group['priorKeyReportSha256'],
            'fresh220DpiPixelSha256':hashlib.sha256(fresh.samples).hexdigest(),'sectionId':group['sectionId'],
            'actualIndependentTranscriptionReparsed':True,'printedBodyKeyMockIdentityRechecked':True,
            'teacherApproved':False,'newModelCalls':0};write_json(target,result);return result


def run():
    OUT.mkdir(exist_ok=True);started=time.monotonic();records=json.loads((BASE/'full-mock-source-reuse/report.json').read_text(encoding='utf8'))['records']
    target=OUT/'report.json'
    if target.exists():return
    reserved=set()
    for p in BASE.glob('*/chapter-packages.json'):reserved.update(r['code'] for r in json.loads(p.read_text(encoding='utf8')).get('items',[]))
    for p in BASE.rglob('source-pixel-acceptance.json'):reserved.update(r['code'] for r in json.loads(p.read_text(encoding='utf8')).get('accepted',[]))
    cats=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    by_source={}
    for record in records:
        if record['code'] not in reserved:by_source.setdefault(record['sourceSha256'],[]).append(record)
    summaries=[];all_items=[];all_groups={};review=[]
    for index,(sha,rows) in enumerate(by_source.items(),1):
        checkpoint=OUT/(sha+'.json')
        if checkpoint.exists():
            saved=json.loads(checkpoint.read_text(encoding='utf8'));all_items.extend(saved['items'])
            all_groups.update({g['groupId']:g for g in saved['keyGroups']});review.extend(saved['reviewQueueAdditions'])
            summaries.append({k:saved[k] for k in ('sourceSha256','relativePath','preparedBodies','controlledTopicBodies')})
            print(json.dumps({'completedSources':index,'totalSources':len(by_source),'checkpointReused':True,'preparedBodies':len(all_items)}),flush=True)
            continue
        source=(SOURCE/rows[0]['relativePath']).resolve()
        if not source.is_relative_to(SOURCE):raise ValueError('Mock source leaves current reference archive')
        with source.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original mock changed')
        old_report=OLD/(sha+'.json');report_sha=hashlib.sha256(old_report.read_bytes()).hexdigest()
        prior=json.loads(old_report.read_text(encoding='utf8'))['result'];groups={};items=[]
        with pymupdf.open(source) as pdf:
            for record in rows:
                c=record['sourceEvidence'];number=c['printedNumber'];code=record['code']
                if c['reviewConcerns'] or any(c['optionCounts'].get(x)!=1 for x in 'ABCDE'):
                    review.append({'code':code,'sourceSha256':sha,'reasons':['PRIOR_MOCK_BODY_STRUCTURE_REQUIRES_REVIEW'],'studentVisible':False});continue
                old_image=Path(c['image']).resolve();pixel=Path(c['pixelProof']['path']).resolve()
                if not old_image.is_relative_to(APP/'veri') or not pixel.is_relative_to(APP/'veri'):raise ValueError('Mock crop leaves repository evidence')
                if hashlib.sha256(old_image.read_bytes()).hexdigest()!=c['imageSha256'] or hashlib.sha256(pixel.read_bytes()).hexdigest()!=c['pixelProof']['sha256']:
                    raise ValueError('Frozen source body proof changed')
                try:verify_image(pdf,c['sourceRegions'],old_image)
                except ValueError:
                    review.append({'code':code,'sourceSha256':sha,'reasons':['FRESH_PRIOR_MOCK_BODY_PIXELS_DO_NOT_MATCH'],'studentVisible':False});continue
                section=next(s for s in prior['sections'] if s['sectionId']==c['sectionId'])
                gid=sha[:16]+'-FULL-MOCK-'+c['sectionId'].replace(':','-')
                if gid not in groups:
                    clip=section['keyBboxPt'];image=OUT.name+'/'+gid+'-key.png'
                    pdf[c['sourceKeyPage']-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(clip),alpha=False).save(BASE/image)
                    group={'groupId':gid,'sourceSha256':sha,'relativePath':record['relativePath'],'exam':c['exam'],
                           'keyIdentityType':'PREVERIFIED_MOCK_SECTION','sectionId':c['sectionId'],'keyPage':c['sourceKeyPage'],
                           'keyClip':clip,'keyImage':image,'keyImageSha256':hashlib.sha256((BASE/image).read_bytes()).hexdigest(),
                           'answers':pairs(section['answers']),'priorKeyReport':str(old_report.relative_to(APP)),
                           'priorKeyReportSha256':report_sha}
                    # The report is elsewhere under APP/veri, so store an APP
                    # relative location explicitly rather than escape BASE.
                    group['priorKeyReport']=str(old_report.relative_to(APP))
                    groups[gid]=group
                group=groups[gid]
                if group['answers'].get(str(number))!=c['answer'] or section['keyEvidenceSha256']!=c['keyEvidenceSha256']:
                    review.append({'code':code,'sourceSha256':sha,'reasons':['FROZEN_MOCK_ANSWER_OR_SECTION_EVIDENCE_DIFFERS'],'studentVisible':False});continue
                title,quote=classify(c['text']) if c['sectionId']=='TYT:1' or c['sectionId']=='AYT:1' and number<=6 else (None,None)
                choices=[x for x in cats if x.get('selectable') and x['id'].startswith('excel.') and x['exam']==c['exam'] and x['subject']=='Türkçe' and x['topic']==title]
                category=choices[0] if len(choices)==1 else None
                image=OUT.name+'/'+code+'.png'
                if not (BASE/image).exists():
                    with Image.open(old_image) as saved:saved.save(BASE/image,format='PNG')
                with Image.open(old_image) as original,Image.open(BASE/image) as converted:
                    if (original.mode,original.size,original.tobytes())!=(converted.mode,converted.size,converted.tobytes()):
                        raise ValueError('Mock PNG conversion changed original pixels')
                row={'code':code,'sourceSha256':sha,'relativePath':record['relativePath'],'groupId':gid,'printedNumber':number,
                     'testNumber':str(c['printedMockNumber'])+' / '+c['sectionId'],'exam':c['exam'],'subject':'Türkçe' if category else None,
                     'subjectCandidates':['Türkçe'] if category else [],'subjectId':category['subjectId'] if category else None,
                     'categoryId':category['id'] if category else None,'topic':category['topic'] if category else None,
                     'unit':category.get('unit') if category else None,'bodyPage':c['pdfPage'],'bodyClip':c['bboxPt'],
                     'image':image,'imageSha256':hashlib.sha256((BASE/image).read_bytes()).hexdigest(),
                     'keyPage':group['keyPage'],'keyClip':group['keyClip'],'keyImage':group['keyImage'],'keyImageSha256':group['keyImageSha256'],
                     'answer':c['answer'],'sourceRegions':c['sourceRegions'],'priorSourcePixelProof':c['pixelProof'],
                     'sourceIntentEvidence':{'quote':quote,'reference':c['code']} if category else None,
                     'productionImportAllowed':False,'studentVisible':False,'teacherApproved':False}
                items.append(row)
            for name,selected in [('full-mock-expansion',[r for r in items if r['categoryId']]),('full-mock-pending-evidence',[r for r in items if not r['categoryId']])]:
                root=BASE/name;root.mkdir(exist_ok=True)
                for gid in {r['groupId'] for r in selected}:reuse_key(groups[gid],pdf,root)
        all_items.extend(items);all_groups.update(groups);summaries.append({'sourceSha256':sha,'relativePath':rows[0]['relativePath'],
            'preparedBodies':len(items),'controlledTopicBodies':sum(bool(r['categoryId']) for r in items)})
        write_json(checkpoint,{**summaries[-1],'items':items,'keyGroups':list(groups.values()),
            'reviewQueueAdditions':[r for r in review if r['sourceSha256']==sha]})
        print(json.dumps({'completedSources':index,'totalSources':len(by_source),'preparedBodies':len(all_items),
                          'controlledTopicBodies':sum(s['controlledTopicBodies'] for s in summaries),'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    for name,selected in [('full-mock-expansion',[r for r in all_items if r['categoryId']]),('full-mock-pending-evidence',[r for r in all_items if not r['categoryId']])]:
        root=BASE/name;root.mkdir(exist_ok=True);manifest=root/'chapter-packages.json'
        if manifest.exists():raise ValueError('Mock package is immutable')
        used={r['groupId'] for r in selected}
        write_json(manifest,{'status':'CURRENT_MOCK_SOURCE_EVIDENCE_READY_NOT_ADMITTED','items':selected,'keyGroups':[all_groups[g] for g in sorted(used)],
                             'candidateBodies':len(selected),'questionWrites':0,'teacherApprovalsCreated':0})
    write_json(target,{'status':'CURRENT_MOCK_SOURCE_CROPS_PREPARED_NOT_PUBLISHED','sources':summaries,'reviewQueueAdditions':review,
                       'items':all_items,'keyGroups':list(all_groups.values()),'preparedBodies':len(all_items),
                       'controlledTopicBodies':sum(bool(r['categoryId']) for r in all_items),'questionWrites':0,'newModelCalls':0})
    write_source_views()


def write_source_views():
    data=json.loads((OUT/'report.json').read_text(encoding='utf8'))
    for source in data['sources']:
        sha=source['sourceSha256']
        write_json(OUT/(sha+'.json'),{**source,'items':[r for r in data['items'] if r['sourceSha256']==sha],
            'keyGroups':[g for g in data['keyGroups'] if g['sourceSha256']==sha],
            'reviewQueueAdditions':[r for r in data['reviewQueueAdditions'] if r['sourceSha256']==sha]})


def audit_keys():
    packages=[BASE/name/'chapter-packages.json' for name in ('full-mock-expansion','full-mock-pending-evidence')]
    checked=0;opened={}
    try:
        for package in packages:
            data=json.loads(package.read_text(encoding='utf8'))
            for group in data['keyGroups']:
                sha=group['sourceSha256']
                if sha not in opened:
                    source=(SOURCE/group['relativePath']).resolve()
                    if not source.is_relative_to(SOURCE):raise ValueError('Mock audit leaves source archive')
                    with source.open('rb') as stream:
                        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Mock audit source changed')
                    opened[sha]=pymupdf.open(source)
                reuse_key(group,opened[sha],package.parent,force_validation=True);checked+=1
        write_json(OUT/'key-reuse-audit.json',{'status':'PASS','checkedGroups':checked,'actualTranscriptionsReparsed':True,
            'fresh220DpiAndMockIdentityVerified':True,'questionWrites':0,'newModelCalls':0})
        write_source_views()
        print(json.dumps({'status':'PASS','checkedGroups':checked,'newModelCalls':0}),flush=True)
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--audit-keys',action='store_true');args=p.parse_args()
    with process_lock(BASE/'.jobs/full-mock-source-crops.lock'):
        audit_keys() if args.audit_keys else run()
