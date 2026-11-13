"""Preserve Dört Dörtlük question pixels separately from printed solutions.

Matrix rows retain their original column header and chapter/test identity.
Worked questions retain the explicit printed Cevap line; their body image
ends before Çözüm. Native binding and cropping are not publication approval.
"""
import hashlib
import json
import re
import time
from collections import Counter,defaultdict
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_sozcuk_kirpim import word_region
from mebi_pratik2_arsiv_basliklari import controlled_match
from mebi_pratik2_uc_adim_kirpim import SHARED,scope
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'four-square-crops'
ROOT=BASE/'four-square-discovery-v3'
PACKAGE='four-square-expansion'
ADDITIONAL=False


def prepare_packages():
    folder=BASE/PACKAGE;folder.mkdir(exist_ok=True);target=folder/'chapter-packages.json'
    if target.exists():return
    items=[];groups={}
    for path in sorted(OUT.glob('*.json')):
        data=json.loads(path.read_text(encoding='utf8'))
        if not isinstance(data,dict):continue
        for group in data.get('keyGroups',[]):groups[group['groupId']]=group
        items.extend(row for row in data.get('items',[]) if row.get('categoryId'))
    used={row['groupId'] for row in items}
    write_json(target,{'status':'FOUR_SQUARE_PACKAGES_READY_NOT_IMPORTED','items':items,'keyGroups':[groups[g] for g in sorted(used)],
        'candidateBodies':len(items),'keyGroupCount':len(used),'questionWrites':0,'teacherApprovalsCreated':0})


def category_for(chapter,exam,subjects,categories):
    matches=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject'] in subjects and normalize(c['topic'])==normalize(chapter)]
    if len(matches)==1:return matches[0]
    # Explicit subsets of one broad topic, not a guess between leaf topics.
    aliases={
        'sinir sistemi':('Biyoloji','Denetleyici ve Düzenleyici Sistem, Duyu Organları'),
        'endokrin sistem':('Biyoloji','Denetleyici ve Düzenleyici Sistem, Duyu Organları'),
        'madde ve ozkutle':('Fizik','Madde ve Özellikleri'),
        'dayaniklilik':('Fizik','Madde ve Özellikleri'),
        'adezyon kohezyon':('Fizik','Madde ve Özellikleri'),
        'is guc enerji':('Fizik','İş, Güç ve Enerji' if exam=='AYT' else 'Enerji'),
    }
    target=aliases.get(normalize(chapter))
    if target and target[0] in subjects:
        choices=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject']==target[0] and c['topic']==target[1]]
        if len(choices)==1:return choices[0]
    return controlled_match(chapter,exam,subjects,categories)


