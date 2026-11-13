"""Prepare mock source pixels and explicit Turkish-command topic candidates.

All other valid bodies remain in the explicit topic-review dataset. Printed
section introductions, never assumed exam-number conventions, bind subjects.
"""
import hashlib
import json
import re
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP, BASE, SOURCE
from mebi_pratik2_sozcuk_kirpim import word_region
from mebi_pratik2_uc_adim_kirpim import SHARED
from mebi_pratik2_deneme_kok_kaniti import classify
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json, process_lock

OUT = BASE/'three-step-mock-crops'
ROOT = BASE/'three-step-mock-discovery'
PACKAGE = 'three-step-mock-expansion'
ADDITIONAL = False
RANGES = re.compile(r'(Türk Dili ve Edebiyatı|Tarih(?:-[12])?|Coğrafya(?:-[12])?|Fizik|Kimya|Biyoloji|Felsefe Grubu|Felsefe|Din Kültürü ve Ahlak Bilgisi)\s*\((\d{1,2})\s*[-–]\s*(\d{1,2})\)', re.I)


def subject_for(candidate, introductions, exam):
    sec = candidate['sectionId']; n = candidate['printedNumber']
    if sec == 'TUR': return 'Türkçe', {'basis': 'PRINTED_TURKCE_SECTION', 'sectionId': sec}
    if sec == 'MAT': return None, {'basis': 'MATHEMATICS_OR_GEOMETRY_TOPIC_REQUIRES_REVIEW', 'sectionId': sec}
    identity = [candidate['step'], candidate['mock'], sec]
    matches = []
    for intro in introductions:
        if intro['identity'] != identity: continue
        text = ' '.join(l['text'] for l in sorted(intro['lines'], key=lambda l:l['bbox'][1]))
        for m in RANGES.finditer(text):
            if int(m[2]) <= n <= int(m[3]):
                label = normalize(m[1]); subject = {
                    'turk dili ve edebiyati': 'Türk Dili ve Edebiyatı', 'tarih': 'Tarih', 'tarih 1': 'Tarih', 'tarih 2': 'Tarih',
                    'cografya': 'Coğrafya', 'cografya 1': 'Coğrafya', 'cografya 2': 'Coğrafya', 'fizik': 'Fizik',
                    'kimya': 'Kimya', 'biyoloji': 'Biyoloji', 'felsefe': 'Felsefe',
                    'din kulturu ve ahlak bilgisi': 'Din Kültürü ve Ahlak Bilgisi',
                }.get(label)
                if subject: matches.append((subject, {'basis': 'SAME_STEP_MOCK_PRINTED_SECTION_RANGE', 'page': intro['page'],
                                                     'quote': m[0], 'sectionId': sec}))
    return matches[0] if len(matches) == 1 else (None, {'basis': 'PRINTED_SUBJECT_RANGE_NOT_UNIQUE_OR_MISSING', 'sectionId': sec})


def prepare_packages():
    folder = BASE/PACKAGE; folder.mkdir(exist_ok=True); target = folder/'chapter-packages.json'
    if target.exists(): return
    items = []; groups = {}
    for path in sorted(OUT.glob('*.json')):
        data = json.loads(path.read_text(encoding='utf8'))
        if not isinstance(data, dict): continue
        items += [r for r in data.get('items', []) if r.get('categoryId')]
        groups.update({g['groupId']: g for g in data.get('keyGroups', [])})
    used = {r['groupId'] for r in items}
    write_json(target, {'status': 'PRINTED_MOCK_LANGUAGE_PACKAGES_NOT_IMPORTED', 'items': items,
                        'keyGroups': [groups[g] for g in sorted(used)], 'candidateBodies': len(items),
                        'questionWrites': 0, 'teacherApprovalsCreated': 0})


