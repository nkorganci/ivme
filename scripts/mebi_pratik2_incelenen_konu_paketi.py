"""Freeze explicitly reviewed source-text topics; never accept model suggestions.

Only existing verified-body/independent-key receipts and individually reviewed
decisions qualify. No original-bank question matching, answer solving, new
taxonomy identity or teacher approval is performed here.
"""
import argparse
import hashlib
import json
import unicodedata
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_tek_tarama_konu import source_subject
from mebi_pratik2_pdf_tekrar_kapisi import current_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

OUT=BASE/'reviewed-native-question-expansion'
DECISIONS=APP/'scripts/mebi-pratik2-reviewed-native-topics.json'
REVIEWER='CURRENT_CODEX_ORIGINAL_NATIVE_TEXT_REVIEW'
EVIDENCE_PACKAGE='single-test-pending-evidence'
ALLOW_VISUAL_BODY=False


def normalized(text):return ' '.join(unicodedata.normalize('NFKC',text).split())


def validate_review(decision,row,category,text,subject):
    if decision.get('reviewer')!=REVIEWER or decision.get('status')!='REVIEWED_ACCEPT_TOPIC':raise ValueError('Explicit source review required')
    if decision.get('teacherApproved') is not False:raise ValueError('No teacher approval may be manufactured')
    if decision.get('imageSha256')!=row['imageSha256']:raise ValueError('Reviewed crop identity changed')
    if not category or not category.get('selectable') or not category['id'].startswith('excel.'):
        raise ValueError('Existing selectable main-table category required')
    if category['exam']!=row['exam'] or category['subject']!=subject:raise ValueError('Reviewed exam/course scope differs')
    quote=decision.get('quote','')
    if len(quote.strip())<12 or normalized(quote) not in normalized(text):raise ValueError('Reviewed quotation not in original native text')
    if not decision.get('rationale','').strip():raise ValueError('Topic containment rationale required')


def verified_body(body,row,allow_visual=False):
    if body.get('imageSha256')!=row['imageSha256']:return False
    from mebi_pratik2_hizli_yol import STATUS,valid_receipt
    if body.get('status')==STATUS:return valid_receipt(body,row)
    if body.get('status')=='DETERMINISTIC_NATIVE_BODY_PROVED':return True
    if not allow_visual or body.get('status')!='MODEL_NO_VISIBLE_ISSUE':return False
    reading=body.get('reading',{})
    return (all(reading.get(k) is True for k in ['one_question','all_five_choices_visible'])
            and all(reading.get(k) is False for k in ['visible_truncation','missing_context','uncertainty']))


