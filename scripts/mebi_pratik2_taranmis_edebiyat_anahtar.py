"""Bind two actually read scanned keys to native question bodies, not topics.

Agent readings are checked against prior independent OCR; only one missing
cell and one missing printed test heading use bounded cached source OCR crops.
No model solves questions or manufactures teacher/fine-topic approval.
"""
import hashlib
import json
import re
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from mebi_pratik2_kalin_numara import bold_anchors
from mebi_pratik2_cevap_kurtarma import ocr
from yks_birlestirme import write_json,process_lock
import mebi_pratik2_tarama_kitap_kirpim as capture
import mebi_pratik2_sozcuk_kirpim as words

ROOT=BASE/'scanned-literature-keys'
OUT=BASE/'scanned-literature-pending-evidence'
DISCOVERY=BASE/'scanned-literature-discovery'
CROPS=BASE/'scanned-literature-crops'
WORDS=BASE/'scanned-literature-word-crops'
PAIR=re.compile(r'(?<!\d)(\d{1,3})\s*\.\s*([ABCDE])\b',re.I)
TEST=re.compile(r'TARAMA\s+TEST[İIıi]\s*[-–]?\s*(\d+)',re.I)


def numbered(text):
    values={}
    for number,letter in PAIR.findall(text):
        number=str(int(number));letter=letter.upper()
        if number in values:raise ValueError('OCR repeated a numbered source cell')
        values[number]=letter
    return values


