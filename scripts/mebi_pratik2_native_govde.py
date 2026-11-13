"""Prove text-only crop completeness from original pixels and native word bounds.

Never overwrite a visual receipt or claim a model/teacher reviewed a native
proof. Geometric/spatial subjects keep the visual route. Any diagram, image,
unknown glyph, external-context cue or missing choice keeps the visual route.
"""
import argparse
import hashlib
import json
import re
import time
import os
import unicodedata
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_uc_adim_kirpim import TEXT_SUBJECTS,OPTION
from yks_birlestirme import write_json,process_lock

ALLOWED=TEXT_SUBJECTS|{'Matematik','Kimya','Biyoloji'}
EXTERNAL=re.compile(r'\b(sekil\w*|grafik\w*|tablo\w*|harita\w*|gorsel\w*|resim\w*|duzenek\w*|devre\w*|bu parca\w*|yukarida\w*)\b')


def resolve_body_subject(row,categories):
    if row.get('subject') is not None and row['subject'] not in {'Türk Dili ve Edebiyatı','Din Kültürü ve Ahlak Bilgisi'}:return row,None
    from mebi_pratik2_tek_tarama_konu import source_subject
    subject=source_subject(row['relativePath'],categories,row['exam'])
    if subject not in ALLOWED:return row,None
    return {**row,'subject':subject},{'basis':'EXACT_SOURCE_SUBJECT_DIRECTORY_OR_EXPLICIT_COURSE_ALIAS',
        'originalSubject':row.get('subject'),'resolvedSubject':subject,'sourcePath':row['relativePath'],
        'fineTopicClaimed':False,'teacherApproved':False}


def prove(page,row,path):
    if row['subject'] not in ALLOWED:return None
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=row['imageSha256']:raise ValueError('Native proof body bytes changed')
    clip=pymupdf.Rect(row['bodyClip']);pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=clip,alpha=False)
    saved=pymupdf.Pixmap(str(path))
    if (pix.width,pix.height,pix.n,pix.samples)!=(saved.width,saved.height,saved.n,saved.samples):return None
    words=[w for w in page.get_text('words') if clip.x0<=(w[0]+w[2])/2<=clip.x1 and clip.y0<=(w[1]+w[3])/2<=clip.y1]
    if not words or any(w[0]<clip.x0-.25 or w[1]<clip.y0-.25 or w[2]>clip.x1+.25 or w[3]>clip.y1+.25 for w in words):return None
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            text=''.join(s['text'] for s in line['spans'])
            box=pymupdf.Rect(line['bbox'])
            if text.strip() and clip.intersects(box) and (box.x0<clip.x0-.25 or box.y0<clip.y0-.25 or box.x1>clip.x1+.25 or box.y1>clip.y1+.25):return None
    text=' '.join(w[4] for w in words);counts=Counter(OPTION.findall(text))
    if any(counts[c]!=1 for c in 'ABCDE'):return None
    if not any(re.fullmatch(str(row['printedNumber'])+r'[.)]',w[4]) and w[1]<clip.y0+12 for w in words):return None
    if any(c=='\ufffd' or unicodedata.category(c) in {'Co','Cs'} for c in text):return None
    stem=re.split(r'(?<!\w)A\s*\)',text,maxsplit=1)[0];normalized=normalize(stem)
    if EXTERNAL.search(normalize(text)):return None
    stripped=re.sub(r'^\d+\s*','',normalized)
    if stripped.startswith(('buna gore','bu bilgilere gore','verilenlere gore','bu metne gore')):return None
    for image in page.get_image_info():
        if clip.intersects(pymupdf.Rect(image['bbox'])):return None
    rectangles=[pymupdf.Rect(w[:4]) for w in words]
    for drawing in page.get_drawings():
        rect=pymupdf.Rect(drawing['rect']);hit=pymupdf.Rect(rect.x0-.1,rect.y0-.1,rect.x1+.1,rect.y1+.1)
        if not clip.intersects(hit):continue
        if rect.width<2 and abs(rect.x0-page.rect.width/2)<4:continue
        if rect.width>page.rect.width*.8 and rect.y0>page.rect.height-45:continue
        underline=(rect.height<1.5 and drawing['type']=='s' and any(t.x0-1<=rect.x0 and t.x1+1>=rect.x1 and t.y0<=rect.y0<=t.y1+3 for t in rectangles))
        if not underline:return None
    return {'status':'DETERMINISTIC_NATIVE_BODY_PROVED','imageSha256':row['imageSha256'],
        'method':'FRESH_ORIGINAL_PIXELS_ALL_NATIVE_LINES_AND_WORDS_CONTAINED_FIVE_CHOICES_NO_GRAPHICS_OR_EXTERNAL_CONTEXT_V2',
        'sourceSha256':row['sourceSha256'],'sourcePage':row['bodyPage'],'sourceClip':row['bodyClip'],
        'nativeWords':len(words),'uniqueChoiceCounts':dict(counts),'modelCalls':0,'teacherApproved':False,
        'sourcePixelSha256':hashlib.sha256(pix.samples).hexdigest()}


