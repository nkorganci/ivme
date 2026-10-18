"""Reconcile every local educational source and write an honest quality queue.

Coverage measures identity/evidence completeness, not independently measured
classification accuracy. Curriculum reference documents support the taxonomy;
personal photographs and duplicate header fragments are explicitly accounted for.
"""
import hashlib
import importlib.util
import json
import re
import zipfile
from collections import Counter
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
STATE = APP / 'veri/content-labels'
SUBJECTS = {'Turkce':'turkce','Matematik':'matematik','Geometri':'geometri','Fizik':'fizik','Kimya':'kimya',
    'Biyoloji':'biyoloji','Tarih':'tarih','Cografya':'cografya','Felsefe':'felsefe','Din_Kulturu':'din'}
FRAGMENTS = {'cd-2021-tyt-genel-deneme-01-39':'cd-2021-tyt-genel-deneme-01-40',
    'yk-turk-dili-ve-edebiyati-tyt-test-09-01-14':'yk-turk-dili-ve-edebiyati-tyt-test-09-01-15'}

def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))

def main():
    data = read(STATE / 'labels.json')
    summary = read(STATE / 'report.json')
    cats = {c['id']:c for c in data['categories']}
    items = {i['key']:i for i in data['items']}
    failures = []
    for item in items.values():
        labels = item['automaticLabels']
        if not labels.get('evidence') or not labels.get('assignments'):
            failures.append({'key':item['key'],'reason':'MISSING_LABEL_OR_EVIDENCE'})
        if any(a['categoryId'] not in cats for a in labels['assignments']):
            failures.append({'key':item['key'],'reason':'UNKNOWN_CATEGORY'})
    pdf = read(APP / 'backend/src/main/resources/pdf-review-labels.json')
    pdf_paths = {}
    for item in pdf['items']:
        if not item.get('relativePath'):
            continue
        base = ROOT / 'Kaynaklar' if item.get('sourceScope') == 'RESOURCES' else ROOT / 'Kaynaklar/ogm-materyal'
        p = base / item['relativePath']
        if p.is_file():
            if hashlib.sha256(p.read_bytes()).hexdigest() != item['sourceSha256']:
                failures.append({'key':item['key'],'reason':'PDF_HASH_CHANGED'})
            pdf_paths.setdefault(p.resolve(),[]).append(item['key'])
        elif item['availability'] == 'available':
            failures.append({'key':item['key'],'reason':'PDF_DISAPPEARED'})
    physical_pdfs = set(p.resolve() for p in (ROOT / 'Kaynaklar').rglob('*.pdf'))
    for p in sorted(physical_pdfs-set(pdf_paths)):
        failures.append({'source':str(p.relative_to(ROOT)),'reason':'PDF_NOT_LABELLED'})
    raw_codes = set()
    official=json.loads((ROOT/'veri-hatti/ogm-yks-cikmis/ham/sorular_son.json').read_text(encoding='utf-8'))
    official_codes={r['id'] for r in official.get('sorular',official.get('kayitlar',[]))}
    for code in sorted(official_codes):
        if 'question:'+code not in items:failures.append({'key':'question:'+code,'reason':'UNACCOUNTED_OFFICIAL_SOURCE_CARD'})
    fragments = []
    for p in (ROOT / 'veri-hatti/ogm-sorular/kayit').glob('*.json'):
        raw = read(p)
        rows = raw if isinstance(raw,list) else raw.get('kayitlar',raw.get('sorular',[]))
        for r in rows:
            code = str(r.get('id',''))
            if not code:
                continue
            raw_codes.add(code)
            if f'question:{code}' in items:
                continue
            replacement = FRAGMENTS.get(code)
            successor = next((s for s in rows if s.get('id') == replacement), None)
            if not successor or not successor.get('grup') or not set(r['nolar']).issubset(successor['grup']) or r.get('metin','').strip():
                failures.append({'source':code,'reason':'RAW_QUESTION_NOT_ACCOUNTED_FOR'})
            else:
                fragments.append({'key':code,'coveredBy':f'question:{replacement}',
                    'reason':'DUPLICATE_GROUP_HEADER_FRAGMENT','source':p.relative_to(ROOT).as_posix(),
                    'categoryIds':items[f'question:{replacement}']['categoryIds']})
    # These documents define topic scope and historical distributions; they are not lesson prose.
    references = []
    for p in sorted((ROOT / 'Kaynaklar/mufredat').rglob('*.md')):
        exam = 'TYT' if 'TYT' in p.stem else 'AYT' if 'AYT' in p.stem else None
        branch = next((b for name,b in SUBJECTS.items() if p.stem == f'{exam}_{name}'), None)
        selected = [c['id'] for c in cats.values() if c.get('origin') == 'CURRICULUM' and not c.get('subtopic')
            and (not exam or c['exam']==exam) and (not branch or c['subjectId']==branch)
            and ('Sayisal' not in p.stem or c['subjectId'] in ['matematik','geometri','fizik','kimya','biyoloji'])]
        if not selected:
            failures.append({'source':str(p),'reason':'REFERENCE_SCOPE_MISSING'})
        references.append({'source':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
            'kind':'CURRICULUM_REFERENCE','categoryIds':selected,'basis':'EXPLICIT_DOCUMENT_SCOPE',
            'contentFormat':'CALISMA_REHBERI','teacherApproved':False})
    curriculum_count = len(references)
    # The preserved HTML files are solution indexes for the question bank, not new lectures.
    html_branches = {'biyoloji':['biyoloji'],'cografya':['cografya'],'din kulturu':['din'],
        'felsefe':['felsefe'],'fizik':['fizik'],'kimya':['kimya'],'matematik':['matematik','geometri'],
        'tarih':['tarih'],'inkilap':['tarih'],'turk dili':['edebiyat','turkce']}
    for p in sorted((ROOT / 'Kaynaklar').rglob('*.html')):
        branches = next((ids for stem,ids in html_branches.items() if stem in p.stem.lower()),None)
        if p.name != 'index.html' and not branches:
            failures.append({'source':str(p),'reason':'SOLUTION_INDEX_SCOPE_MISSING'})
        selected = [c['id'] for c in cats.values() if c.get('origin')=='CURRICULUM' and not c.get('subtopic')
            and (branches is None or c['subjectId'] in branches)]
        grade = re.search(r'(9|10|11|12)\. Sinif',p.stem)
        references.append({'source':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
            'kind':'SOLUTION_INDEX','categoryIds':selected,'basis':'EXPLICIT_SOURCE_SUBJECT_SCOPE',
            'grades':[int(grade[1])] if grade else [],'contentFormat':'CALISMA_REHBERI','teacherApproved':False})
    archives = []
    pdf_hashes = {i['sourceSha256']:i['key'] for i in pdf['items'] if i.get('sourceSha256')}
    for p in sorted((ROOT / 'Kaynaklar').rglob('*.zip')):
        members = []
        with zipfile.ZipFile(p) as archive:
            for member in archive.infolist():
                if member.is_dir():
                    continue
                digest = hashlib.sha256(archive.read(member)).hexdigest()
                covered = pdf_hashes.get(digest)
                if not covered:
                    failures.append({'source':str(p),'member':member.filename,'reason':'ARCHIVE_MEMBER_NOT_ACCOUNTED_FOR'})
                members.append({'member':member.filename,'sha256':digest,'coveredBy':covered,
                    'categoryIds':items[covered]['categoryIds'] if covered else []})
        archives.append({'source':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'members':members})
    exclusions = [{'source':p.relative_to(ROOT).as_posix(),'reason':'PERSONAL_PHOTOGRAPH_NOT_EDUCATIONAL_CONTENT'}
        for p in sorted((ROOT / 'Kaynaklar/resimler').glob('*.jpeg'))]
    exclusions.extend({'source':p.relative_to(ROOT).as_posix(),'reason':'REPOSITORY_DOCUMENTATION'}
        for p in sorted((ROOT / 'Kaynaklar').rglob('README.md')))
    for p in sorted((ROOT / 'Kaynaklar').rglob('ICINDEKILER.md')):
        references.append({'source':p.relative_to(ROOT).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
            'kind':'SOURCE_INDEX','categoryIds':[c['id'] for c in cats.values() if c.get('origin')=='CURRICULUM' and not c.get('subtopic')],
            'basis':'EXPLICIT_SOURCE_INDEX_SCOPE','contentFormat':'CALISMA_REHBERI','teacherApproved':False})
    all_files = {p.relative_to(ROOT).as_posix() for p in (ROOT / 'Kaynaklar').rglob('*') if p.is_file()}
    accounted = {p.relative_to(ROOT).as_posix() for p in pdf_paths}
    accounted.update(r['source'] for r in references+archives+exclusions)
    for p in sorted(all_files-accounted):
        failures.append({'source':p,'reason':'UNACCOUNTED_SOURCE_FILE'})
    spec = importlib.util.spec_from_file_location('workset', APP / 'scripts/content-label-workset.py')
    workset = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(workset)
    previous_queue = {}
    queue_file = STATE / 'quality-review-queue.jsonl'
    if queue_file.exists():
        with queue_file.open(encoding='utf-8') as stream:
            previous_queue = {r['key']: r for line in stream if (r := json.loads(line))}
    queue = []
    broad = 0
    question_check = read(STATE / 'question-check.json') if (STATE / 'question-check.json').exists() else {}
    if question_check.get('runKey') != summary['runKey'] or question_check.get('status') != 'PASS':
        raise ValueError('Run question-label-check.py for this label version before auditing')
    for i in items.values():
        reasons = set(workset.missing_reasons(i, cats))
        reasons.update(question_check.get('issues', {}).get(i['key'], []))
        if any(a.get('confidence') == 'LOW' for a in i['automaticLabels']['assignments']):
            reasons.add('LOW_CONFIDENCE')
        if any(a.get('locatorStatus') == 'ESTIMATED' for a in i['automaticLabels']['assignments']):
            reasons.add('LOCATION_REQUIRES_REVIEW')
        if all(cats[a['categoryId']]['topic']=='Dersin genel kapsamı' for a in i['automaticLabels']['assignments']):
            reasons.add('BROAD_DOCUMENT_SCOPE'); broad += 1
        if not reasons:
            continue
        priority = workset.priority(i, reasons)
        queue.append({'key':i['key'],'priority':priority,'reasons':sorted(reasons),'kind':i['kind'],
            'exam':i['exam'],'subjectId':i['subjectId'],'availability':i['availability'],
            'nextAction':'REPAIR_SOURCE' if priority == 1 else 'REVIEW_RELATION_EVIDENCE_AND_LOCATION'})
    queue.sort(key=lambda r:(r['priority'],r['key']))
    with (STATE / 'quality-review-queue.jsonl').open('w',encoding='utf8') as out:
        for record in queue:
            out.write(json.dumps(record,ensure_ascii=False)+'\n')
    # Include ordinary source-labelled records in the review sample, too.
    strata = {}
    for i in items.values():
        k = (i['kind'],i['exam'],i['subjectId'],i['automaticLabels']['basis'])
        strata.setdefault(k,[]).append(i['key'])
    sample = [key for keys in strata.values() for key in sorted(keys,key=lambda k:hashlib.sha256(k.encode()).hexdigest())[:3]]
    result = {'version':1,'runKey':summary['runKey'],'resources':len(items),'unlabelled':sum(not i['automaticLabels']['assignments'] for i in items.values()),
        'physicalPdfs':len(physical_pdfs),'coveredPhysicalPdfs':len(physical_pdfs & set(pdf_paths)),
        'pdfHashesVerified':sum(len(v) for v in pdf_paths.values()),'curriculumReferences':curriculum_count,
        'solutionIndexes':sum(r['kind']=='SOLUTION_INDEX' for r in references),'archives':archives,'archiveCount':len(archives),
        'sourceFiles':len(all_files),'accountedSourceFiles':len(all_files & accounted),'unaccountedSourceFiles':len(all_files-accounted),
        'rawQuestionCards':len(raw_codes),'duplicateHeaderFragments':fragments,'nonEducationalExclusions':exclusions,
        'broadDocumentScopes':broad,'qualityReviewQueue':len(queue),'priorityCounts':dict(Counter(r['priority'] for r in queue)),
        'queueDelta':{'added':sum(r['key'] not in previous_queue for r in queue),
            'changed':sum(r['key'] in previous_queue and r['reasons'] != previous_queue[r['key']]['reasons'] for r in queue),
            'resolved':len(previous_queue.keys() - {r['key'] for r in queue})},
        'relationConfidence':dict(Counter(a.get('confidence','MISSING') for i in items.values() for a in i['automaticLabels']['assignments'])),
        'relationLocatorStatus':dict(Counter(a.get('locatorStatus','MISSING') for i in items.values() for a in i['automaticLabels']['assignments'])),
        'questionSourcePages':sum(i.get('sourceLocationStatus') == 'ESTIMATED' for i in items.values() if i['kind'] == 'QUESTION'),
        'noteSupportReferences':sum(len(i.get('supportingSources',[])) for i in items.values() if i['kind'] == 'NOTE'),
        'relationEvidence':sum(any(e.get('association') == 'RELATION' for e in a.get('evidence',[])) for i in items.values() for a in i['automaticLabels']['assignments']),
        'teacherApproved':0,'independentAccuracyMeasured':False,'failures':failures,
        'ordinaryAndFlaggedReviewSample':sample,'byBasis':dict(Counter(i['automaticLabels']['basis'] for i in items.values()))}
    (STATE / 'curriculum-reference-labels.json').write_text(json.dumps(references,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    (STATE / 'audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps({k:v for k,v in result.items() if k not in ['duplicateHeaderFragments','nonEducationalExclusions','ordinaryAndFlaggedReviewSample','byBasis','archives']},ensure_ascii=False))
    if failures:
        raise SystemExit('Source coverage audit failed; see audit.json')

if __name__ == '__main__':
    main()