def run():
    ROOT.mkdir(exist_ok=True);OUT.mkdir(exist_ok=True);DISCOVERY.mkdir(exist_ok=True)
    if (OUT/'chapter-packages.json').exists():return
    manual_path=BASE/'empty-original-pages/agent-page-review.json'
    manual=json.loads(manual_path.read_text(encoding='utf8'))['records'];decisions=load_decisions()
    sources={d['sourceSha256']:d for d in json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']}
    readings={};selected=[]
    for agent in manual:
        if agent['status']!='AGENT_READ_PRINTED_ANSWER_KEY' or skip_pdf(agent['sourceSha256'],decisions):continue
        sha=agent['sourceSha256'];source=sources[sha];physical=agent['physicalPage']
        evidence_path=BASE/'visual-page-discovery'/(sha+f'-p{physical:04}.json')
        evidence=json.loads(evidence_path.read_text(encoding='utf8'))
        if hashlib.sha256((BASE/evidence['image']).read_bytes()).hexdigest()!=agent['imageSha256']:raise ValueError('Scanned key image changed')
        text='\n'.join(l['text'] for l in evidence['lines']);observed=numbered(text);identity=TEST.findall(text)
        original=(SOURCE/source['relativePath']).resolve()
        if not original.is_relative_to(SOURCE):raise ValueError('Scanned literature source outside archive')
        with original.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Scanned literature PDF changed')
        bounded=[]
        with pymupdf.open(original) as pdf:
            if sha.startswith('239208'):
                recovered=ocr(pdf,physical,[260,83,288,104],ROOT,sha[:16]+'-q5-one-bounded-region')
                cell=numbered(recovered.get('text',''))
                if set(cell)!={'5'} or '5' in observed:raise ValueError('Unexpected bounded missing-cell scope')
                observed.update(cell)
                heading=ocr(pdf,physical,[45,65,555,86],ROOT,sha[:16]+'-printed-test-id-one-region')
                identity=TEST.findall(heading.get('text',''));heading_box=[45,65,555,86]
                for suffix in ['-q5-one-bounded-region','-printed-test-id-one-region']:
                    p=ROOT/(sha[:16]+suffix+'.json');bounded.append({'path':str(p.relative_to(BASE)),
                        'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
            else:
                headings=[l for l in evidence['lines'] if TEST.search(l['text'])]
                if len(headings)!=1:raise ValueError('Printed scanned key identity is unclear')
                heading_box=headings[0]['bbox']
            if observed!=agent['answers'] or identity!=[str(agent['printedTestNumber'])]:raise ValueError('Independent scanned key reading does not agree')
            anchors=[a for i,page in enumerate(pdf) if i+1<physical for a in bold_anchors(page,i+1)]
        counts=Counter(a['printedNumber'] for a in anchors)
        if set(counts)!=set(range(1,21)) or any(v!=1 for v in counts.values()):raise ValueError('Native scanned-key body identity is not unique/complete')
        native=json.loads((BASE/source['cache']).read_text(encoding='utf8'))
        body_headers=[l for p in native['pages'][:physical-1] for l in p['lines'] if TEST.search(l['text'])]
        if {int(TEST.search(l['text'])[1]) for l in body_headers}!={agent['printedTestNumber']}:raise ValueError('Body and scanned key test IDs differ')
        printed_heading={'text':agent['printedHeading'],'bbox':heading_box,'source':'ACTUALLY_VIEWED_IMAGE_AND_INDEPENDENT_OCR'}
        cells=[]
        for number,letter in observed.items():
            matching=[l for l in evidence['lines'] if numbered(l['text']).get(number)==letter]
            box=matching[0]['bbox'] if matching else [265.60717230067405,88.32493882469969,281.9368478875411,98.33399053630325]
            cells.append({'printedNumber':int(number),'answer':letter,'page':physical,'bbox':box,'printedTestHeading':printed_heading})
        by_number={a['printedNumber']:a for a in anchors};by_key={c['printedNumber']:c for c in cells}
        group={'testNumber':agent['printedTestNumber'],'keys':cells,'bodies':anchors,'bodyPages':sorted({a['page'] for a in anchors}),
            'printedBodyHeadings':[{'page':p['physicalPage'],**l} for p in native['pages'][:physical-1] for l in p['lines']
                                  if l['bbox'][1]<p['rect'][3]*.13 and l['text'].lstrip().startswith('>')],
            'questions':[{'printedNumber':n,'answer':by_key[n]['answer'],'body':by_number[n],'keyOccurrences':[by_key[n]]} for n in range(1,21)],
            'status':'SCANNED_KEY_AND_NATIVE_BODY_BINDING_CANDIDATE','keyIdentityType':'PREVERIFIED_SCANNED_LITERATURE_TEST_KEY'}
        record={**source,'exam':'AYT','groups':[group],'reviewQueueAdditions':[],'questionWrites':0}
        write_json(DISCOVERY/(sha+'.json'),record)
        selected.append({k:v for k,v in record.items() if k not in ('groups','reviewQueueAdditions')})
        readings[sha]={'agentReadingEvidence':str(manual_path.relative_to(BASE)),'independentOcrEvidence':str(evidence_path.relative_to(BASE)),
            'independentOcrEvidenceSha256':hashlib.sha256(evidence_path.read_bytes()).hexdigest(),'answers':observed,
            'printedTestNumber':agent['printedTestNumber'],'originalPageImageSha256':agent['imageSha256'],
            'boundedAlternativeEvidence':bounded,'teacherApproved':False}
    capture.OUT=CROPS;capture.run(selected,DISCOVERY.name)
    words.OUT=WORDS;words.run(directories=[CROPS.name],prepare=False)
    items={};groups={};reviews={}
    for directory in [CROPS,WORDS]:
        for source in json.loads((directory/'report.json').read_text(encoding='utf8'))['sources']:
            data=json.loads((directory/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            groups.update({g['groupId']:g for g in data['keyGroups']})
            for r in data['items']:items[r['code']]={**r,'categoryId':None,'subjectId':None,'subject':'Edebiyat','subjectCandidates':['Edebiyat'],
                'topic':None,'unit':None,'reasons':['FINE_TOPIC_NOT_YET_VERIFIED'],'scannedKeyEvidence':readings[r['sourceSha256']]}
            for r in data['reviewQueueAdditions']:reviews[r.get('code') or json.dumps(r,sort_keys=True)]=r
    used={r['groupId'] for r in items.values()};key_dir=OUT/'independent-keys';key_dir.mkdir(exist_ok=True)
    for gid in used:
        g=groups[gid]
        write_json(key_dir/(gid+'.json'),{'status':'AGREES','imageSha256':g['keyImageSha256'],
            'method':'ACTUAL_AGENT_PRINTED_KEY_AND_INDEPENDENT_TESSERACT_WITH_ONE_BOUNDED_MISSING_CELL',**readings[g['sourceSha256']]})
    write_json(OUT/'chapter-packages.json',{'status':'SCANNED_LITERAL_KEY_SOURCE_CANDIDATES_FINE_TOPIC_PENDING','items':list(items.values()),
        'keyGroups':[groups[g] for g in sorted(used)],'candidateBodies':len(items),'questionWrites':0,'questionComparisons':0,
        'teacherApprovalsCreated':0,'studentVisible':False,'productionImportAllowed':False})
    write_json(OUT/'preparation-report.json',{'readSourceKeys':len(readings),'independentlyAgreedAnswers':sum(len(r['answers']) for r in readings.values()),
        'preparedBodies':len(items),'remainingGeometryRecords':[r for code,r in reviews.items() if code not in items],
        'sourceReadings':readings,'questionWrites':0,'questionComparisons':0,'modelCalls':0,'teacherApprovalsCreated':0})
    print(json.dumps({'readSourceKeys':len(readings),'agreedAnswers':sum(len(r['answers']) for r in readings.values()),'preparedBodies':len(items),'questionWrites':0}),flush=True)


if __name__=='__main__':
    with process_lock(BASE/'.jobs/scanned-literature-preparation.lock'):run()