def run(name,skip_first=0):
    from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
    pdf_decisions=load_decisions()
    folder=BASE/name;package=json.loads((folder/'chapter-packages.json').read_text(encoding='utf8'))
    out=folder/'native-body-proofs';out.mkdir(exist_ok=True);receipts=folder/'body-readings';receipts.mkdir(exist_ok=True)
    started=time.monotonic();counts=Counter();opened={};last=started;bucket=-1;rows=package['items'][skip_first:];categories=None
    groups={g['groupId']:g for g in package.get('keyGroups',[])};mock_courses={}
    try:
        for index,row in enumerate(rows,1):
            if skip_pdf(row['sourceSha256'],pdf_decisions):counts['existingPracticePdfSkipped']+=1;continue
            receipt=receipts/(row['code']+'.json')
            if receipt.exists():counts['existingReceiptsPreserved']+=1;continue
            proof_row=row;subject_evidence=None
            if row['subject'] not in ALLOWED:
                if categories is None:categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
                proof_row,subject_evidence=resolve_body_subject(row,categories)
            mock_group=groups.get(row['groupId'])
            is_mock=row.get('subject') is None and mock_group and mock_group.get('keyIdentityType')=='PREVERIFIED_MOCK_SECTION'
            if proof_row['subject'] not in ALLOWED and not is_mock:counts['visualRoute']+=1;continue
            sha=row['sourceSha256']
            if sha not in opened:
                if len(opened)>=8:
                    oldest=next(iter(opened));opened.pop(oldest).close()
                original=(SOURCE/row['relativePath']).resolve()
                if not original.is_relative_to(SOURCE):raise ValueError('Native proof leaves original root')
                with original.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original native source changed')
                opened[sha]=pymupdf.open(original)
            if proof_row['subject'] not in ALLOWED and is_mock:
                from mebi_pratik2_deneme_ders_kaniti import resolve_mock_course
                proof_row,subject_evidence=resolve_mock_course(row,mock_group,opened[sha],mock_courses)
            proof=prove(opened[sha][row['bodyPage']-1],proof_row,BASE/row['image'])
            if proof:
                if subject_evidence:proof['sourceSubjectEvidence']=subject_evidence
                immutable=out/(row['code']+'.json');write_json(immutable,proof)
                # Exclusive creation preserves every successful/failed visual
                # receipt. The immutable separate proof remains auditable.
                try:
                    # Publish a fully written inode atomically. A reader must
                    # never observe half of a JSON receipt. Model receipts use
                    # atomic replacement, so this immutable proof stays intact.
                    os.link(immutable,receipt)
                    counts['nativeProved']+=1
                except FileExistsError:counts['existingReceiptsPreserved']+=1
            else:counts['visualRoute']+=1
            now=time.monotonic();current=10*index//max(1,len(rows))
            if current>bucket or now-last>=300 or index==len(rows):
                p={'stage':'REGION_NATIVE_BODY_PROOF','completed':index,'total':len(rows),'counts':dict(counts),'elapsedSeconds':round(now-started,1)}
                write_json(folder/'native-body-progress.json',p);print(json.dumps(p),flush=True);last=now;bucket=current
        write_json(folder/'native-body-progress.json',{'stage':'REGION_NATIVE_BODY_PROOF','completed':len(rows),'total':len(rows),
            'percent':100.0,'counts':dict(counts),'elapsedSeconds':round(time.monotonic()-started,1)})
        write_json(folder/'native-body-proof-report.json',{'status':'NATIVE_SUBSET_PROVED_VISUAL_ROUTE_RETAINED','counts':dict(counts),'scopeCandidates':len(rows),
            'skippedInitialCandidates':skip_first,'questionWrites':0,'modelCalls':0,'teacherApprovalsCreated':0})
    finally:
        for document in opened.values():document.close()


