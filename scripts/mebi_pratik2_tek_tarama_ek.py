"""Reuse the printed-test reader for remaining individual Tarama PDFs.

Whole PDFs already in the original practice bank are filtered first. Discovery
and crops stay separate from frozen prior packages. No question bank matching.
"""
import json
from collections import Counter
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from mebi_pratik2_tarama_kitap import discover
from mebi_pratik2_konu_ayrintisi import match_headings
from yks_birlestirme import write_json,process_lock
import mebi_pratik2_tarama_kitap_kirpim as capture

OUT=BASE/'individual-tarama-expansion'
PENDING=BASE/'individual-tarama-pending-evidence'
CROPS=BASE/'individual-tarama-crops'


def run():
    OUT.mkdir(exist_ok=True);PENDING.mkdir(exist_ok=True)
    if (OUT/'chapter-packages.json').exists():
        if not (PENDING/'chapter-packages.json').exists():raise ValueError('Incomplete frozen package pair requires review')
        return
    decisions=load_decisions();coverage=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    documents={s['sourceSha256']:s for s in coverage}
    cues=json.loads((BASE/'remaining-positive-layout-cues/report.json').read_text(encoding='utf8'))['sources']
    sources=[];reviews=[];counts=Counter()
    discovery=BASE/'compiled-tarama-discovery'
    for cue in cues:
        sha=cue['sourceSha256']
        if skip_pdf(sha,decisions):counts['existingPdfSkipped']+=1;continue
        source=documents[sha]
        if 'Deneme-Tarama' not in source['relativePath']:continue
        exam=next((part for part in source['relativePath'].split('\\') if part in ('TYT','AYT')),None)
        if not exam:continue
        native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
        groups,issues=discover(native,exam)
        if not any(g['questions'] for g in groups):
            reviews.append({**source,'reason':'PRINTED_TEST_BINDING_REQUIRES_DIFFERENT_LAYOUT','studentVisible':False})
            continue
        record={**source,'exam':exam,'groups':groups,'reviewQueueAdditions':issues,
                'boundCandidateQuestions':sum(len(g['questions']) for g in groups),'questionWrites':0}
        target=discovery/(sha+'.json')
        if target.exists():
            previous=json.loads(target.read_text(encoding='utf8'))
            if previous['groups']!=groups:raise ValueError('Existing source discovery identity differs')
        else:write_json(target,record)
        sources.append({k:v for k,v in record.items() if k not in ('groups','reviewQueueAdditions')})
    write_json(OUT/'discovery-report.json',{'sources':sources,'reviewQueueAdditions':reviews,'counts':dict(counts),
        'nativeBoundCandidates':sum(s['boundCandidateQuestions'] for s in sources),'questionWrites':0,'questionComparisons':0})
    capture.OUT=CROPS;capture.run(sources)
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    accepted=[];pending=[];keys={};crop_reviews=[]
    for source in sources:
        report=json.loads((CROPS/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
        keys.update({g['groupId']:g for g in report['keyGroups']});crop_reviews.extend(report['reviewQueueAdditions'])
        for row in report['items']:
            category=match_headings(row['printedSourceHeadings'],row['exam'],row['subjectCandidates'],categories)
            if category:
                accepted.append({**row,'categoryId':category['id'],'subject':category['subject'],'subjectId':category['subjectId'],
                    'topic':category['topic'],'unit':category.get('unit'),
                    'topicEvidence':{'basis':'EXISTING_CONTROLLED_PRINTED_HEADING_CONTAINMENT','headings':row['printedSourceHeadings'],
                                     'teacherApproved':False}})
            else:pending.append({**row,'reasons':['FINE_TOPIC_NOT_YET_VERIFIED']})
    for directory,items in [(OUT,accepted),(PENDING,pending)]:
        used={r['groupId'] for r in items}
        write_json(directory/'chapter-packages.json',{'status':'INDIVIDUAL_TARAMA_FROZEN_SOURCE_CANDIDATES_NOT_IMPORTED',
            'items':items,'keyGroups':[keys[g] for g in sorted(used)],'candidateBodies':len(items),
            'questionWrites':0,'questionComparisons':0,'teacherApprovalsCreated':0,'studentVisible':False})
    write_json(OUT/'preparation-report.json',{'sources':len(sources),'nativeBoundCandidates':sum(s['boundCandidateQuestions'] for s in sources),
        'controlledTopicCandidates':len(accepted),'fineTopicPending':len(pending),'cropReviewRecords':len(crop_reviews),
        'reviewQueueAdditions':crop_reviews+reviews,'questionWrites':0,'questionComparisons':0,'allPrintedQuestionsExtracted':False})
    print(json.dumps({'controlledTopicCandidates':len(accepted),'fineTopicPending':len(pending),'cropReviewRecords':len(crop_reviews)}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/individual-tarama-preparation.lock'):run()
