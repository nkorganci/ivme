"""Bind verified Din book keys to numbered bodies and original lossless regions."""
from collections import Counter
import hashlib
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_din_kitap_anahtar import BOOKS,validate_section
from yks_deneme_govde import glyph_lines,contexts,FLAGS
from yks_kirpim_istisna import layout_regions
from yks_pilot_sorular import OPTION
from yks_pilot_kirpim_kontrol import uncovered_body_lines
from yks_istisna_kirpim import original_image,verify_image
from pdf_source_reconcile import text_fingerprint

VERSION='din-book-printed-section-original-body-regions-v1'
AYT_BOOK='0d71ed945447d0672bd38f841988e449fe28955f20905d2bc1211f5727d3fe5e'
TYT_BOOK='3294337d6b620faf7f2c1f6e675e5cad2629e9861b59c212784874439584b845'
CAPTION_PAGES={AYT_BOOK:{87:1,88:4,91:14,93:18,94:24,95:26,96:29,97:31},
    TYT_BOOK:{98:1,99:3,102:11,107:23,108:24,111:[31,32],112:33}}
VIEWED={
    (AYT_BOOK,'5'):{'0d71ed-page47.png':'8ae8b56d0f3f3f6a2db4c62474757d4d4d890b86c02af8d5cf23e7c01ffceb57',
        '0d71ed-page48.png':'a1533a91ea9d6c26dff14675ed620da4dcaf075485b6a50171e73aa5a014d282'},
    (TYT_BOOK,'1'):{'329433-page19.png':'42179d3bd04e927d3415d5c0b8015e0c811ab42bf8ff3044ce00652a7828a535'},
    (TYT_BOOK,'10'):{'329433-page95.png':'14b4f145f4edf3b3a2d6eeff925a47a57c137d8eb7307704b493257522b3ce2f'},
    (AYT_BOOK,'past-exams'):{'past-exam-caption-contact.png':'3cdefea0b19bcfa8072a04b73ec750a14ff932a57bf79ff12d23df88468cacbc'},
    (TYT_BOOK,'past-exams'):{'past-exam-caption-contact.png':'3cdefea0b19bcfa8072a04b73ec750a14ff932a57bf79ff12d23df88468cacbc',
        'tyt111-left-caption.png':'f4edb0120539c10c659f90357bd77a620048c08bf0895153fff3d8546337ab74'},
}


def caption_region(page,regions,number):
    target=next(r for r in regions if r['number']==number);col=target['column'];top=target['anchor']['contentTopPt']
    lines=[]
    for block in page.get_text('dict',flags=FLAGS)['blocks']:
        for line in block.get('lines',[]):
            spans=[s for s in line['spans'] if s['text'].strip()]
            if not spans or not all(s['color']==16777215 and 'Bold' in s['font'] and abs(s['size']-9)<.01 for s in spans):continue
            box=list(line['bbox'])
            if (box[0]>=page.rect.width/2)!=bool(col) or not top-55<box[1]<top:continue
            lines.append({'text':''.join(s['text'] for s in spans),'bbox':box})
    if not lines:raise ValueError('Explicitly viewed white topic ribbon is missing')
    box=[target['bboxPt'][0],min(l['bbox'][1] for l in lines)-6,target['bboxPt'][2],top-.25]
    previous=next((r for r in regions if r['column']==col and r['number']==number-1),None)
    if previous and previous['bboxPt'][3]>box[1]:previous['bboxPt'][3]=box[1]-.1
    return {'pdfPage':page.number+1,'bboxPt':box,'role':'ORIGINAL_PRINTED_SOURCE_TOPIC_RIBBON',
        'text':'\n'.join(l['text'] for l in lines),'followingPrintedNumber':number,'fineTopicAutomaticallyAccepted':False}


def body_section(page,exam):
    text=page.get_text(flags=FLAGS);identities=test_identities(text)
    if len(identities)==1:
        printed_exam,number=next(iter(identities))
        if printed_exam!=exam or not 1<=number<=10:raise ValueError('Body printed exam/diagnostic identity differs')
        return str(number)
    if len(identities)>1:return None
    heading=plain(' '.join(l['text'] for l in glyph_lines(page) if l['bbox'][1]<page.rect.height*.15))
    if re.search(r'YKS\s+CIKMIS\s+SORULAR\s*[-–]?\s*'+exam,heading):return 'past-exams'
    return None


