"""Promote exact printed single-topic headings from frozen individual tests.

The existing crop, stable code and independent key receipt remain unchanged.
Mixed chapters stay in their explicit topic review queue; no bank comparison.
"""
import hashlib
import json
from collections import defaultdict
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_tek_tarama_konu import source_subject,heading_category
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

OUT=BASE/'single-test-heading-expansion'


def printed_headings(native,rows):
    # A line in the question stem cannot become a source topic label.
    cutoff=min([r['bodyClip'][1] for r in rows if r['bodyPage']==1]+[75])
    return [line for line in native['pages'][0]['lines'] if line['bbox'][3]<=cutoff
            and line['text'].lstrip().startswith('>')]


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return
    path=BASE/'single-test-pending-evidence/chapter-packages.json';data=json.loads(path.read_text(encoding='utf8'))
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    decisions=load_decisions();sources=defaultdict(list);reserved=set()
    for package in BASE.glob('*expansion/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(package.read_text(encoding='utf8'))['items'])
    for row in data['items']:
        if row['code'] not in reserved and not skip_pdf(row['sourceSha256'],decisions):sources[row['sourceSha256']].append(row)
    items=[];review=[];evidence=[]
    rules_sha=hashlib.sha256((APP/'scripts/mebi_pratik2_tek_tarama_konu.py').read_bytes()).hexdigest()
    for sha,rows in sources.items():
        native_path=BASE/'full-pdf-native'/(sha+'.json');native=json.loads(native_path.read_text(encoding='utf8'))
        headings=printed_headings(native,rows);exam=rows[0]['exam'];subject=source_subject(rows[0]['relativePath'],categories,exam)
        category=heading_category(headings,exam,subject,categories)
        if not category:
            review.append({'sourceSha256':sha,'relativePath':rows[0]['relativePath'],'candidateCodes':[r['code'] for r in rows],
                'sourceHeadings':headings,'reason':'MIXED_OR_UNRESOLVED_PRINTED_TOPIC','studentVisible':False});continue
        source_evidence={'basis':'EXACT_PRINTED_SINGLE_TOPIC_BEFORE_FIRST_QUESTION','sourceHeadings':headings,
            'nativeCacheSha256':hashlib.sha256(native_path.read_bytes()).hexdigest(),'rulesSha256':rules_sha,'teacherApproved':False}
        evidence.append({'sourceSha256':sha,'categoryId':category['id'],'candidateCount':len(rows),**source_evidence})
        for row in rows:
            items.append({**row,'categoryId':category['id'],'subjectId':category['subjectId'],'subject':category['subject'],
                'subjectCandidates':[category['subject']],'topic':category['topic'],'unit':category.get('unit'),
                'priorReviewReasons':row.get('reasons',[]),'reasons':[],'topicEvidence':source_evidence})
    used={r['groupId'] for r in items}
    write_json(target,{'status':'EXACT_SINGLE_TEST_HEADING_CANDIDATES_NOT_IMPORTED','items':items,
        'keyGroups':[g for g in data['keyGroups'] if g['groupId'] in used],'candidateBodies':len(items),
        'sourcePackageSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'questionWrites':0,'questionComparisons':0,
        'teacherApprovalsCreated':0,'studentVisible':False})
    receipts=OUT/'body-readings';receipts.mkdir(exist_ok=True);reused=0
    for row in items:
        # Preserve identical prior native/model readings; a failed receipt is
        # also retained so it never causes another model attempt.
        for folder in [BASE/'single-test-pending-evidence/body-readings',BASE/'single-test-crops/body-model-review']:
            old=folder/(row['code']+'.json')
            if not old.exists():continue
            value=json.loads(old.read_text(encoding='utf8'))
            if value.get('imageSha256')!=row['imageSha256']:continue
            destination=receipts/old.name
            if not destination.exists():write_json(destination,value)
            reused+=1;break
    write_json(OUT/'preparation-report.json',{'controlledTopicCandidates':len(items),'sources':evidence,
        'remainingSourceReview':review,'identicalBodyReceiptsReused':reused,'questionWrites':0,'questionComparisons':0})
    print(json.dumps({'controlledTopicCandidates':len(items),'sourceGroups':len(evidence),'identicalBodyReceiptsReused':reused}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/single-test-heading-preparation.lock'):run()
