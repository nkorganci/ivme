"""Capture compiled Tarama questions even while controlled topics are pending."""
import hashlib
import json
import time
from collections import Counter
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP,BASE,SOURCE
from mebi_pratik2_konu_basligi import normalize
from mebi_pratik2_uc_adim_kirpim import OPTION,SHARED,scope
from yks_birlestirme import write_json

OUT=BASE/'compiled-tarama-crops'


def choose_topic(group,exam,subjects,categories,reviewed_headers):
    texts=[]
    for line in group['printedBodyHeadings']:
        value=normalize(line['text'])
        if value not in texts:texts.append(value)
    joined=' '.join(texts)
    reviewed=reviewed_headers.get((exam,joined))
    if reviewed:return reviewed
    exact=[c for c in categories if c['id'].startswith('excel.') and c['exam']==exam and c['subject'] in subjects and normalize(c['topic'])==joined and c.get('selectable')]
    return exact[0] if len(exact)==1 else None


def run(sources=None,discovery_dir='compiled-tarama-discovery'):
    OUT.mkdir(exist_ok=True);cats=json.loads((APP/'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories'];by_id={c['id']:c for c in cats}
    previous=json.loads((BASE/'expanded-chapter-evidence/chapter-packages.json').read_text(encoding='utf8'))['chapters'];headers={}
    for row in previous:
        texts=[normalize(l['text']) for l in row['printedHeaderLines'] if l['text'].lstrip().startswith(('>','•'))]
        headers[(row['exam'],' '.join(texts))]=by_id[row['categoryId']]
    if sources is None:sources=json.loads((BASE/'compiled-tarama-discovery/report.json').read_text(encoding='utf8'))['sources']
    results=[];started=time.monotonic()
    from mebi_pratik2_pdf_tekrar_kapisi import load_decisions,skip_pdf
    pdf_decisions=load_decisions()
    for index,source in enumerate(sources,1):
        if skip_pdf(source['sourceSha256'],pdf_decisions):continue
        target=OUT/(source['sourceSha256']+'.json')
        if target.exists():report=json.loads(target.read_text(encoding='utf8'))
        else:
            data=json.loads((BASE/discovery_dir/(source['sourceSha256']+'.json')).read_text(encoding='utf8'))
            cache=json.loads((BASE/source['cache']).read_text(encoding='utf8'));pages={p['physicalPage']:p for p in cache['pages']}
            classification_source={**source,'relativePath':source['exam']+'\\'+source['relativePath'].split('\\')[-1]} if source.get('exam') else source
            exam,subjects=scope(classification_source,cats)
            if 'din kulturu' in normalize(source['relativePath']):subjects.update(c['subject'] for c in cats if c['subjectId']=='din' and c['exam']==exam)
            path=(SOURCE/source['relativePath']).resolve()
            if not path.is_relative_to(SOURCE):raise ValueError('Compiled source outside MEBI scope')
            with path.open('rb') as stream:
                if hashlib.file_digest(stream,'sha256').hexdigest()!=source['sourceSha256']:raise ValueError('Compiled original changed')
            items=[];review=[];key_groups=[]
            all_anchors={}
            for group in data['groups']:
                for anchor in group['bodies']:all_anchors.setdefault(anchor['page'],[]).append(anchor)
            with pymupdf.open(path) as pdf:
                for group in data['groups']:
                    if group['status'] not in ('NATIVE_PRINTED_TEST_BINDING_CANDIDATE','SCANNED_KEY_AND_NATIVE_BODY_BINDING_CANDIDATE'):
                        review.append({'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],**group});continue
                    category=choose_topic(group,exam,subjects,cats,headers)
                    test=group['testNumber'];group_id=source['sourceSha256'][:16]+'-T'+str(test)
                    first_occurrences=[q['keyOccurrences'][0] for q in group['questions']]
                    key_pages={o['page'] for o in first_occurrences}
                    if len(key_pages)!=1:
                        review.append({'groupId':group_id,'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],**group,'reasons':['PRINTED_TEST_KEY_SPANS_PAGES_REVIEW']});continue
                    physical=next(iter(key_pages));key_page=pdf[physical-1]
                    heading_boxes=[o['printedTestHeading']['bbox'] for o in first_occurrences]
                    key_clip=[min([o['bbox'][0] for o in first_occurrences]+[r[0] for r in heading_boxes])-5,
                        min(r[1] for r in heading_boxes)-5,max([o['bbox'][2] for o in first_occurrences]+[r[2] for r in heading_boxes])+5,
                        max(o['bbox'][3] for o in first_occurrences)+5]
                    key_image=OUT.name+'/'+group_id+'-key.png';key_page.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(key_clip),alpha=False).save(BASE/key_image)
                    key_sha=hashlib.sha256((BASE/key_image).read_bytes()).hexdigest()
                    key_groups.append({'groupId':group_id,'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],'exam':exam,
                        'testNumber':test,'keyPage':physical,'keyClip':key_clip,'keyImage':key_image,'keyImageSha256':key_sha,
                        'answers':{str(q['printedNumber']):q['answer'] for q in group['questions']},
                        **({'keyIdentityType':group['keyIdentityType']} if group.get('keyIdentityType') else {})})
                    for question in group['questions']:
                        number=question['printedNumber'];anchor=question['body'];physical=anchor['page'];page=pdf[physical-1];native=pages[physical]
                        column=int(anchor['bbox'][0]>page.rect.width/2)
                        nexts=[a['bbox'][1] for a in all_anchors[physical] if int(a['bbox'][0]>page.rect.width/2)==column and a['bbox'][1]>anchor['bbox'][1]+1]
                        clip=pymupdf.Rect(page.rect.width/2+1 if column else 0,anchor['bbox'][1]-4,page.rect.width if column else page.rect.width/2-1,
                            min(nexts)-4 if nexts else page.rect.height-40)
                        reasons=[];selected=[]
                        for line in native['lines']:
                            for match in SHARED.finditer(line['text']):
                                if int(match[1])<=number<=int(match[2]):reasons.append('SHARED_CONTEXT_REQUIRES_SEPARATE_SOURCE_REGIONS')
                            rect=pymupdf.Rect(line['bbox'])
                            if not line['text'].strip() or not clip.intersects(rect):continue
                            if rect.x0<clip.x0-.25 or rect.x1>clip.x1+.25 or rect.y0<clip.y0-.25 or rect.y1>clip.y1+.25:reasons.append('NATIVE_LINE_INTERSECTS_BODY_BOUNDARY')
                            selected.append(line)
                        counts=Counter(letter for line in selected for letter in OPTION.findall(line['text']))
                        if any(counts[c]!=1 for c in 'ABCDE'):reasons.append('FIVE_UNIQUE_NATIVE_CHOICES_NOT_PROVED')
                        code=f'MEBI2-{source["sourceSha256"][:12]}-T{test}-Q{number:03}'
                        row={'code':code,'groupId':group_id,'sourceSha256':source['sourceSha256'],'relativePath':source['relativePath'],'exam':exam,
                            'testNumber':test,'printedNumber':number,'answer':question['answer'],'bodyPage':physical,'bodyClip':list(clip),
                            'keyPage':next(iter(key_pages)),'keyClip':key_clip,'keyImage':key_image,'keyImageSha256':key_sha,
                            'keyOccurrences':question['keyOccurrences'],'printedSourceHeadings':group['printedBodyHeadings'],
                            'subject':category['subject'] if category else next(iter(subjects)) if len(subjects)==1 else None,
                            'subjectCandidates':sorted(subjects),'subjectId':category['subjectId'] if category else None,
                            'categoryId':category['id'] if category else None,'topic':category['topic'] if category else None,'unit':category.get('unit') if category else None,
                            'topicDecision':'CONTROLLED_PRINTED_CHAPTER_BOUND' if category else 'CONTROLLED_TOPIC_REVIEW_PENDING',
                            'bank':'MEBI_PRACTICE_2','teacherApproved':False,'studentVisible':False,'productionImportAllowed':False}
                        if reasons:review.append({**row,'reasons':sorted(set(reasons)),'status':'REVIEW_REQUIRED'});continue
                        image=OUT.name+'/'+code+'.png';pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=clip,alpha=False);pix.save(BASE/image)
                        if pix.samples!=pymupdf.Pixmap(str(BASE/image)).samples:raise ValueError('Compiled original pixels changed after PNG encoding')
                        items.append({**row,'image':image,'imageSha256':hashlib.sha256((BASE/image).read_bytes()).hexdigest(),
                            'originalBodyPixelSha256':hashlib.sha256(pix.samples).hexdigest(),'nativeChoiceCounts':dict(counts),
                            'status':'INDEPENDENT_KEY_BODY_AND_TOPIC_ACCEPTANCE_PENDING'})
            report={**source,'items':items,'keyGroups':key_groups,'reviewQueueAdditions':review,
                'preparedBodies':len(items),'controlledTopicBodies':sum(r['categoryId'] is not None for r in items),'questionWrites':0}
            write_json(target,report)
        results.append({k:v for k,v in report.items() if k not in ('items','keyGroups','reviewQueueAdditions')})
        print(json.dumps({'completedBooks':index,'totalBooks':len(sources),'preparedBodies':report['preparedBodies'],'controlledTopicBodies':report['controlledTopicBodies'],
            'elapsedSeconds':round(time.monotonic()-started,1)}),flush=True)
    report={'status':'COMPILED_TARAMA_BODY_CAPTURE_COMPLETE_NOT_PUBLICATION','sources':results,'preparedBodies':sum(r['preparedBodies'] for r in results),
        'controlledTopicBodies':sum(r['controlledTopicBodies'] for r in results),'questionWrites':0}
    write_json(OUT/'report.json',report);print(json.dumps({k:v for k,v in report.items() if k!='sources'}))


if __name__=='__main__':run()
