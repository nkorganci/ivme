"""Record six actually viewed image pairs and independently read old book keys.

Printed mock numbers come from original source bodies, not flattened bank test
orders or the newer mock's number. Conflicting letters never overwrite history.
"""
from pathlib import Path
import re
import sys

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_deneme_anahtar_pilotu import printed_mock_numbers
from yks_pilot_sorular import source_lines,boundaries
from yks_ayri_anahtar import normalized_body
from yks_cevap_on_tarama import PAIR
from yks_buyuk_anahtar_incele import large_pairs
from yks_anahtar_gorsel import transcription,checked_reading,MODEL
from yks_anahtar_pilotu import api
from pdf_source_scan import read_scan
from yks_soru_pilotu import live_bank

READINGS={
 'mebi-mock-05fbeafee7bc-s1-q1':('f37435b24b6eef21949f78168d0903eea3a3347de56f00866bbdfda30b68f3da','95168ecf7c9492b1c36df95f5644d193d1c22d948699974063ec239ebe9f6779',
    'The underlined heart/vessel and mind/loom phrase, stem and all five choices are the same.'),
 'mebi-mock-05fbeafee7bc-s4-q34':('87d3561418b19a0556bdc0efa08773aea2d3d8bde85f0fbed2a4a7983748ff7b','b27a7269ec56629bf3775259e91191c41c41738df701f6dbe0bf06c85c05c3a0',
    'Both ask about smooth muscles; all five biological events and positive question wording are identical.'),
 'mebi-mock-23a40f41649b-s4-q10':('58ae4089a82b84d6c7ebaed6c78f0820f0fc7f2b35f41949b490287a196bf101','7e876621ca42b926f7216e13181147628a4f251188c686668bad5f2065244c85',
    'Spring/pendulum lengths and masses, downward-accelerating elevator, three propositions and option order are identical.'),
 'mebi-mock-594b7ed3f474-s1-q39':('a81459f114d24438a3c05eae024bf49f4acadff9bea2e13708b0f237bc8a3722','fcdbd62009d3010711644fc662e60f7d7cbce457687956c3c9e6c52a582c376c',
    'The three urbanization propositions and all five Roman-numeral choices are identical.'),
 'mebi-mock-fd0fdf7c0577-s3-q8':('2091fd055bcefa1dd45635f77c20d7bb823f7692b73cee4031500e67a736015e','eb5ba8a4f9d8e0be8cfebfb8eaf1ea32b8bdd6c90cc491143855fd32f8ebee8a',
    'Both print EKOK(19,n)-EBOB(19,n), positive integer n, values 56/76/113 and the same five choices.'),
 'mebi-mock-fd0fdf7c0577-s3-q26':('f0adb1ce83a47e8e8a932dff6fe72671dfac6d8cea17c035a51ab941bce7adf3','2cf5e5c5cefd3b59f758682919f73315ab918ac12c5f22016739de2743f00d05',
    'Both print distinct positive a,b; ax²-bx-5=0 and bx²-ax-5=0, the same sums/products condition and signs in all five polynomials.'),
}


def source_mock_number(original):
    match=re.match(r'^(\d+)\.\s*Deneme\b',original['test'],re.I)
    if not match:raise ValueError('Explicit original printed mock number required')
    return int(match[1])