def source_pages(document,exam,first_key_page):
    pages={str(n):[] for n in range(1,11)};pages['past-exams']=[];other=[]
    for page in list(document)[:first_key_page-1]:
        section=body_section(page,exam)
        if section:pages[section].append(page.number+1)
        else:
            text=page.get_text(flags=FLAGS)
            if len(set(OPTION.findall(text)))>=4:other.append(page.number+1)
    return pages,other


def prepare_section(document,key,pages,out):
    validate_section(key);sha=key['sourceSha256'];answers={a['number']:a['answer'] for a in key['nativePrintedAnswers']}
    cards=[];actual=[];coverage=[];issues=[];active={};heads=[]
    for number in pages:
        page=document[number-1];lines=glyph_lines(page)
        try:regions,layout=layout_regions(lines,page.rect.width,page.rect.height)
        except ValueError as exc:issues.append({'page':number,'reason':str(exc)});continue
        regions=[r for r in regions if r['number'] in answers]
        for r in regions:r.setdefault('anchor',{'contentTopPt':r['bboxPt'][1]+4})
        captions=[]
        if key['sectionName']=='past-exams' and number in CAPTION_PAGES.get(sha,{}):
            selected=CAPTION_PAGES[sha][number];selected=selected if isinstance(selected,list) else [selected]
            captions=[caption_region(page,regions,n) for n in selected]
        try:shared=contexts(page,lines,regions,allow_cross_page=True)
        except ValueError as exc:shared=[];issues.append({'page':number,'reason':str(exc)})
        for context in shared:
            for n in context['dependentPrintedNumbers']:
                if n in active:raise ValueError('Ambiguous repeated book source context')
                active[n]=context
        continuations={};left=[r for r in regions if r['column']==0];right=[r for r in regions if r['column']==1]
        if left and right:
            a=max(left,key=lambda r:r['number']);b=min(right,key=lambda r:r['number'])
            prefix=[l for l in lines if l['bbox'][0]>page.rect.width/2 and page.rect.height*.1<l['bbox'][1]<b['bboxPt'][1]
                and not any(pymupdf.Rect(c['bboxPt']).intersects(pymupdf.Rect(l['bbox'])) for c in shared)]
            if prefix and b['number']==a['number']+1:
                continuations[a['number']]={'pdfPage':number,'bboxPt':[page.rect.width/2-1,min(l['bbox'][1] for l in prefix)-4,page.rect.width-14,b['bboxPt'][1]-.1],
                    'role':'ORIGINAL_LAST_LEFT_QUESTION_CONTINUES_AT_TOP_OF_RIGHT_COLUMN'}
        used=[]
        first=min((r['bboxPt'][1] for r in regions),default=page.rect.height)
        heads.append({'page':number,'printedHeaderLines':[l for l in lines if l['bbox'][1]<first],
            'unexpectedMathematicsTemplateLabelPresent':any('MATEMATIK' in plain(l['text']) for l in lines if l['bbox'][1]<first),
            'folderTopicCopiedToQuestion':False})
        for r in regions:
            n=r['number'];actual.append(n);parts=[]
            if n in active:parts.append({k:active[n][k] for k in ['pdfPage','bboxPt','role']})
            for caption in captions:
                if caption['followingPrintedNumber']==n:parts.insert(0,{k:caption[k] for k in ['pdfPage','bboxPt','role']})
            parts.append({'pdfPage':number,'bboxPt':r['bboxPt'],'role':'ORIGINAL_QUESTION_BODY'})
            if n in continuations:parts.append(continuations[n])
            used+=parts;code='mebi-din-book-'+sha[:12]+'-t'+key['sectionName']+'-q'+str(n)
            text='\n\n'.join(document[p['pdfPage']-1].get_text(clip=pymupdf.Rect(p['bboxPt']),flags=FLAGS).strip()
                for p in parts if p['role']!='ORIGINAL_PRINTED_SOURCE_TOPIC_RIBBON')
            labels=Counter(OPTION.findall('\n'.join(document[p['pdfPage']-1].get_text(clip=pymupdf.Rect(p['bboxPt']),flags=FLAGS) for p in parts if p['role'] not in ['PRINTED_SHARED_PARAGRAPH_CONTEXT','ORIGINAL_PRINTED_SOURCE_TOPIC_RIBBON'])))
            image=out/(code+'.webp');stamp=out/(code+'.crop.json');identity=signature([VERSION,sha,key['sectionName'],n,parts,180,pymupdf.VersionBind,FLAGS])
            old=read_json(stamp) if stamp.is_file() else {}
            if not image.is_file() or old.get('identity')!=identity or old.get('imageSha256')!=digest(image):
                pixels,_=original_image(document,parts);pixels.save(image,format='WEBP',lossless=True,method=0)
                proof=verify_image(document,parts,image);write_json(stamp,{'identity':identity,'imageSha256':digest(image),'pixelProof':proof})
            concerns=[]
            if labels!=Counter('ABCDE'):concerns.append('EMBEDDED_OR_MISSING_NATIVE_OPTION_LABELS_REVIEW_REQUIRED')
            if '\ufffd' in text:concerns.append('SOURCE_GLYPH_VISUAL_REVIEW_REQUIRED')
            cards.append({'code':code,'sourceSha256':sha,'sourcePath':key['sourcePath'],'sectionId':key['sectionId'],'sectionName':key['sectionName'],
                'printedNumber':n,'pdfPage':number,'bboxPt':r['bboxPt'],'sourceRegions':parts,'image':str(image),'imageSha256':digest(image),
                'pixelProof':{'path':str(stamp),'sha256':digest(stamp)},'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
                'textFingerprint':text_fingerprint(text),'answer':answers[n],'sourceKeyPage':key['physicalKeyPage'],
                'sourceKeyDocumentSha256':sha,'sourceKeyPath':key['sourcePath'],'keyEvidenceSha256':key['evidenceSha256'],
                'answerOrigin':'EXPLICIT_PRINTED_SOURCE_BOOK_SECTION_KEY','answerReadingMethods':'NATIVE_PLUS_INDEPENDENT_QWEN_KEY_CROP',
                'exam':key['exam'],'printedExamScopes':[key['exam']],'subjectId':'din','subject':'Din Kültürü ve Ahlak Bilgisi',
                'containsGraphics':True,'optionCounts':dict(labels),'reviewConcerns':concerns,'topicAssignment':'NOT_YET_VERIFIED',
                'sourceTopicRibbons':[c for c in captions if c['followingPrintedNumber']==n],
                'importDecision':'NOT_ACCEPTED_FOR_IMPORT','teacherApproved':False})
        own=[p for p in used if p['pdfPage']==number]
        missing=uncovered_body_lines(page,own) if own else lines
        coverage.append({'page':number,'uncoveredBodyLines':missing})
        if missing:issues.append({'page':number,'reason':'NATIVE_BODY_LINES_OUTSIDE_PREPARED_SOURCE_REGIONS','lines':missing})
    swapped=sha==TYT_BOOK and key['sectionName']=='1' and actual==[*range(1,25),26,25]
    count_mismatch=((sha==AYT_BOOK and key['sectionName']=='5' and actual==list(range(1,26)) and len(answers)==27) or
        (sha==TYT_BOOK and key['sectionName']=='10' and actual==list(range(1,33)) and len(answers)==34))
    unbound=sorted(set(answers)-set(actual))
    if count_mismatch:
        issues.append({'reason':'CURRENT_SOURCE_BODY_KEY_COUNT_MISMATCH_ENTIRE_SECTION_ANSWER_BINDING_BLOCKED',
            'actualBodyNumbers':actual,'printedKeyNumbers':list(answers),'unboundPrintedAnswerNumbers':unbound,
            'conclusionScope':'THIS_CURRENT_BOOK_SECTION_ONLY_POSSIBLE_SOURCE_VERSION_MISMATCH_NO_ASSUMED_MISSING_QUESTIONS'})
        for card in cards:
            card['unverifiedPrintedKeyAnswerCandidate']=card['answer'];card['answer']=None
            card['sourceAnswerBindingStatus']='UNVERIFIED_ENTIRE_SECTION_SOURCE_BODY_KEY_COUNT_MISMATCH'
            card['answerOrigin']='UNBOUND_PRINTED_KEY_CANDIDATE'
    elif actual!=list(answers) and not swapped:
        issues.append({'reason':'MISSING_DUPLICATE_OR_REORDERED_BOOK_SECTION_NUMBERS','actual':actual,'expected':list(answers)})
    package=out/'candidates.json';write_json(package,{'status':'PREPARED_CONTENT_REVIEW_REQUIRED','sourceSha256':sha,'sourcePath':key['sourcePath'],
        'sectionId':key['sectionId'],'sourceKeyEvidenceSha256':key['evidenceSha256'],'sourceHeaderObservations':heads,'cards':cards,
        'questionBankWrites':0,'teacherApproved':False})
    return {'sourceSha256':sha,'sectionId':key['sectionId'],'sectionName':key['sectionName'],
        'status':'EXCLUDED_CURRENT_SOURCE_BODY_KEY_COUNT_MISMATCH' if count_mismatch else 'PREPARED' if not issues else 'BOOK_SECTION_BODY_LAYOUT_REVIEW_REQUIRED','questions':len(cards),
        'expectedQuestions':len(answers),'package':str(package),'packageSha256':digest(package),'issues':issues,'bodyCoverage':coverage,
        'uncoveredNativeBodyLines':sum(len(p['uncoveredBodyLines']) for p in coverage),'sequenceMatchesPrintedKey':actual==list(answers),
        'explicitlyReadSwappedFinalNumberPositions':swapped,'originalPhysicalQuestionOrder':actual,
        'unboundPrintedAnswerNumbers':unbound,'allPresentQuestionAnswersBound':not issues,
        'sourcePixelsPreserved':True,'contentAndFineTopicAccepted':False,'questionBankWrites':0,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);source=root/'new-book-keys/din/progress.json';keys=read_json(source)
    if keys['status']!='COMPLETE' or keys['completedSections']!=22:raise ValueError('All 22 independent printed book key observations required')
    folder=root/'new-book-bodies/din';folder.mkdir(parents=True,exist_ok=True);results=[];hits=0;unbound=[]
    def save(status):
        write_json(folder/'progress.json',{'status':status,'scope':'TWO_DIN_BOOKS_PRINTED_SECTION_BODY_AND_KEY_BINDING_ONLY','expectedSections':22,'completedSections':len(results),
            'states':dict(Counter(r['status'] for r in results)),'questionsPrepared':sum(r.get('questions',0) for r in results),
            'technicallyPreparedQuestions':sum(r.get('questions',0) for r in results if r['status']=='PREPARED'),'cachedSectionsThisPass':hits,
            'unboundQuestionSignalPages':unbound,'sourceKeyReportSha256':digest(source),'newModelCalls':0,'newOcrCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results})
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            for sha,(exam,key_pages) in BOOKS.items():
                selected=[r for r in keys['results'] if r['sourceSha256']==sha];path=Path(selected[0]['sourcePath'])
                if digest(path)!=sha:raise ValueError('Din body source changed')
                with pymupdf.open(path) as document:
                    pages,other=source_pages(document,exam,min(key_pages));unbound+=[{'sourceSha256':sha,'physicalPage':p} for p in other]
                    for key in selected:
                        if key['status']!='PRINTED_SECTION_KEY_READINGS_VERIFIED_BODY_BINDING_REQUIRED':
                            results.append({'sourceSha256':sha,'sectionId':key['sectionId'],'status':'EXCLUDED_INDEPENDENT_KEY_READING_NOT_VERIFIED'});continue
                        validate_section(key);out=folder/(sha[:16]+'-'+key['sectionName']);out.mkdir(exist_ok=True);cache=out/'technical-integrity.json'
                        readings=VIEWED.get((sha,key['sectionName']),{})
                        for name,expected in readings.items():
                            if digest(folder/'layout-review'/name)!=expected:raise ValueError('Actually read source layout image changed')
                        identity={'sourceSha256':sha,'keyEvidenceSha256':key['evidenceSha256'],'pages':pages[key['sectionName']],
                            'files':{n:digest(APP/'scripts'/n) for n in ['yks_din_kitap_govde.py','yks_deneme_govde.py','yks_kirpim_istisna.py','yks_istisna_kirpim.py']},'rendererVersion':pymupdf.VersionBind,
                            'actuallyViewedLayoutImages':readings}
                        old=read_json(cache) if cache.is_file() else {}
                        if old.get('identity')==identity:
                            result=old['result']
                            if digest(result['package'])!=result['packageSha256']:raise ValueError('Saved Din section source package changed')
                            for c in read_json(result['package'])['cards']:
                                if digest(c['image'])!=c['imageSha256'] or digest(c['pixelProof']['path'])!=c['pixelProof']['sha256']:raise ValueError('Saved Din crop/pixel proof changed')
                            hits+=1
                        else:result=prepare_section(document,key,pages[key['sectionName']],out);write_json(cache,{'identity':identity,'result':result})
                        results.append(result);save('RUNNING');print(exam,key['sectionName'],result['status'],result['questions'],flush=True)
                if digest(path)!=sha:raise ValueError('Din source changed during body proof')
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
