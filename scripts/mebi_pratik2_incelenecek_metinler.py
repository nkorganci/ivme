"""Read remaining proved source text for individual topic review, without AI/DB writes.

Already frozen publisher codes, explicit topic holds and content holds are
omitted. This lists evidence to read; it never creates a review decision.
"""
import argparse
import hashlib
import json
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
from mebi_pratik2_incelenen_konu_paketi import verified_body
from mebi_pratik2_tek_tarama_konu import source_subject


def run(args):
    if args.evidence_package in {'','.','..'} or Path(args.evidence_package).name!=args.evidence_package:
        raise ValueError('Unsafe evidence package')
    if args.limit<1 or args.offset<0:raise ValueError('Invalid review window')
    folder=BASE/args.evidence_package
    package=json.loads((folder/'chapter-packages.json').read_text(encoding='utf8'))
    groups={g['groupId']:g for g in package['keyGroups']}
    reserved=set();held=set()
    for path in BASE.glob('*expansion/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8'))['items'])
    for path in BASE.glob('*expansion/remaining-topic-review.json'):
        held.update(r['code'] for r in json.loads(path.read_text(encoding='utf8'))['records'])
    content=APP/'scripts/mebi-pratik2-native-content-holds.json'
    if content.exists():held.update(r['code'] for r in json.loads(content.read_text(encoding='utf8'))['heldReviews'])
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    policy=load_decisions();eligible=[]
    for row in package['items']:
        if row['code'] in reserved or row['code'] in held or skip_pdf(row['sourceSha256'],policy):continue
        if args.exam and row['exam']!=args.exam:continue
        if args.source_prefix and not row['sourceSha256'].startswith(args.source_prefix):continue
        subject=source_subject(row['relativePath'],categories,row['exam'])
        if args.subject and subject!=args.subject:continue
        body_path=folder/'body-readings'/(row['code']+'.json')
        key_path=folder/'independent-keys'/(row['groupId']+'.json')
        if not body_path.exists() or not key_path.exists():continue
        body=json.loads(body_path.read_text(encoding='utf8'));key=json.loads(key_path.read_text(encoding='utf8'))
        if not verified_body(body,row,args.allow_verified_visual_body):continue
        if key.get('status')!='AGREES' or key.get('imageSha256')!=row['keyImageSha256']:continue
        if groups[row['groupId']]['answers'].get(str(row['printedNumber']))!=row['answer']:continue
        eligible.append((row,subject))
    selected=eligible[args.offset:args.offset+args.limit]
    print(json.dumps({'eligibleInFilteredScope':len(eligible),'offset':args.offset,'listed':len(selected),
                      'questionWrites':0,'modelCalls':0,'reviewDecisionsCreated':0},ensure_ascii=False),flush=True)
    opened={}
    try:
        for row,subject in selected:
            sha=row['sourceSha256']
            if sha not in opened:
                path=(SOURCE/row['relativePath']).resolve()
                if not path.is_relative_to(SOURCE):raise ValueError('Original outside source archive')
                with path.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original PDF changed')
                opened[sha]=pymupdf.open(path)
            image=(BASE/row['image']).resolve()
            if not image.is_relative_to(BASE) or hashlib.sha256(image.read_bytes()).hexdigest()!=row['imageSha256']:
                raise ValueError('Body image changed')
            page=opened[sha][row['bodyPage']-1]
            text=' '.join(w[4] for w in page.get_text('words',clip=pymupdf.Rect(row['bodyClip']),sort=True))
            print(json.dumps({'code':row['code'],'exam':row['exam'],'subject':subject,
                              'relativePath':row['relativePath'],'bodyPage':row['bodyPage'],
                              'imageSha256':row['imageSha256'],'originalNativeText':text},ensure_ascii=False),flush=True)
        if args.catalog:
            scope={(r['exam'],s) for r,s in selected}
            for category in categories:
                if category.get('selectable') and category['id'].startswith('excel.') and (category['exam'],category['subject']) in scope:
                    print(json.dumps({'categoryId':category['id'],'exam':category['exam'],'subject':category['subject'],
                                      'unit':category.get('unit'),'topic':category['topic']},ensure_ascii=False),flush=True)
    finally:
        for pdf in opened.values():pdf.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--evidence-package',default='single-test-pending-evidence')
    parser.add_argument('--subject');parser.add_argument('--exam',choices=['TYT','AYT']);parser.add_argument('--source-prefix')
    parser.add_argument('--offset',type=int,default=0);parser.add_argument('--limit',type=int,default=20)
    parser.add_argument('--catalog',action='store_true');parser.add_argument('--allow-verified-visual-body',action='store_true')
    run(parser.parse_args())
