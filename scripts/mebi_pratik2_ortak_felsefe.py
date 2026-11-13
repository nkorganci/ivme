"""Resolve explicitly printed dual-exam philosophy test chapters.

The earlier folder parser missed '(TYT-AYT)' and left the subject empty.
Only complete chapter-to-existing-main-row containment is accepted. Other
philosophy chapters remain in review; no topic is guessed from answer choices.
"""
import hashlib
import json
import re
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json,process_lock

OUT=BASE/'dual-exam-philosophy-expansion'
RULES={
    'din felsefesi':'Din Felsefesinin Konusu ve Soruları',
    'siyaset felsefesi':'Siyaset Felsefesinin Konusu ve Problemleri',
    'sanat felsefesi':'Sanat Felsefesinin Konusu ve Problemleri',
}


def categories_for(headings,categories):
    texts=[l['text'] for l in headings]
    if not any(normalize(t)=='felsefe' for t in texts):return []
    if not any(re.search(r'TYT\s*/\s*AYT\s+TARAMA',t,re.I) for t in texts):return []
    titles={normalize(t.lstrip('>• ').strip()) for t in texts if t.lstrip().startswith(('>','•'))}
    matches=[]
    for title in titles:
        target=RULES.get(title)
        if title=='bilim felsefesi':
            target='Bilim Felsefesinin Konusu ve Problemleri'
        if not target:continue
        for exam in ('TYT','AYT'):
            choices=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam
                     and c['subject']=='Felsefe' and c['topic']==target]
            if len(choices)==1:matches.append((choices[0],title))
    # Multiple different printed chapter headings cannot select a single topic.
    if len({t for _,t in matches})!=1:return []
    return matches


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return
    source=BASE/'single-test-pending-evidence/chapter-packages.json'
    old=json.loads(source.read_text(encoding='utf8'));cats=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    source_groups={g['groupId']:g for g in old['keyGroups']};items=[];groups={};sources={}
    for row in old['items']:
        if row['subject'] is not None:continue
        sha=row['sourceSha256']
        if sha not in sources:
            native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
            headings=[l for l in native['pages'][0]['lines'] if l['bbox'][1]<75]
            sources[sha]=(categories_for(headings,cats),headings)
        matches,headings=sources[sha]
        for category,title in matches:
            original_group=source_groups[row['groupId']];gid=sha[:16]+'-DUAL-PHIL-Q'+str(row['printedNumber'])
            groups[gid]={**original_group,'groupId':gid}
            code=row['code'] if category['exam']=='TYT' else row['code']+'-AYT'
            items.append({**row,'code':code,'groupId':gid,'exam':category['exam'],'subject':'Felsefe','subjectCandidates':['Felsefe'],
                'subjectId':category['subjectId'],'categoryId':category['id'],'topic':category['topic'],'unit':category.get('unit'),
                'priorReviewReasons':row['reasons'],'reasons':[],
                'topicEvidence':{'basis':'EXACT_PRINTED_DUAL_EXAM_COURSE_AND_COMPLETE_CHAPTER_MAIN_ROW_CONTAINMENT',
                                 'printedFirstPageHeadings':headings,'chapter':title,'existingPendingCode':row['code']},
                'studentVisible':False,'productionImportAllowed':False,'teacherApproved':False})
    result={'status':'EXPLICIT_DUAL_EXAM_PHILOSOPHY_SOURCE_PACKAGES_NOT_IMPORTED','items':items,'keyGroups':list(groups.values()),
            'candidateBodies':len(items),'sourcePendingManifestSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'questionWrites':0,'teacherApprovalsCreated':0}
    write_json(target,result);print(json.dumps({'candidateBodies':len(items),'sourceQuestions':len({r['topicEvidence']['existingPendingCode'] for r in items}),
                                             'questionWrites':0}),flush=True)


def subject_overlay():
    source=BASE/'single-test-pending-evidence/chapter-packages.json'
    package=json.loads(source.read_text(encoding='utf8'));rows=[];headings={}
    for row in package['items']:
        if row['subject'] is not None:continue
        sha=row['sourceSha256']
        if sha not in headings:
            native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
            headings[sha]=[l for l in native['pages'][0]['lines'] if l['bbox'][1]<75]
        lines=headings[sha]
        if not any(normalize(l['text'])=='felsefe' for l in lines):continue
        if not any(re.search(r'TYT\s*/\s*AYT\s+TARAMA',l['text'],re.I) for l in lines):continue
        rows.append({'code':row['code'],'subject':'Felsefe','subjectId':'felsefe','sourceSha256':sha,
            'printedExamScopes':['TYT','AYT'],'evidence':{'basis':'EXACT_PRINTED_COURSE_AND_DUAL_EXAM_HEADER','page':1,'headings':lines},
            'fineTopicStillRequiresReview':True,'studentVisible':False,'teacherApproved':False})
    write_json(OUT/'subject-review-overlay.json',{'rows':rows,'sourceManifestSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'questionWrites':0,'teacherApprovalsCreated':0})
    print(json.dumps({'printedCourseCorrections':len(rows),'questionWrites':0}),flush=True)


if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--subject-overlay',action='store_true');a=p.parse_args()
    with process_lock(BASE/'.jobs/dual-exam-philosophy-prepare.lock'):
        subject_overlay() if a.subject_overlay else run()
