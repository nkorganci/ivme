"""Detect an entire second question mistakenly included as a continuation.

Shared passages/figures remain shared; only another actual body rectangle is
tested. Geometry cannot approve visual content, options, answers or topics.
"""
from collections import defaultdict
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest
from yks_soru_pilotu import APP

BODY={'ORIGINAL_QUESTION_BODY','INDIVIDUALLY_IDENTICAL_ORIGINAL_QUESTION','BODY'}
IGNORE={'PRINTED_SHARED_PARAGRAPH_CONTEXT','PRINTED_ALTERNATIVE_TEST_SCOPE_INSTRUCTION','ORIGINAL_PRINTED_SOURCE_TOPIC_RIBBON'}


def regions(card):
    result=[]
    for p in card.get('sourceRegions') or ([{'pdfPage':card['pdfPage'],'bboxPt':card['bboxPt']}] if card.get('pdfPage') and card.get('bboxPt') else []):
        p=dict(p)
        if 'role' not in p:
            p['role']='BODY' if p['bboxPt']==card.get('bboxPt') else 'UNLABELLED_NON_BODY_REGION'
        result.append(p)
    return result


def containments(cards):
    by_page=defaultdict(list)
    for card in cards:
        for r in regions(card):by_page[card['sourceSha256'],r['pdfPage']].append((card['code'],r))
    flags=[]
    for (sha,page),items in by_page.items():
        for code,part in items:
            if part['role'] in IGNORE or part['role']=='UNLABELLED_NON_BODY_REGION':continue
            a=part['bboxPt']
            for other,body in items:
                if code==other or body['role'] not in BODY:continue
                b=body['bboxPt'];area=(b[2]-b[0])*(b[3]-b[1])
                intersection=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
                if area>0 and intersection/area>.8:
                    flags.append({'sourceCode':code,'otherQuestionCode':other,'sourceSha256':sha,'physicalPage':page,
                        'regionRole':part['role'],'otherBodyContainedFraction':round(intersection/area,6)})
    return flags,len(by_page)


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId'])
    source=root/'cross-source-candidates/expanded-with-visual-chemistry/report.json'
    if not source.is_file():source=root/'cross-source-candidates/expanded-with-chemistry/report.json'
    proof=read_json(source);cards={}
    if proof['status']!='PASS':raise ValueError('Complete prepared package index required')
    for path,sha in proof['sourcePackages'].items():
        if digest(path)!=sha:raise ValueError('Original source package changed')
        for card in read_json(path)['cards']:cards[card['code']]=card
    baseline,pages=containments(cards.values());amendment_path=root/'din-question-amendments/report.json';amendment=read_json(amendment_path)
    if digest(amendment['amendedPackage'])!=amendment['amendedPackageSha256']:raise ValueError('Current source amendment package changed')
    for card in read_json(amendment['amendedPackage'])['cards']:
        if card['code'] not in cards or cards[card['code']]['imageSha256']!=card['originalSourceImageSha256']:
            raise ValueError('Question amendment belongs to another original version')
        cards[card['code']]=card
    current,_=containments(cards.values())
    output={'status':'PASS' if not current else 'CURRENT_SOURCE_REGION_CONTAINMENT_REVIEW_REQUIRED',
        'scope':'PREPARED_QUESTION_REGION_GEOMETRY_ONLY_NOT_VISUAL_OR_QUESTION_ACCEPTANCE',
        'sourceIndexPath':str(source),'sourceIndexSha256':digest(source),'amendmentReportSha256':digest(amendment_path),
        'questions':len(cards),'sourcePagesWithRegions':pages,'originalVersionFlags':baseline,'currentVersionFlags':current,
        'toolSha256':digest(Path(__file__)),'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'teacherApproved':False}
    write_json(root/'source-crop-geometry/report.json',output);print(output)


if __name__=='__main__':main()