def run():
    OUT.mkdir(exist_ok=True);target=OUT/'chapter-packages.json'
    if target.exists():return
    decisions=json.loads(DECISIONS.read_text(encoding='utf8'))['decisions']
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    by_category={c['id']:c for c in categories}
    package_path=BASE/EVIDENCE_PACKAGE/'chapter-packages.json';package=json.loads(package_path.read_text(encoding='utf8'))
    by_code={r['code']:r for r in package['items']};groups={g['groupId']:g for g in package['keyGroups']}
    if len({d['code'] for d in decisions})!=len(decisions):raise ValueError('Repeated decision identity')
    reserved=set()
    for path in BASE.glob('*expansion/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8'))['items'])
    rows=[by_code[d['code']] for d in decisions];pdf_decisions=current_decisions(r['sourceSha256'] for r in rows)
    opened={};items=[];evidence=[];skipped=[];body_out=OUT/'body-readings';key_out=OUT/'independent-keys'
    body_out.mkdir(exist_ok=True);key_out.mkdir(exist_ok=True)
    try:
        for decision,row in zip(decisions,rows):
            if skip_pdf(row['sourceSha256'],pdf_decisions):skipped.append(row['sourceSha256']);continue
            if row['code'] in reserved:raise ValueError('Source code already assigned to another frozen publisher')
            folder=BASE/EVIDENCE_PACKAGE;body_path=folder/'body-readings'/(row['code']+'.json')
            key_path=folder/'independent-keys'/(row['groupId']+'.json')
            body=json.loads(body_path.read_text(encoding='utf8'));key=json.loads(key_path.read_text(encoding='utf8'))
            if not verified_body(body,row,ALLOW_VISUAL_BODY):
                raise ValueError('Reviewed verified body proof is absent/different/uncertain')
            if key.get('status')!='AGREES' or key.get('imageSha256')!=row['keyImageSha256']:raise ValueError('Independent key proof differs')
            group=groups[row['groupId']]
            if group['answers'].get(str(row['printedNumber']))!=row['answer']:raise ValueError('Printed key-number binding differs')
            for field,checksum in [('image','imageSha256'),('keyImage','keyImageSha256')]:
                if hashlib.sha256((BASE/row[field]).read_bytes()).hexdigest()!=row[checksum]:raise ValueError('Source image changed')
            sha=row['sourceSha256']
            if sha not in opened:
                original=(SOURCE/row['relativePath']).resolve()
                if not original.is_relative_to(SOURCE):raise ValueError('Reviewed original outside source archive')
                with original.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Reviewed original PDF changed')
                opened[sha]=pymupdf.open(original)
            text=' '.join(w[4] for w in opened[sha][row['bodyPage']-1].get_text('words',clip=pymupdf.Rect(row['bodyClip']),sort=True))
            category=by_category.get(decision['categoryId']);subject=source_subject(row['relativePath'],categories,row['exam'])
            validate_review(decision,row,category,text,subject)
            proof={'basis':'REVIEWED_ORIGINAL_NATIVE_QUESTION_TOPIC','review':decision,
                'sourceTextSha256':hashlib.sha256(text.encode('utf8')).hexdigest(),
                'verifiedBodyReceipt':str(body_path.relative_to(BASE)),'verifiedBodyReceiptSha256':hashlib.sha256(body_path.read_bytes()).hexdigest(),
                'bodyProofStatus':body['status'],
                'independentKeyReceipt':str(key_path.relative_to(BASE)),'independentKeyReceiptSha256':hashlib.sha256(key_path.read_bytes()).hexdigest(),
                'teacherApproved':False}
            items.append({**row,'categoryId':category['id'],'subject':category['subject'],'subjectId':category['subjectId'],
                'subjectCandidates':[category['subject']],'topic':category['topic'],'unit':category.get('unit'),
                'topicEvidence':proof,'priorReviewReasons':row.get('reasons',[]),'reasons':[],'productionImportAllowed':False})
            evidence.append({'code':row['code'],'originalNativeText':text,**proof})
            write_json(body_out/(row['code']+'.json'),body);write_json(key_out/(row['groupId']+'.json'),key)
        used={r['groupId'] for r in items}
        write_json(target,{'status':'INDIVIDUALLY_REVIEWED_NATIVE_TOPIC_CANDIDATES_NOT_IMPORTED','items':items,
            'keyGroups':[groups[g] for g in sorted(used)],'candidateBodies':len(items),
            'decisionsSha256':hashlib.sha256(DECISIONS.read_bytes()).hexdigest(),
            'questionWrites':0,'questionComparisons':0,'teacherApprovalsCreated':0})
        write_json(OUT/'preparation-report.json',{'candidateBodies':len(items),'reviews':evidence,
            'skippedExistingPdfs':sorted(set(skipped)),'modelCalls':0,'questionWrites':0,'questionComparisons':0,
            'teacherApprovalsCreated':0,'allPrintedQuestionsExtracted':False})
        print(json.dumps({'candidateBodies':len(items),'independentKeyAndBodyReceiptsReused':len(items),'modelCalls':0,'questionWrites':0}),flush=True)
    finally:
        for document in opened.values():document.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--package-dir',default=OUT.name)
    parser.add_argument('--decisions',default=DECISIONS.name)
    parser.add_argument('--evidence-package',default=EVIDENCE_PACKAGE)
    parser.add_argument('--allow-verified-visual-body',action='store_true');args=parser.parse_args()
    if (Path(args.package_dir).name!=args.package_dir or Path(args.decisions).name!=args.decisions
            or Path(args.evidence_package).name!=args.evidence_package or not args.decisions.endswith('.json')):
        raise ValueError('Unsafe reviewed source package path')
    OUT=BASE/args.package_dir;DECISIONS=APP/'scripts'/args.decisions
    EVIDENCE_PACKAGE=args.evidence_package;ALLOW_VISUAL_BODY=args.allow_verified_visual_body
    with process_lock(BASE/'.jobs'/(args.package_dir+'-preparation.lock')):run()
