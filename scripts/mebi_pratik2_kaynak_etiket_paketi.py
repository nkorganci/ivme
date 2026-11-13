"""Freeze source-heading-labelled candidates using saved crops and receipts."""
import hashlib
import json
from collections import Counter
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from mebi_pratik2_incelenen_konu_paketi import verified_body
from mebi_pratik2_pdf_tekrar_kapisi import current_decisions,skip_pdf
from yks_birlestirme import write_json,process_lock

NAME='source-heading-profile-expansion'


def run():
    out=BASE/NAME;out.mkdir(exist_ok=True);target=out/'chapter-packages.json'
    if target.exists():return
    label_path=BASE/'question-source-labels/index.json';labels=json.loads(label_path.read_text(encoding='utf8'))['records']
    label_sha=hashlib.sha256(label_path.read_bytes()).hexdigest()
    categories={c['id']:c for c in json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']}
    reserved=set()
    for p in BASE.glob('*expansion/chapter-packages.json'):reserved.update(r['code'] for r in json.loads(p.read_text(encoding='utf8'))['items'])
    held={r['code'] for r in json.loads((APP/'scripts/mebi-pratik2-native-content-holds.json').read_text(encoding='utf8'))['heldReviews']}
    rows={}
    for name in ['all-source-evidence','single-test-pending-evidence','individual-tarama-pending-evidence',
                 'individual-tarama-word-pending-evidence','bold-number-pending-evidence','scanned-literature-pending-evidence','full-mock-pending-evidence']:
        folder=BASE/name;d=json.loads((folder/'chapter-packages.json').read_text(encoding='utf8'));groups={g['groupId']:g for g in d['keyGroups']}
        for r in d['items']:
            if r['code'] not in reserved and r['code'] not in held:rows[r['code']]=(r,folder,groups[r['groupId']])
    policy=current_decisions(r[0]['sourceSha256'] for r in rows.values())
    accepted=[];used={};review=[];counts=Counter()
    for code,(row,folder,group) in rows.items():
        entry=labels.get(code);label=entry.get('sourceLabelEvidence',{}) if entry else {}
        if not label.get('categoryId') or skip_pdf(row['sourceSha256'],policy):continue
        if (entry['sourceSha256'],entry['imageSha256'])!=(row['sourceSha256'],row['imageSha256']):raise ValueError('Label/crop binding differs')
        category=categories[label['categoryId']]
        if not category.get('selectable') or not category['id'].startswith('excel.') or category['exam']!=row['exam']:
            raise ValueError('Source label target is outside main table scope')
        for field in ['subject','unit','topic']:
            if category.get(field)!=label.get('canonical'+field.title()):raise ValueError('Canonical source labels differ')
        body_path=folder/'body-readings'/(code+'.json');key_path=folder/'independent-keys'/(row['groupId']+'.json')
        if not body_path.exists() or not key_path.exists():review.append({'code':code,'reason':'WAITING_FOR_EXISTING_BODY_OR_KEY_RECEIPT'});continue
        body=json.loads(body_path.read_text(encoding='utf8'));key=json.loads(key_path.read_text(encoding='utf8'))
        if not verified_body(body,row,allow_visual=True) or key.get('status')!='AGREES' or key.get('imageSha256')!=row['keyImageSha256']:
            review.append({'code':code,'reason':'EXISTING_BODY_OR_KEY_REVIEW_REQUIRED'});continue
        if group['answers'].get(str(row['printedNumber']))!=row['answer']:raise ValueError('Printed key number differs')
        for field,digest in [('image','imageSha256'),('keyImage','keyImageSha256')]:
            if hashlib.sha256((BASE/row[field]).read_bytes()).hexdigest()!=row[digest]:raise ValueError('Saved source image changed')
        proof={'basis':'OFFICIAL_SOURCE_SINGLE_TOPIC_HEADINGS_EXISTING_MAIN_IDENTITY','sourceLabelEvidence':label,
               'sourceLabelIndexSha256':label_sha,'originalBodyReceipt':str(body_path.relative_to(BASE)),
               'originalBodyReceiptSha256':hashlib.sha256(body_path.read_bytes()).hexdigest(),
               'originalKeyReceipt':str(key_path.relative_to(BASE)),'originalKeyReceiptSha256':hashlib.sha256(key_path.read_bytes()).hexdigest(),
               'teacherApproved':False,'modelCalls':0,'imageWrites':0}
        accepted.append({**row,'categoryId':category['id'],'subject':category['subject'],'subjectId':category['subjectId'],
                         'unit':category.get('unit'),'topic':category['topic'],'subjectCandidates':[category['subject']],
                         'topicEvidence':proof,'reasons':[],'productionImportAllowed':False,'studentVisible':False,'teacherApproved':False})
        used[group['groupId']]=group;counts[category['subject']]+=1
        for dirname,name,value in [('body-readings',code,body),('independent-keys',group['groupId'],key)]:
            (out/dirname).mkdir(exist_ok=True);write_json(out/dirname/(name+'.json'),value)
    write_json(target,{'status':'SOURCE_HEADING_PROFILE_CANDIDATES_NOT_IMPORTED','items':accepted,'keyGroups':list(used.values()),
                       'candidateBodies':len(accepted),'sourceLabelIndexSha256':label_sha,'questionWrites':0,'imageWrites':0})
    write_json(out/'preparation-report.json',{'candidateBodies':len(accepted),'bySubject':dict(counts),'review':review,
        'modelCalls':0,'imageWrites':0,'questionWrites':0,'teacherApprovalsCreated':0})
    print(json.dumps({'candidateBodies':len(accepted),'bySubject':dict(counts),'review':len(review),'imageWrites':0,'modelCalls':0}))


if __name__=='__main__':
    with process_lock(BASE/'.jobs'/(NAME+'-preparation.lock')):run()