def legacy_section(page,title):
    lines=source_lines(page);pairs=[l for l in lines if PAIR.fullmatch(l['text'])];groups=[]
    for line in sorted(pairs,key=lambda l:l['bbox'][0]):
        if not groups or line['bbox'][0]-groups[-1][0]['bbox'][0]>25:groups.append([])
        groups[-1].append(line)
    if len(groups) not in [2,4]:raise ValueError('Unsupported actual old key column layout')
    centers=[sum((l['bbox'][0]+l['bbox'][2])/2 for l in group)/len(group) for group in groups]
    top=min(l['bbox'][1] for l in pairs);sections=[]
    headers=[l for l in lines if top-70<l['bbox'][1]<top and 'DENEME' not in plain(l['text']) and 'YETERLILIK' not in plain(l['text'])]
    for index,group in enumerate(groups):
        heading=[l for l in headers if min(range(len(groups)),key=lambda i:abs(centers[i]-(l['bbox'][0]+l['bbox'][2])/2))==index]
        label=plain(' '.join(l['text'] for l in heading))
        if title not in label:continue
        group=sorted(group,key=lambda l:l['bbox'][1]);answers=large_pairs('\n'.join(l['text'] for l in group))
        if len(answers)!=40:raise ValueError('Expected complete printed forty-question old section')
        region=heading+group;box=[min(l['bbox'][0] for l in region)-4,min(l['bbox'][1] for l in region)-4,
            max(l['bbox'][2] for l in region)+4,max(l['bbox'][3] for l in region)+4]
        sections.append({'page':page.number+1,'printedTitle':label,'answers':answers,'bboxPt':box})
    if len(sections)!=1:raise ValueError('Actual old printed section name missing or ambiguous')
    return sections[0]


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-mock-comparison'
    queue_path=folder/'answer-conflict-queue.json';queue=read_json(queue_path);bank,_=live_bank(APP)
    if signature(bank)!=queue['bankSnapshotSha256']:raise ValueError('Actual answer conflict bank snapshot stale')
    if {r['sourceCode'] for r in queue['results']}!=set(READINGS):raise ValueError('Conflict set differs from actually viewed pairs')
    out=folder/'old-printed-key-review';out.mkdir(exist_ok=True);results=[];calls=0
    model=next(m for m in api('/api/tags')['models'] if m['name']==MODEL)
    sys.path.insert(0,str(APP.parent/'pipeline'));from model_runtime import ModelLease
    with process_lock(out/'.writer.lock'),ModelLease(role='yks-old-mock-book-printed-key-review',model=MODEL):
        try:
            write_json(out/'progress.json',{'status':'RUNNING','completedSourceQuestions':0,'results':[]})
            for row in queue['results']:
                source_sha,bank_sha,observation=READINGS[row['sourceCode']]
                if digest(row['sourceImagePath'])!=source_sha:raise ValueError('Actually viewed source image changed')
                links=[]
                for link in row['bankLinks']:
                    if digest(link['bankImagePath'])!=bank_sha:raise ValueError('Actually viewed bank image changed')
                    original=link['oldOriginalSourceObservation'];number=source_mock_number(original);old_pdf=Path(link['oldPrintedPdfPath']);sha=link['oldPrintedPdfSha256']
                    if digest(old_pdf)!=sha:raise ValueError('Original old printed book changed')
                    scan=read_scan(sha);pages=[p['page'] for p in scan['pages'] if re.search(r'\b'+str(number)+r'\.\s*DENEME\s+CEVAP',plain(p['text']))]
                    if len(pages)!=1:raise ValueError('Exact old printed mock answer page missing or ambiguous')
                    title=('TURK DILI VE EDEBIYATI' if row['sectionId']=='AYT:1' else 'FEN BILIMLERI' if row['sectionId']=='AYT:4' else 'TEMEL MATEMATIK')
                    with pymupdf.open(old_pdf) as doc:
                        page=doc[original['page']-1]
                        if printed_mock_numbers([page])!={number}:raise ValueError('Original body printed mock identity differs')
                        regions,_=boundaries(source_lines(page),page.rect.width,page.rect.height)
                        region=[r for r in regions if r['number']==original['questionNumbers'][0]]
                        if len(region)!=1 or normalized_body(page.get_text(clip=pymupdf.Rect(region[0]['bboxPt'])))!=normalized_body(original['text']):
                            raise ValueError('Actual old printed question body differs from preserved canonical raw text')
                        section=legacy_section(doc[pages[0]-1],title);crop=out/(sha[:16]+'-mock'+str(number)+'-'+title.replace(' ','_')+'.png')
                        doc[pages[0]-1].get_pixmap(dpi=220,clip=pymupdf.Rect(section['bboxPt']),alpha=False).save(crop)
                    cache=out/'vision';cache.mkdir(exist_ok=True);seen=transcription(model,crop,cache);calls+=not seen['cacheHit']
                    old_answer=next(a['answer'] for a in section['answers'] if a['number']==original['questionNumbers'][0])
                    agree=seen['reading']==section['answers'];canonical=link['canonicalAnswerPreserved']
                    status=('TWO_PRINTED_EDITIONS_DIFFER_CANONICAL_LETTER_SUPPORTED_BY_OLD_BOOK' if agree and old_answer==canonical else
                        'OLD_PRINTED_KEY_OR_CANONICAL_ANSWER_REQUIRES_REVIEW')
                    links.append({**link,'status':status,'oldPrintedMockNumber':number,'oldPrintedBodyNumber':original['questionNumbers'][0],
                        'oldPrintedKeyPhysicalPage':section['page'],'oldPrintedKeyBboxPt':section['bboxPt'],'oldPrintedAnswer':old_answer,
                        'oldBodyNativeTextMatchesCanonicalRawSource':True,'oldPrintedKeyFreshlyVerified':agree,
                        'oldKeyNativeAnswers':section['answers'],'oldKeyIndependentAnswers':seen['reading'],
                        'cropPath':str(crop),**{k:v for k,v in seen.items() if k!='reading'},
                        'actualImagePairRead':True,'actualImageReading':{'sourceImageSha256':source_sha,'bankImageSha256':bank_sha,
                            'method':'EXECUTING_AGENT_VIEWED_ACTUAL_SOURCE_AND_BANK_IMAGES','observation':observation,'teacherApproved':False}})
                results.append({**row,'status':'SOURCE_BOUND_PRINTED_MOCK_ANSWER_VERSION_CONFLICT_REVIEW_REQUIRED',
                    'bankLinks':links,'actualImagePairRead':True,'teacherApproved':False})
                write_json(out/'progress.json',{'status':'RUNNING','completedSourceQuestions':len(results),'results':results})
            after,_=live_bank(APP)
            if signature(after)!=queue['bankSnapshotSha256']:raise ValueError('Bank changed during printed edition review')
            report={'status':'REVIEW_REQUIRED','scope':'ACTUALLY_READ_SIX_PAIRS_AND_FRESH_OLD_PRINTED_BOOK_KEYS',
                'sourceQuestions':len(results),'canonicalBankLinks':sum(len(r['bankLinks']) for r in results),
                'oldKeyLinksWithTwoAgreeingSourceReadings':sum(l['oldPrintedKeyFreshlyVerified'] for r in results for l in r['bankLinks']),
                'newModelCallsThisPass':calls,'sourceQueueSha256':digest(queue_path),'bankSnapshotSha256':queue['bankSnapshotSha256'],
                'questionBankWrites':0,'modelSolutionsGenerated':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':results}
            write_json(out/'report.json',report)
            write_json(out/'progress.json',{'status':'COMPLETE','completedSourceQuestions':len(results),'reportSha256':digest(out/'report.json'),'newModelCallsThisPass':calls})
        except BaseException:
            write_json(out/'progress.json',{'status':'INTERRUPTED','completedSourceQuestions':len(results),'results':results});raise
        finally:api('/api/generate',{'model':MODEL,'keep_alive':0})
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