def run():
    OUT.mkdir(exist_ok=True);sources=json.loads((ROOT/'report.json').read_text(encoding='utf8'))['sources']
    categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories'];reports=[];started=time.monotonic()
    reserved=set()
    if ADDITIONAL:
        for package in BASE.glob('*/chapter-packages.json'):
            reserved.update(r['code'] for r in json.loads(package.read_text(encoding='utf8')).get('items',[]))
    for source in sources:
        sha=source['sourceSha256'];target=OUT/(sha+'.json')
        if target.exists():report=json.loads(target.read_text(encoding='utf8'))
        else:
            data=json.loads((ROOT/(sha+'.json')).read_text(encoding='utf8'))
            native=json.loads((BASE/'full-pdf-native'/(sha+'.json')).read_text(encoding='utf8'))
            exam,subjects=scope(source,categories)
            if exam=='TYT' and 'turkce' in normalize(' '.join(l['text'] for p in native['pages'][:2] for l in p['lines'])):subjects={'Türkçe'}
            original=(SOURCE/source['relativePath']).resolve()
            if not original.is_relative_to(SOURCE):raise ValueError('Four-square source leaves archive root')
            with original.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original source changed')
            items=[];review=[];key_groups=[];seen_solved=Counter((r['chapterKey'],r['printedNumber']) for r in data['solvedQuestions'])
            prior_locations=defaultdict(list)
            if ADDITIONAL:
                old=json.loads((BASE/'four-square-crops'/(sha+'.json')).read_text(encoding='utf8'))
                for previous in old['items']+old['reviewQueueAdditions']:
                    if not previous.get('code') or not previous.get('bodyClip'):continue
                    column=int(previous['bodyClip'][0]>100)
                    prior_locations[(previous['bodyPage'],column,previous['printedNumber'],previous['sourceQuestionType'])].append(previous)
            candidates=[]
            with pymupdf.open(original) as pdf:
                for group in data['groups']:
                    identity=hashlib.sha256(('FOUR_SQUARE|'+group['chapterKey']+'|'+group['testToken']).encode()).hexdigest()[:10]
                    group_id=sha[:16]+'-FS-'+identity
                    boxes=[l['bbox'] for l in group['chapterLines']]+[c['bbox'] for c in group['numberHeader']]+[group['rowLabelBBox']]+[a['bbox'] for a in group['answers']]
                    page=pdf[group['keyPage']-1];clip=[max(0,min(b[0] for b in boxes)-3),max(0,min(b[1] for b in boxes)-3),
                        min(page.rect.width,max(b[2] for b in boxes)+3),min(page.rect.height,max(b[3] for b in boxes)+3)]
                    key=OUT.name+'/'+group_id+'-key.png';page.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(clip),alpha=False).save(BASE/key)
                    g={'groupId':group_id,'sourceSha256':sha,'relativePath':source['relativePath'],'keyIdentityType':'FOUR_SQUARE_MATRIX_ROW',
                        'chapter':group['chapter'],'chapterKey':group['chapterKey'],'matrixTestToken':group['testToken'],
                        'keyPage':group['keyPage'],'keyClip':clip,'keyImage':key,'keyImageSha256':hashlib.sha256((BASE/key).read_bytes()).hexdigest(),
                        'answers':{str(a['printedNumber']):a['answer'] for a in group['answers']},'matrixSourceEvidence':group}
                    key_groups.append(g)
                    for question in group['questions']:candidates.append((question['body'],question,g,identity))
                for question in data['solvedQuestions']:
                    if seen_solved[(question['chapterKey'],question['printedNumber'])]!=1:
                        review.append({**question,'sourceSha256':sha,'relativePath':source['relativePath'],'reasons':['SOLVED_PRINTED_NUMBER_REPEATED_IN_CHAPTER'],'studentVisible':False});continue
                    identity=hashlib.sha256(('FOUR_SQUARE|'+question['chapterKey']+'|SOLVED').encode()).hexdigest()[:10]
                    group_id=sha[:16]+'-FS-'+identity+'-Q'+str(question['printedNumber'])
                    page=pdf[question['page']-1];column=question['column']
                    key_clip=[page.rect.width/2+1 if column else 0,question['bbox'][1]-3,
                        page.rect.width if column else page.rect.width/2-1,question['answerBBox'][3]+3]
                    key=OUT.name+'/'+group_id+'-key.png';page.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(key_clip),alpha=False).save(BASE/key)
                    g={'groupId':group_id,'sourceSha256':sha,'relativePath':source['relativePath'],'keyIdentityType':'INLINE_EXPLICIT_CEVAP',
                        'chapter':question['chapter'],'chapterKey':question['chapterKey'],'keyPage':question['page'],'keyClip':key_clip,
                        'keyImage':key,'keyImageSha256':hashlib.sha256((BASE/key).read_bytes()).hexdigest(),'questionNumberBBox':question['bbox'],
                        'answerBBox':question['answerBBox'],'answers':{str(question['printedNumber']):question['answer']}}
                    key_groups.append(g);candidates.append((question,question,g,identity))
                for body,answer,group,identity in candidates:
                    page=pdf[body['page']-1];number=body['printedNumber'];code=f'MEBI2-{sha[:12]}-{identity}-Q{number:03}'
                    previous=None
                    if ADDITIONAL:
                        prior=prior_locations.get((body['page'],body['column'],number,body['testToken']),[])
                        if len(prior)>1:
                            review.append({'sourceSha256':sha,'page':body['page'],'printedNumber':number,'reasons':['PRIOR_PHYSICAL_BODY_IDENTITY_NOT_UNIQUE']});continue
                        if prior:
                            previous=prior[0];code=previous['code']
                            if normalize(previous['printedChapter'])==normalize(body['chapter']):continue
                        if code in reserved:continue
                    category=category_for(body['chapter'],exam,subjects,categories)
                    if ADDITIONAL and category is None:
                        from mebi_pratik2_konu_ayrintisi import match_title
                        category=match_title(body['chapter'],exam,subjects,categories)
                    top=body['bbox'][1]-4;end=body['solutionStartBBox'][1]-3 if body['testToken']=='SOLVED' else body['columnEndY']
                    clip=[page.rect.width/2+1 if body['column'] else 0,top,page.rect.width if body['column'] else page.rect.width/2-1,end]
                    clip,proof,reasons=word_region(page,clip,number)
                    for match in SHARED.finditer(page.get_text()):
                        if int(match[1])<=number<=int(match[2]):reasons.append('SHARED_CONTEXT_REQUIRES_EXPLICIT_SOURCE_REGIONS')
                    row={'code':code,'sourceSha256':sha,'relativePath':source['relativePath'],'groupId':group['groupId'],
                        'printedNumber':number,'testNumber':body['chapter']+' / '+body['testToken'],'exam':exam,
                        'subject':category['subject'] if category else next(iter(subjects)) if len(subjects)==1 else None,
                        'subjectCandidates':sorted(subjects),'subjectId':category['subjectId'] if category else None,
                        'categoryId':category['id'] if category else None,'topic':category['topic'] if category else body['chapter'],
                        'unit':category.get('unit') if category else None,'bodyPage':body['page'],'bodyClip':clip,
                        'keyPage':group['keyPage'],'keyClip':group['keyClip'],'keyImage':group['keyImage'],'keyImageSha256':group['keyImageSha256'],
                        'answer':answer['answer'],'nativeBodyProof':{'status':'LOCAL_VISUAL_BODY_REVIEW_REQUIRED','uniqueChoiceCounts':proof['uniqueChoiceCounts']},
                        'wordBodyProof':proof,'printedChapter':body['chapter'],'sourceQuestionType':body['testToken'],
                        'teacherApproved':False,'studentVisible':False,'productionImportAllowed':False}
                    if ADDITIONAL:
                        row.update(newLayoutEvidence=True,printedHeaderCorrectionEvidence={'discovery':ROOT.name,
                            'previousChapter':previous['printedChapter'] if previous else None,'currentChapter':body['chapter'],
                            'existingQuestionCodePreserved':bool(previous)})
                    if reasons:review.append({**row,'status':'REVIEW_REQUIRED','reasons':sorted(set(reasons))});continue
                    image=OUT.name+'/'+code+'.png';pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(clip),alpha=False);pix.save(BASE/image)
                    if pix.samples!=pymupdf.Pixmap(str(BASE/image)).samples:raise ValueError('Four-square body PNG pixels differ')
                    items.append({**row,'image':image,'imageSha256':hashlib.sha256((BASE/image).read_bytes()).hexdigest(),
                        'status':'SOURCE_BODY_REQUIRES_INDEPENDENT_KEY_VISUAL_AND_CONTROLLED_TOPIC_ACCEPTANCE'})
            report={'sourceSha256':sha,'relativePath':source['relativePath'],'items':items,'keyGroups':key_groups,'reviewQueueAdditions':review,
                'preparedBodies':len(items),'controlledTopicBodies':sum(bool(r.get('categoryId')) for r in items),'questionWrites':0,'teacherApprovalsCreated':0}
            write_json(target,report)
        reports.append({k:report[k] for k in ['sourceSha256','relativePath','preparedBodies','controlledTopicBodies']})
        print(json.dumps({'sources':len(reports),'preparedBodies':sum(r['preparedBodies'] for r in reports),
            'controlledTopicBodies':sum(r['controlledTopicBodies'] for r in reports),'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    write_json(OUT/'report.json',{'status':'FOUR_SQUARE_SOURCE_CROPS_READY_NOT_ADMITTED','sources':reports,
        'preparedBodies':sum(r['preparedBodies'] for r in reports),'controlledTopicBodies':sum(r['controlledTopicBodies'] for r in reports),'questionWrites':0})
    prepare_packages()


if __name__=='__main__':
    import argparse
    from pathlib import Path
    p=argparse.ArgumentParser();p.add_argument('--discovery-dir',default=ROOT.name);p.add_argument('--output-dir',default=OUT.name)
    p.add_argument('--package-dir',default=PACKAGE);p.add_argument('--additional-only',action='store_true');a=p.parse_args()
    if any(Path(n).name!=n for n in (a.discovery_dir,a.output_dir,a.package_dir)):raise ValueError('Unsafe source package path')
    if a.additional_only and a.output_dir=='four-square-crops':raise ValueError('Additional layout must preserve original crop evidence')
    ROOT=BASE/a.discovery_dir;OUT=BASE/a.output_dir;PACKAGE=a.package_dir;ADDITIONAL=a.additional_only
    run()