def audit_existing():
    from kaynakli_arastirma_db import db_connection,query
    cmd,env,_=db_connection('ivme')
    published=set(json.loads(query((cmd,env,None),"SELECT json_agg(code) FROM questions WHERE bank='MEBI_PRACTICE_2'")))
    actions=[];opened={};counts=Counter();published_failures=[]
    try:
        for package in BASE.glob('*/chapter-packages.json'):
            data=json.loads(package.read_text(encoding='utf8'));rows={r['code']:r for r in data.get('items',[])};folder=package.parent
            for receipt in (folder/'body-readings').glob('*.json'):
                raw=receipt.read_bytes();previous=json.loads(raw)
                if previous.get('method')!='FRESH_ORIGINAL_PIXELS_ALL_NATIVE_WORDS_CONTAINED_FIVE_CHOICES_NO_GRAPHICS_OR_EXTERNAL_CONTEXT':continue
                row=rows[receipt.stem];sha=row['sourceSha256']
                if sha not in opened:
                    path=(SOURCE/row['relativePath']).resolve()
                    if not path.is_relative_to(SOURCE):raise ValueError('Audit source leaves archive root')
                    with path.open('rb') as stream:
                        if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Native audit source changed')
                    opened[sha]=pymupdf.open(path)
                proof=prove(opened[sha][row['bodyPage']-1],row,BASE/row['image'])
                counts['checked']+=1;counts['v2NativeProved' if proof else 'requiresVisual']+=1
                if not proof and row['code'] in published:published_failures.append(row['code'])
                actions.append((folder,receipt,hashlib.sha256(raw).hexdigest(),proof))
        report={'status':'V2_NATIVE_PROOF_AUDIT_COMPLETE' if not published_failures else 'PUBLISHED_VISUAL_REVIEW_REQUIRED',
            'counts':dict(counts),'publishedProofsRequiringVisualReview':published_failures,'questionWrites':0,'teacherApprovalsCreated':0}
        write_json(BASE/'native-body-v2-audit.json',report)
        if published_failures:raise ValueError('Published native shortcut requires actual source-image review before changing receipts')
        for folder,receipt,old_sha,proof in actions:
            if hashlib.sha256(receipt.read_bytes()).hexdigest()!=old_sha:continue
            if proof:
                out=folder/'native-body-proofs-v2';out.mkdir(exist_ok=True);write_json(out/receipt.name,proof);write_json(receipt,proof)
            else:
                out=folder/'native-body-proofs-withdrawn';out.mkdir(exist_ok=True);destination=out/receipt.name
                if not receipt.resolve().is_relative_to((folder/'body-readings').resolve()):raise ValueError('Unsafe derived receipt target')
                if destination.exists():
                    if hashlib.sha256(destination.read_bytes()).hexdigest()!=old_sha:raise ValueError('Withdrawn proof collision')
                    receipt.unlink()
                else:receipt.rename(destination)
        print(json.dumps(report),flush=True)
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--package-dir');p.add_argument('--skip-first',type=int,default=0);p.add_argument('--audit-existing',action='store_true');a=p.parse_args()
    from pathlib import Path
    if a.audit_existing:
        with process_lock(BASE/'.jobs/native-body-v2-audit.lock'):audit_existing()
        raise SystemExit(0)
    if not a.package_dir:p.error('--package-dir is required unless auditing')
    if Path(a.package_dir).name!=a.package_dir:raise ValueError('Unsafe package directory')
    with process_lock(BASE/'.jobs'/(a.package_dir+'-native-body.lock')):run(a.package_dir,a.skip_first)
