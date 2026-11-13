"""Read printed bold question-number spans without counting stem examples.

This is one alternate geometry pass on previously unbound source PDFs. Keys
retain their original printed test identities. No repair of source content,
question-bank comparison, OCR, answer solving or publication is performed.
"""
import hashlib
import json
import re
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_tarama_kitap import discover,CELL
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from mebi_pratik2_tek_tarama_konu import source_subject,heading_category
from yks_birlestirme import write_json,process_lock
import mebi_pratik2_tarama_kitap_kirpim as capture
import mebi_pratik2_sozcuk_kirpim as word_reader

OUT=BASE/'bold-number-expansion'
PENDING=BASE/'bold-number-pending-evidence'
CROPS=BASE/'bold-number-crops'
WORDS=BASE/'bold-number-word-crops'
NUMBER=re.compile(r'^\s*(\d{1,3})\s*[.)](?:\s|$)')


def summarize():
    discovery=json.loads((OUT/'discovery-report.json').read_text(encoding='utf8'))
    items=json.loads((OUT/'chapter-packages.json').read_text(encoding='utf8'))['items']
    pending=json.loads((PENDING/'chapter-packages.json').read_text(encoding='utf8'))['items']
    prepared={r['code'] for r in items+pending};remaining={}
    for directory in [CROPS,WORDS]:
        for source in json.loads((directory/'report.json').read_text(encoding='utf8'))['sources']:
            record=json.loads((directory/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            for row in record['reviewQueueAdditions']:
                if row.get('code') in prepared:continue
                identity=row.get('code') or json.dumps(row,sort_keys=True)
                remaining[identity]=row
    report={'sources':len(discovery['sources']),'nativeBoundCandidates':discovery['nativeBoundCandidates'],
        'preparedBodies':len(prepared),'controlledTopicCandidates':len(items),'fineTopicPending':len(pending),
        'remainingGeometryRecords':len(remaining),'unresolvedSources':len(discovery['reviewQueueAdditions']),
        'reviewQueueAdditions':list(remaining.values())+discovery['reviewQueueAdditions'],
        'questionWrites':0,'questionComparisons':0,'allPrintedQuestionsExtracted':False}
    write_json(OUT/'preparation-report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='reviewQueueAdditions'}),flush=True)


def bold_anchors(page,physical):
    anchors=[]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            if CELL.fullmatch(''.join(s['text'] for s in line['spans'])):continue
            for span in line['spans']:
                if CELL.fullmatch(span['text']):continue
                match=NUMBER.match(span['text']);box=span['bbox'];width=page.rect.width;height=page.rect.height
                if not match or not ('bold' in span['font'].casefold() or span['flags'] & 16):continue
                if not (65<box[1]<height-40 and (25<=box[0]<=50 or width/2-5<=box[0]<=width/2+38)):continue
                anchors.append({'printedNumber':int(match[1]),'page':physical,'bbox':list(box),'text':span['text'],
                    'font':span['font'],'fontFlags':span['flags'],'anchorMethod':'ORIGINAL_NATIVE_BOLD_NUMBER_SPAN'})
    return anchors


def run():
    OUT.mkdir(exist_ok=True);PENDING.mkdir(exist_ok=True)
    if (OUT/'chapter-packages.json').exists():
        if not (PENDING/'chapter-packages.json').exists():raise ValueError('Incomplete bold package pair')
        summarize();return
    decisions=load_decisions();coverage=json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    documents={s['sourceSha256']:s for s in coverage}
    cues=json.loads((BASE/'remaining-positive-layout-cues/report.json').read_text(encoding='utf8'))['sources']
    sources=[];reviews=[];discovery=BASE/'compiled-tarama-discovery'
    for cue in cues:
        sha=cue['sourceSha256']
        if cue['sourceHasAnyPreparedBodies'] or skip_pdf(sha,decisions):continue
        source=documents[sha];exam=next((p for p in source['relativePath'].split('\\') if p in ('TYT','AYT')),None)
        if not exam or 'Deneme-Tarama' not in source['relativePath']:continue
        original=(SOURCE/source['relativePath']).resolve()
        if not original.is_relative_to(SOURCE):raise ValueError('Bold source leaves archive')
        with original.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Bold original changed')
        with pymupdf.open(original) as pdf:anchors={i+1:bold_anchors(page,i+1) for i,page in enumerate(pdf)}
        native=json.loads((BASE/source['cache']).read_text(encoding='utf8'));groups,issues=discover(native,exam,anchors)
        bound=sum(len(g['questions']) for g in groups)
        if not bound:
            reviews.append({**source,'reason':'BOUNDED_BOLD_NUMBER_PASS_UNRESOLVED_NO_LOOP','groups':groups,
                'sourceLayoutIssues':issues,'studentVisible':False});continue
        record={**source,'exam':exam,'groups':groups,'reviewQueueAdditions':issues,'boundCandidateQuestions':bound,
            'anchorMethod':'ORIGINAL_NATIVE_BOLD_NUMBER_SPAN','questionWrites':0}
        target=discovery/(sha+'.json')
        if target.exists():raise ValueError('Earlier source discovery exists; preserve its identity')
        write_json(target,record);sources.append({k:v for k,v in record.items() if k not in ('groups','reviewQueueAdditions')})
    write_json(OUT/'discovery-report.json',{'sources':sources,'reviewQueueAdditions':reviews,
        'nativeBoundCandidates':sum(r['boundCandidateQuestions'] for r in sources),'questionWrites':0,'questionComparisons':0})
    capture.OUT=CROPS;capture.run(sources)
    word_reader.OUT=WORDS;word_reader.run(directories=[CROPS.name],prepare=False)
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    rows={};keys={};remaining=[]
    for directory in [CROPS,WORDS]:
        for source in json.loads((directory/'report.json').read_text(encoding='utf8'))['sources']:
            record=json.loads((directory/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            keys.update({g['groupId']:g for g in record['keyGroups']});remaining.extend(record['reviewQueueAdditions'])
            for row in record['items']:rows[row['code']]=row
    items=[];pending=[]
    for row in rows.values():
        subject=source_subject(row['relativePath'],categories,row['exam'])
        category=heading_category(row['printedSourceHeadings'],row['exam'],subject,categories)
        new={**row,'sourceAnchorMethod':'ORIGINAL_NATIVE_BOLD_NUMBER_SPAN'}
        if category:
            items.append({**new,'subject':category['subject'],'subjectId':category['subjectId'],
                'subjectCandidates':[category['subject']],'categoryId':category['id'],'topic':category['topic'],'unit':category.get('unit'),
                'topicEvidence':{'basis':'EXACT_PRINTED_SINGLE_TOPIC_CONTAINMENT','headings':row['printedSourceHeadings'],'teacherApproved':False}})
        else:pending.append({**new,'reasons':['FINE_TOPIC_NOT_YET_VERIFIED']})
    for folder,selected in [(OUT,items),(PENDING,pending)]:
        used={r['groupId'] for r in selected}
        write_json(folder/'chapter-packages.json',{'status':'BOLD_NUMBER_SOURCE_CANDIDATES_NOT_IMPORTED','items':selected,
            'keyGroups':[keys[g] for g in sorted(used)],'candidateBodies':len(selected),'questionWrites':0,'questionComparisons':0,
            'teacherApprovalsCreated':0,'studentVisible':False})
    summarize()


if __name__=='__main__':
    with process_lock(BASE/'.jobs/bold-number-preparation.lock'):run()
