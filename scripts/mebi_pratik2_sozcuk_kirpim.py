"""Capture keyed layout candidates using word boxes instead of merged PDF lines.

This prepares new source-pixel evidence, never an answer/topic admission.
Every crop still needs an independent printed key and body/context review.
Existing input images and their receipts are never overwritten.
"""
import hashlib
import json
import re
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_uc_adim_kirpim import OPTION,SHARED,scope,topic
from mebi_pratik2_arsiv_basliklari import controlled_match
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json

OUT=BASE/'word-boundary-crops'


def prepare_packages():
    folder=BASE/'word-boundary-expansion';folder.mkdir(exist_ok=True)
    target=folder/'chapter-packages.json'
    if target.exists():return
    items=[];groups={}
    for path in sorted(OUT.glob('*.json')):
        data=json.loads(path.read_text(encoding='utf8'))
        if not isinstance(data,dict):continue
        for group in data.get('keyGroups',[]):groups[group['groupId']]=group
        items.extend(row for row in data.get('items',[]) if row.get('categoryId'))
    used={row['groupId'] for row in items}
    write_json(target,{'status':'WORD_LAYOUT_CHAPTER_PACKAGES_READY_NOT_IMPORTED','items':items,
        'keyGroups':[groups[g] for g in sorted(used)],'candidateBodies':len(items),'keyGroupCount':len(used),
        'questionWrites':0,'teacherApprovalsCreated':0})


def word_region(page,clip,number):
    rect=pymupdf.Rect(clip)
    words=[w for w in page.get_text('words') if rect.x0<=(w[0]+w[2])/2<=rect.x1 and rect.y0<=(w[1]+w[3])/2<=rect.y1]
    counts=Counter(OPTION.findall(' '.join(w[4] for w in words)))
    reasons=[]
    if any(counts[c]!=1 for c in 'ABCDE'):reasons.append('FIVE_UNIQUE_WORD_LEVEL_CHOICES_NOT_PROVED')
    if not any(re.fullmatch(str(number)+r'[.)]',w[4]) and w[1]<rect.y0+12 for w in words):reasons.append('PRINTED_BODY_ANCHOR_NOT_IN_WORD_REGION')
    if any(w[0]<rect.x0-1.5 or w[2]>rect.x1+1.5 or w[1]<rect.y0-2 or w[3]>rect.y1+2 for w in words):reasons.append('WORD_STILL_CROSSES_SAFE_BODY_BOUNDARY')
    if words:
        rect=pymupdf.Rect(max(0,min(rect.x0,min(w[0] for w in words)-.25)),max(0,min(rect.y0,min(w[1] for w in words)-.25)),
            min(page.rect.width,max(rect.x1,max(w[2] for w in words)+.25)),min(page.rect.height,max(rect.y1,max(w[3] for w in words)+.25)))
    return list(rect),{'method':'CENTER_SCOPED_NATIVE_WORD_BOXES_COLUMN_AND_ANCHOR','wordCount':len(words),
        'uniqueChoiceCounts':dict(counts),'sourceText':' '.join(w[4] for w in words)},reasons


def heading_category(row,group,exam,subjects,categories):
    if 'chapter' in group:
        return topic(group,exam,subjects,categories) or controlled_match(group['chapter'],exam,subjects,categories)
    parts=[]
    for line in row.get('printedSourceHeadings',[]):
        text=line.get('text','')
        if not text.lstrip().startswith('>'):continue
        parts.extend(p.strip() for p in text.split('>')[1:] if p.strip())
    choices=[]
    for part in parts:
        exact=[c for c in categories if c.get('selectable') and c['id'].startswith('excel.') and c['exam']==exam and c['subject'] in subjects and normalize(c['topic'])==normalize(part)]
        category=exact[0] if len(exact)==1 else controlled_match(part,exam,subjects,categories)
        if category is None:return None
        choices.append(category)
    unique={c['id']:c for c in choices}
    return next(iter(unique.values())) if len(unique)==1 else None