def run():
    OUT.mkdir(exist_ok=True); started = time.monotonic(); summaries = []
    sources = json.loads((ROOT/'report.json').read_text(encoding='utf8'))['sources']
    cats = json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    reserved=set()
    if ADDITIONAL:
        for package in BASE.glob('*/chapter-packages.json'):
            reserved.update(r['code'] for r in json.loads(package.read_text(encoding='utf8')).get('items',[]))
    for source in sources:
        sha = source['sourceSha256']; target = OUT/(sha+'.json')
        if target.exists(): result = json.loads(target.read_text(encoding='utf8'))
        else:
            original = (SOURCE/source['relativePath']).resolve()
            if not original.is_relative_to(SOURCE): raise ValueError('Mock source leaves archive')
            with original.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest() != sha: raise ValueError('Mock source changed')
            data = json.loads((ROOT/(sha+'.json')).read_text(encoding='utf8'))
            exam = 'TYT' if source['relativePath'].startswith('TYT') else 'AYT'
            items = []; review = []; groups = {}
            previous={}
            if ADDITIONAL:
                prior=json.loads((BASE/'three-step-mock-crops'/(sha+'.json')).read_text(encoding='utf8'))
                previous={r['code']:r for r in prior['items']}
            with pymupdf.open(original) as pdf:
                for index, candidate in enumerate(data['candidates'], 1):
                    body = candidate['body']; evidence = candidate['keyEvidence']; page = pdf[body['page']-1]
                    numbers = sorted(int(n['text']) for n in evidence['numberHeader'])
                    identity = f"S{candidate['step']}-D{candidate['mock']}-{candidate['sectionId']}"
                    group_id = sha[:16]+'-MOCK-'+identity+f'-N{numbers[0]}-{numbers[-1]}'
                    if group_id not in groups:
                        boxes = [evidence['stepLabel']['bbox'], evidence['sectionHeading']['bbox']]
                        boxes += [a['numberBBox'] for a in evidence['answers']]+[a['answerBBox'] for a in evidence['answers']]
                        kp = pdf[candidate['keyPage']-1]
                        clip = [max(0,min(b[0] for b in boxes)-3), max(0,min(b[1] for b in boxes)-3),
                                min(kp.rect.width,max(b[2] for b in boxes)+3), min(kp.rect.height,max(b[3] for b in boxes)+3)]
                        image = OUT.name+'/'+group_id+'-key.png'; kp.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(clip),alpha=False).save(BASE/image)
                        groups[group_id] = {'groupId': group_id, 'sourceSha256': sha, 'relativePath': source['relativePath'],
                            'keyIdentityType': 'THREE_STEP_MOCK_NUMBER_MATRIX', 'step': candidate['step'], 'mock': candidate['mock'],
                            'sectionId': candidate['sectionId'], 'keyPage': candidate['keyPage'], 'keyClip': clip, 'keyImage': image,
                            'keyImageSha256': hashlib.sha256((BASE/image).read_bytes()).hexdigest(), 'matrixSourceEvidence': evidence,
                            'answers': {str(a['printedNumber']): a['answer'] for a in evidence['answers']}}
                    group = groups[group_id]; number = candidate['printedNumber']; code = f'MEBI2-{sha[:12]}-MOCK-{identity}-Q{number:03}'
                    if code in reserved:continue
                    clip = [page.rect.width/2+1 if body['column'] else 0, body['bbox'][1]-4,
                            page.rect.width if body['column'] else page.rect.width/2-1, body['columnEndY']]
                    clip, proof, reasons = word_region(page, clip, number)
                    if code in previous and previous[code]['bodyClip']==clip:continue
                    for m in SHARED.finditer(page.get_text()):
                        if int(m[1]) <= number <= int(m[2]): reasons.append('SHARED_MOCK_CONTEXT_REQUIRES_EXPLICIT_REGIONS')
                    subject, subject_evidence = subject_for(candidate, data['printedSectionIntroductions'], exam)
                    title, quote = classify(proof['sourceText']) if subject == 'Türkçe' else (None, None)
                    choices = [c for c in cats if c.get('selectable') and c['id'].startswith('excel.') and c['exam'] == exam
                               and c['subject'] == subject and c['topic'] == title]
                    cat = choices[0] if len(choices) == 1 else None
                    row = {'code': code, 'sourceSha256': sha, 'relativePath': source['relativePath'], 'groupId': group_id,
                           'printedNumber': number, 'testNumber': identity, 'exam': exam, 'subject': subject,
                           'subjectCandidates': [subject] if subject else [], 'subjectId': cat['subjectId'] if cat else None,
                           'categoryId': cat['id'] if cat else None, 'topic': cat['topic'] if cat else None,
                           'unit': cat.get('unit') if cat else None, 'bodyPage': body['page'], 'bodyClip': clip,
                           'keyPage': group['keyPage'], 'keyClip': group['keyClip'], 'keyImage': group['keyImage'],
                           'keyImageSha256': group['keyImageSha256'], 'answer': candidate['answer'], 'subjectEvidence': subject_evidence,
                           'topicEvidence': {'basis': 'EXPLICIT_QUESTION_COMMAND_NOT_INCIDENTAL_OPTION', 'quote': quote} if cat else None,
                           'wordBodyProof': proof, 'nativeBodyProof': {'status': 'LOCAL_VISUAL_BODY_REVIEW_REQUIRED', 'uniqueChoiceCounts': proof['uniqueChoiceCounts']},
                           'studentVisible': False, 'productionImportAllowed': False, 'teacherApproved': False}
                    if ADDITIONAL:row.update(newLayoutEvidence=True,previousBodyClip=previous.get(code,{}).get('bodyClip'))
                    if reasons:
                        review.append({**row, 'reasons': sorted(set(reasons)), 'status': 'SOURCE_BODY_LAYOUT_REVIEW_REQUIRED'}); continue
                    image = OUT.name+'/'+code+'.png'; page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(clip),alpha=False).save(BASE/image)
                    items.append({**row, 'image': image, 'imageSha256': hashlib.sha256((BASE/image).read_bytes()).hexdigest(),
                                  'status': 'SOURCE_PIXELS_AND_NATIVE_KEY_REQUIRE_INDEPENDENT_ADMISSION',
                                  'reasons': [] if cat else ['FINE_TOPIC_NOT_YET_VERIFIED']})
                    if index % 500 == 0:
                        print(json.dumps({'source': sha[:12], 'completed': index, 'total': len(data['candidates']),
                                          'elapsedSeconds': round(time.monotonic()-started,1)}),flush=True)
            result = {'sourceSha256': sha, 'relativePath': source['relativePath'], 'items': items, 'keyGroups': list(groups.values()),
                      'reviewQueueAdditions': review, 'preparedBodies': len(items), 'controlledTopicBodies': sum(bool(r['categoryId']) for r in items),
                      'questionWrites': 0, 'teacherApprovalsCreated': 0}; write_json(target,result)
        summaries.append({k:result[k] for k in ('sourceSha256','preparedBodies','controlledTopicBodies')})
        print(json.dumps(summaries[-1]),flush=True)
    write_json(OUT/'report.json',{'sources':summaries,'status':'MOCK_SOURCE_CROPS_PREPARED_NOT_ADMISSION',
                                'preparedBodies':sum(s['preparedBodies'] for s in summaries),
                                'controlledTopicBodies':sum(s['controlledTopicBodies'] for s in summaries), 'questionWrites':0})
    prepare_packages()


if __name__ == '__main__':
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser();p.add_argument('--discovery-dir',default=ROOT.name);p.add_argument('--output-dir',default=OUT.name)
    p.add_argument('--package-dir',default=PACKAGE);p.add_argument('--additional-only',action='store_true');a=p.parse_args()
    if any(Path(n).name!=n for n in (a.discovery_dir,a.output_dir,a.package_dir)):raise ValueError('Unsafe mock package path')
    if a.additional_only and a.output_dir=='three-step-mock-crops':raise ValueError('Original mock crops must be preserved')
    ROOT=BASE/a.discovery_dir;OUT=BASE/a.output_dir;PACKAGE=a.package_dir;ADDITIONAL=a.additional_only
    with process_lock(BASE/'.jobs'/(OUT.name+'.lock')): run()