def run(directories=None,prepare=True):
    OUT.mkdir(exist_ok=True);categories=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
    pdf_decisions=load_decisions()
    sources=[];total=controlled=reviewed=0
    for directory in directories if directories is not None else ['three-step-all-bodies-v2','compiled-tarama-crops']:
        for path in sorted((BASE/directory).glob('*.json')):
            data=json.loads(path.read_text(encoding='utf8'))
            if not isinstance(data,dict) or not data.get('sourceSha256'):continue
            if skip_pdf(data['sourceSha256'],pdf_decisions):continue
            candidates=[r for r in data.get('reviewQueueAdditions',[]) if r.get('code') and r.get('bodyClip') and r.get('keyImage')]
            if not candidates:continue
            sha=data['sourceSha256'];target=OUT/(sha+'.json')
            if target.exists():report=json.loads(target.read_text(encoding='utf8'))
            else:
                original=(SOURCE/data['relativePath']).resolve()
                if not original.is_relative_to(SOURCE):raise ValueError('Word adapter leaves source root')
                with original.open('rb') as stream:
                    if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Original PDF changed')
                exam,subjects=scope(data,categories)
                individual='Deneme-Tarama' in data['relativePath']
                if individual:
                    from mebi_pratik2_tek_tarama_konu import source_subject,heading_category as individual_category
                    exam=next((p for p in data['relativePath'].split('\\') if p in ('TYT','AYT')),None)
                    subject=source_subject(data['relativePath'],categories,exam);subjects={subject} if subject else set()
                groups={g['groupId']:g for g in data['keyGroups']};items=[];review=[]
                with pymupdf.open(original) as pdf:
                    for row in candidates:
                        page=pdf[row['bodyPage']-1]
                        clip,proof,reasons=word_region(page,row['bodyClip'],row['printedNumber'])
                        for index in range(max(0,row['bodyPage']-2),min(len(pdf),row['bodyPage']+1)):
                            for match in SHARED.finditer(pdf[index].get_text()):
                                if int(match[1])<=row['printedNumber']<=int(match[2]):reasons.append('SHARED_CONTEXT_REQUIRES_EXPLICIT_REGIONS')
                        key_group=groups[row['groupId']]
                        # A Tarama key group has no chapter; its visible body headings are separate.
                        category=individual_category(row.get('printedSourceHeadings',[]),exam,subject,categories) if individual else heading_category(row,key_group,exam,subjects,categories)
                        new={**row,'exam':exam,'bodyClip':clip,'priorLayoutReviewReasons':row.get('reasons',[]),'wordBodyProof':proof,
                            'newLayoutEvidence':True,'productionImportAllowed':False,'studentVisible':False}
                        if category:new.update(categoryId=category['id'],subject=category['subject'],subjectId=category['subjectId'],
                            topic=category['topic'],unit=category.get('unit'),topicDecision='CONTROLLED_PRINTED_SOURCE_HEADING_BOUND')
                        if reasons:review.append({**new,'status':'REVIEW_REQUIRED','reasons':sorted(set(reasons))});continue
                        relative=OUT.name+'/'+row['code']+'.png';pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(clip),alpha=False)
                        pix.save(BASE/relative)
                        if pix.samples!=pymupdf.Pixmap(str(BASE/relative)).samples:raise ValueError('Word-adapter saved pixels differ')
                        new.update(image=relative,imageSha256=hashlib.sha256((BASE/relative).read_bytes()).hexdigest(),
                            originalBodyPixelSha256=hashlib.sha256(pix.samples).hexdigest(),status='NEW_LAYOUT_INDEPENDENT_KEY_BODY_TOPIC_REVIEW_REQUIRED',
                            nativeBodyProof={'status':'LOCAL_VISUAL_BODY_REVIEW_REQUIRED','uniqueChoiceCounts':proof['uniqueChoiceCounts']})
                        new.pop('reasons',None);items.append(new)
                report={'sourceSha256':sha,'relativePath':data['relativePath'],'items':items,'keyGroups':data['keyGroups'],
                    'reviewQueueAdditions':review,'preparedBodies':len(items),'controlledTopicBodies':sum(bool(r.get('categoryId')) for r in items),
                    'questionWrites':0,'teacherApprovalsCreated':0}
                write_json(target,report)
            total+=report['preparedBodies'];controlled+=report['controlledTopicBodies'];reviewed+=len(report['reviewQueueAdditions'])
            sources.append({k:report[k] for k in ['sourceSha256','relativePath','preparedBodies','controlledTopicBodies']})
            print(json.dumps({'sources':len(sources),'newBodyCrops':total,'controlledTopicBodies':controlled,'reviewCandidates':reviewed}),flush=True)
    result={'status':'WORD_BOUNDARY_SOURCE_CAPTURE_COMPLETE_NOT_ADMISSION','sources':sources,'preparedBodies':total,
        'controlledTopicBodies':controlled,'remainingLayoutReview':reviewed,'questionWrites':0}
    write_json(OUT/'report.json',result);print(json.dumps({k:v for k,v in result.items() if k!='sources'}))
    if prepare:prepare_packages()


if __name__=='__main__':run()
