"""Resume section-bound mock body/crop preparation; never publish questions.

Every page must print its section in a header/footer. Repeated numbers are
scoped by that section, and unsupported continuations/shared contexts stay
explicit review cases. Printed answers are reused, never solved or inferred.
"""
import argparse
from collections import Counter
from concurrent.futures import ProcessPoolExecutor,as_completed
import hashlib
from pathlib import Path
import re
import unicodedata

import pymupdf
from PIL import Image
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_pilot_sorular import boundaries,OPTION
from yks_pilot_kirpim_kontrol import uncovered_body_lines
from yks_istisna_kirpim import original_image,verify_image
from yks_tam_deneme_anahtar import validate_saved,mock_identity
from yks_deneme_anahtar_pilotu import partition_key
from pdf_source_reconcile import text_fingerprint

VERSION='printed-section-mock-question-bodies-v1'
FLAGS=pymupdf.TEXTFLAGS_TEXT|pymupdf.TEXT_IGNORE_ACTUALTEXT
SHARED=re.compile(r'(\d{1,2})\s*(?:[-–—]|ve)\s*(\d{1,2})\s*[.]?\s*sorular[ıi]',re.I)
FORMULA_EXTENTS={
    ('4a305bc50abeff5440d46be68d633d572985c89756bb9c5e65501fe3a35db160',48,26):('CH3',383.03753662109375),
    ('dbb6f180a581e36d9a1b2a465f399eb76a3cb6cb762bf56e13f0a850a8273e2f',51,27):('O',413.3138427734375),
}


def glyph_lines(page):
    return [{'text':''.join(s['text'] for s in line['spans']).strip(),'bbox':list(line['bbox'])}
        for b in page.get_text('dict',flags=FLAGS)['blocks'] for line in b.get('lines',[])
        if ''.join(s['text'] for s in line['spans']).strip()]


def section_number(text,exam):
    value=re.sub(r'[\s•:—–-]+',' ',plain(text))
    value=value.replace('SOSYAL BILIMLER TESTI 2','SOSYAL BILIMLER 2 TESTI')
    if exam=='TYT':
        rules=[(1,'TURKCE'),(2,'SOSYAL BILIMLER'),(3,'TEMEL MATEMATIK'),(4,'FEN BILIMLERI')]
    else:rules=[(1,'TURK DILI VE EDEBIYATI'),(2,'SOSYAL BILIMLER 2'),(3,'MATEMATIK'),(4,'FEN BILIMLERI')]
    matches={n for n,marker in rules if marker in value and re.search(r'\bTESTI\b',value)}
    return next(iter(matches)) if len(matches)==1 else None


def page_section(page,lines,exam):
    candidates={section_number(l['text'],exam) for l in lines
        if l['bbox'][1]<page.rect.height*.1 or l['bbox'][1]>page.rect.height*.92}
    candidates.discard(None)
    if len(candidates)>1:raise ValueError('Page has conflicting printed section headings')
    return next(iter(candidates),None)


def contexts(page,lines,regions,allow_cross_page=False):
    result=[]
    for line in lines:
        if not (m:=SHARED.search(line['text'])):continue
        following=' '.join(l['text'] for l in lines if line['bbox'][1]<=l['bbox'][1]<line['bbox'][1]+70
            and (l['bbox'][0]>=page.rect.width/2)==(line['bbox'][0]>=page.rect.width/2))
        normalized=plain(following)
        # A printed alternative-religion instruction describes exam scope; it
        # is not a shared paragraph to crop into every subsequent question.
        if 'DERSINI' in normalized and ('ZORUNDA' in normalized or 'FARKLI MUFREDAT' in normalized):continue
        first,last=map(int,m.groups())
        if not 1<=first<last<=46:raise ValueError('Invalid printed shared range')
        relevant=[r for r in regions if first<=r['number']<=last]
        present={r['number'] for r in relevant}
        if present!=set(range(first,last+1)) and not (allow_cross_page and first in present and present==set(range(first,max(present)+1))):
            raise ValueError('Shared context spans pages or an unrecognized question')
        start=next(r for r in relevant if r['number']==first)
        col=int(line['bbox'][0]>=page.rect.width/2)
        if start['column']!=col or line['bbox'][1]>=start['bboxPt'][1]:
            raise ValueError('Shared paragraph geometry needs explicit source review')
        box=[start['bboxPt'][0],line['bbox'][1]-4,start['bboxPt'][2],start['anchor']['contentTopPt']-.25]
        if any(l['bbox'][0]<box[0]-.2 or l['bbox'][2]>box[2]+.2 for l in lines
            if box[1]<=l['bbox'][1]<box[3] and (l['bbox'][0]>=page.rect.width/2)==bool(col)):
            raise ValueError('Shared context extends across the supported column boundary')
        result.append({'pdfPage':page.number+1,'bboxPt':box,'dependentPrintedNumbers':list(range(first,last+1)),
            'role':'PRINTED_SHARED_PARAGRAPH_CONTEXT'})
    return result


def inspect(row,folder):
    sha=row['sourceSha256'];source=Path(row['sourcePath']);cards=[];page_proofs=[];issues=[];observed={s['sectionId']:[] for s in row['sections']};active_contexts={};active_instructions={}
    model_digest=next((read_json(s['evidencePath'])['identity']['modelDigest'] for s in row['sections']
        if s['readingMethod']=='NATIVE_PLUS_INDEPENDENT_QWEN_SECTION_IMAGE'),None)
    validate_saved(row,{'digest':model_digest})
    answers={s['sectionId']:{a['number']:a['answer'] for a in s['answers']} for s in row['sections']}
    section_by_id={s['sectionId']:s for s in row['sections']}
    if digest(source)!=sha:raise ValueError('Mock source changed')
    with pymupdf.open(source) as doc:
        if mock_identity(doc,row['exam'])!=row['printedMockNumber']:raise ValueError('Actual printed mock identity differs')
        actual_keys=partition_key(doc[-1],row['exam'])
        if any(a['answers']!=b['answers'] or a['sectionId']!=b['sectionId'] for a,b in zip(actual_keys,row['sections'])):
            raise ValueError('Fresh native section keys differ from independent key proof')
        for page in list(doc)[:-1]:
            lines=glyph_lines(page);section=page_section(page,lines,row['exam'])
            blank_reading=row.get('explicitBlankPageReadings',{}).get(str(page.number+1))
            if blank_reading:
                if digest(blank_reading['imagePath'])!=blank_reading['imageSha256'] or any(page.rect.height*.1<l['bbox'][1]<page.rect.height*.9 for l in lines):
                    raise ValueError('Actually viewed blank-body section page differs')
                page_proofs.append({'page':page.number+1,'sectionId':row['exam']+':'+str(section),
                    'status':'ACTUALLY_VIEWED_BLANK_SECTION_BODY_WITH_HEADERS_AND_COLUMN_RULE_ONLY','sourceReading':blank_reading})
                continue
            scope_method='CURRENT_PRINTED_PAGE_SECTION_HEADER_OR_FOOTER'
            reading=row.get('explicitPageScopeReadings',{}).get(str(page.number+1))
            if section is None and reading:
                if digest(reading['imagePath'])!=reading['imageSha256']:raise ValueError('Actually viewed sectionless page image changed')
                previous=doc[page.number-1];following=doc[page.number+1]
                neighbors=[page_section(p,glyph_lines(p),row['exam']) for p in [previous,following]]
                if neighbors!=[reading['section'],reading['section']]:raise ValueError('Neighboring printed section evidence differs')
                section=reading['section'];scope_method='ACTUALLY_VIEWED_CONTENT_AND_BOTH_NEIGHBORING_PRINTED_SECTION_HEADINGS'
            if section is None:
                # Covers/instructions still get explicit source observations.
                suspects=[l for l in lines if re.match(r'^\d{1,2}\s*[.]',l['text']) and page.rect.height*.12<l['bbox'][1]<page.rect.height*.9]
                if len(set(OPTION.findall('\n'.join(l['text'] for l in lines))))>=4 or suspects:
                    issues.append({'page':page.number+1,'reason':'PRINTED_QUESTION_PAGE_SECTION_NOT_BOUND'})
                page_proofs.append({'page':page.number+1,'sectionId':None,'status':'COVER_OR_INSTRUCTION_OBSERVATION_ONLY','possibleAnchors':suspects})
                continue
            section_id=row['exam']+':'+str(section)
            instruction_bottom=max((l['bbox'][3]+2 for l in lines if l['bbox'][1]<page.rect.height*.25
                and 'CEVAPLARINIZI' in plain(l['text']) and 'ISARETLEYINIZ' in plain(l['text'])),default=0)
            body_lines=[l for l in lines if l['bbox'][1]>=instruction_bottom]
            regions,_=boundaries(body_lines,page.rect.width,page.rect.height)
            for (reviewed_sha,reviewed_page,number),(label,top) in FORMULA_EXTENTS.items():
                if sha!=reviewed_sha or page.number+1!=reviewed_page:continue
                target=next(r for r in regions if r['number']==number);previous=next(r for r in regions if r['number']==number-1)
                glyph=[l for l in lines if l['text']==label and abs(l['bbox'][1]-top)<.01]
                if len(glyph)!=1 or target['column']!=previous['column']:raise ValueError('Explicitly read formula extent differs')
                new_top=glyph[0]['bbox'][1]-4;target['bboxPt'][1]=new_top;previous['bboxPt'][3]=new_top-.1
            expected=answers[section_id];numbered=[r for r in regions if r['number'] in expected]
            if reading and [r['number'] for r in numbered]!=reading['printedNumbers']:raise ValueError('Actually viewed sectionless page question numbers differ')
            try:shared=contexts(page,lines,numbered,allow_cross_page=True)
            except ValueError as exc:shared=[];issues.append({'page':page.number+1,'reason':str(exc)})
            for context in shared:
                for number in context['dependentPrintedNumbers']:
                    key=(section_id,number)
                    if key in active_contexts:raise ValueError('Ambiguous overlapping printed shared contexts')
                    active_contexts[key]=context
            continuations={};left=[r for r in numbered if r['column']==0];right=[r for r in numbered if r['column']==1]
            if left and right:
                last_left=max(left,key=lambda r:r['number']);first_right=min(right,key=lambda r:r['number'])
                prefix=[l for l in body_lines if l['bbox'][0]>page.rect.width/2 and page.rect.height*.07<l['bbox'][1]<first_right['bboxPt'][1]
                    and not any(pymupdf.Rect(c['bboxPt']).intersects(pymupdf.Rect(l['bbox'])) for c in shared)]
                if prefix and first_right['number']==last_left['number']+1:
                    top=min(l['bbox'][1] for l in body_lines if l['bbox'][1]>page.rect.height*.07)-4
                    continuations[last_left['number']]={'pdfPage':page.number+1,
                        'bboxPt':[page.rect.width/2-1,top,page.rect.width-14,first_right['bboxPt'][1]-.1],
                        'role':'ORIGINAL_LAST_LEFT_QUESTION_CONTINUES_AT_TOP_OF_RIGHT_COLUMN'}
            used=[];page_cards=[];instructions=[]
            # Retain an actual alternative-test notice separately when it is
            # wholly above the first question in its column. Never discard it.
            for line in lines:
                if not SHARED.search(line['text']):continue
                col=int(line['bbox'][0]>=page.rect.width/2);column=[r for r in numbered if r['column']==col]
                if not column:continue
                first_number=int(SHARED.search(line['text'])[1]);target=next((r for r in column if r['number']==first_number),None)
                if target is None:continue
                first=target['anchor']['contentTopPt']-.25
                prefix=[l for l in lines if line['bbox'][1]<=l['bbox'][1]<first and (l['bbox'][0]>=page.rect.width/2)==bool(col)]
                text=' '.join(l['text'] for l in prefix)
                if 'DERSINI' in plain(text) and ('ZORUNDA' in plain(text) or 'FARKLI MUFREDAT' in plain(text)):
                    box=[target['bboxPt'][0],min(l['bbox'][1] for l in prefix)-4,target['bboxPt'][2],first]
                    note={'pdfPage':page.number+1,'bboxPt':box,'text':text,'role':'PRINTED_ALTERNATIVE_TEST_SCOPE_INSTRUCTION'}
                    instructions.append(note);used.append(note)
                    m=SHARED.search(line['text'])
                    for number in range(int(m[1]),int(m[2])+1):active_instructions[(section_id,number)]=note
                    previous=next((r for r in column if r['number']==first_number-1),None)
                    if previous is not None:previous['bboxPt'][3]=box[1]-.1
                    target['bboxPt'][1]=first
            for region in numbered:
                number=region['number'];observed[section_id].append(number)
                context=active_contexts.get((section_id,number))
                parts=[{k:context[k] for k in ['pdfPage','bboxPt','role']}] if context else []
                scope_note=active_instructions.get((section_id,number))
                if scope_note:parts.insert(0,{k:scope_note[k] for k in ['pdfPage','bboxPt','role']})
                parts.append({'pdfPage':page.number+1,'bboxPt':region['bboxPt'],'role':'ORIGINAL_QUESTION_BODY'})
                if number in continuations:parts.append(continuations[number])
                used+=parts;code='mebi-mock-'+sha[:12]+'-s'+str(section)+'-q'+str(number)
                text='\n\n'.join(doc[p['pdfPage']-1].get_text(clip=pymupdf.Rect(p['bboxPt']),flags=FLAGS).strip() for p in parts)
                own_parts=[p for p in parts if p['role'] not in ['PRINTED_SHARED_PARAGRAPH_CONTEXT','PRINTED_ALTERNATIVE_TEST_SCOPE_INSTRUCTION']]
                labels=Counter(OPTION.findall('\n'.join(doc[p['pdfPage']-1].get_text(clip=pymupdf.Rect(p['bboxPt']),flags=FLAGS) for p in own_parts)))
                concerns=[]
                if labels!=Counter('ABCDE'):concerns.append('INCOMPLETE_EMBEDDED_OR_CONTINUED_OPTIONS_REVIEW_REQUIRED')
                if '\ufffd' in text or any(unicodedata.category(c)=='Co' for c in text):concerns.append('NATIVE_GLYPH_REQUIRES_VISUAL_READING')
                # Preserve all original pixels even when content acceptance remains
                # blocked. No cropped candidate is silently treated as accepted.
                image=folder/(code+'.webp');stamp=folder/(code+'.crop.json')
                identity=signature([VERSION,sha,section_id,number,parts,pymupdf.VersionBind,180,FLAGS])
                old=read_json(stamp) if stamp.is_file() else {}
                if not image.is_file() or old.get('identity')!=identity or old.get('imageSha256')!=digest(image):
                    pixels,_=original_image(doc,parts);pixels.save(image,format='WEBP',lossless=True,method=0)
                    proof=verify_image(doc,parts,image);write_json(stamp,{'identity':identity,'imageSha256':digest(image),'pixelProof':proof})
                proof={'path':str(stamp),'sha256':digest(stamp)}
                card={'code':code,'sourceSha256':sha,'sourcePath':str(source),'printedMockNumber':row['printedMockNumber'],
                    'sectionId':section_id,'printedSectionTitle':section_by_id[section_id]['printedSectionTitle'],
                    'printedNumber':number,'pdfPage':page.number+1,'bboxPt':region['bboxPt'],'sourceRegions':parts,
                    'image':str(image),'imageSha256':digest(image),'pixelProof':proof,'text':text,
                    'textSha256':hashlib.sha256(text.encode()).hexdigest(),'textFingerprint':text_fingerprint(text),
                    'answer':expected[number],'sourceKeyPage':row['sourceKeyPage'],
                    'keyEvidenceSha256':section_by_id[section_id]['keyEvidenceSha256'],'sourceKeyDocumentSha256':sha,
                    'sourceKeyPath':str(source),'answerOrigin':'EXPLICIT_PRINTED_SOURCE_SECTION_KEY','exam':row['exam'],
                    'printedExamScopes':[row['exam']],'optionCounts':dict(labels),'containsGraphics':True,
                    'reviewConcerns':concerns,'topicAssignment':'NOT_YET_VERIFIED','subjectAssignment':'PRINTED_SECTION_ONLY_BRANCH_REVIEW_REQUIRED',
                    'importDecision':'NOT_ACCEPTED_FOR_IMPORT','teacherApproved':False}
                cards.append(card);page_cards.append(card)
            page_regions=[p for p in used if p['pdfPage']==page.number+1]
            missing=uncovered_body_lines(page,page_regions) if page_regions else lines
            if missing:issues.append({'page':page.number+1,'reason':'NATIVE_BODY_LINES_OUTSIDE_QUESTION_OR_CONTEXT_REGIONS','lines':missing})
            page_proofs.append({'page':page.number+1,'sectionId':section_id,'printedNumbers':[r['number'] for r in numbered],
                'sharedContexts':shared,'scopeInstructions':instructions,'uncoveredBodyLines':missing,
                'sectionBindingMethod':scope_method,'explicitSectionReading':reading,
                'questionConcerns':sum(bool(c['reviewConcerns']) for c in page_cards)})
        sequences=[]
        for section_id,actual in observed.items():
            wanted=list(answers[section_id]);match=actual==wanted
            if not match:issues.append({'sectionId':section_id,'reason':'MISSING_DUPLICATE_OR_REORDERED_QUESTION_NUMBERS','actual':actual,'expected':wanted})
            sequences.append({'sectionId':section_id,'actual':actual,'expected':wanted,'matches':match})
        administrative=[]
        if all(s['matches'] for s in sequences):
            administrative=[i for i in issues if i.get('page') in [1,2] and i['reason']=='PRINTED_QUESTION_PAGE_SECTION_NOT_BOUND']
            issues=[i for i in issues if i not in administrative]
    if digest(source)!=sha:raise ValueError('Mock source changed during crop preparation')
    path=folder/'candidates.json';write_json(path,{'status':'PREPARED_WITH_CONTENT_REVIEW_REQUIRED','sourceSha256':sha,
        'sourcePath':str(source),'version':VERSION,'cards':cards,'questionBankWrites':0,'teacherApproved':False})
    return {'sourceSha256':sha,'status':'SECTION_BODY_SEQUENCE_AND_PIXELS_PREPARED' if not issues else 'MOCK_BODY_LAYOUT_REVIEW_REQUIRED',
        'questionsPrepared':len(cards),'expectedQuestions':sum(len(a) for a in answers.values()),'issues':issues,'sequenceChecks':sequences,
        'package':str(path),'packageSha256':digest(path),'pageObservations':page_proofs,
        'administrativePageObservations':administrative,'administrativePagesContentAccepted':False,
        'questionsWithContentConcerns':sum(bool(c['reviewConcerns']) for c in cards),'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False}


def prepare_document(row,out,identity):
    out=Path(out);out.mkdir(exist_ok=True);cache=out/'body-evidence.json'
    with process_lock(out/'.writer.lock'):
        old=read_json(cache) if cache.is_file() else {}
        if old.get('identity')==identity:
            if digest(row['sourcePath'])!=row['sourceSha256']:raise ValueError('Saved mock body source changed')
            result=old['result']
            if digest(result['package'])!=result['packageSha256']:raise ValueError('Saved mock package changed')
            for c in read_json(result['package'])['cards']:
                if digest(c['image'])!=c['imageSha256'] or digest(c['pixelProof']['path'])!=c['pixelProof']['sha256']:raise ValueError('Saved mock crop/pixels changed')
            return result,True
        result=inspect(row,out);write_json(cache,{'identity':identity,'result':result})
        return result,False


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--limit',type=int)
    parser.add_argument('--workers',type=int,default=3);args=parser.parse_args()
    if not 1<=args.workers<=4:parser.error('Use 1 to 4 bounded local PDF processes')
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);keys=root/'pdf-on-tarama/full-mock-keys/progress.json'
    rows=read_json(keys)['results'];decode=read_json(root/'pdf-on-tarama/mock-tag-review/report.json')
    damaged={r['sourceSha256'] for r in decode['results'] if r['status']=='DAMAGED_OR_NON_TAG_STREAM_REVIEW_REQUIRED'}
    folder=root/'full-mock-bodies';folder.mkdir(exist_ok=True);results=[];hits=0;created=0
    def save(status):
        report={'status':status,'scope':'ALL_SIDEBAR_MOCK_SECTION_BODY_PREPARATION_ONLY','documents':len(rows),'completed':len(results),
            'pending':len(rows)-len(results),'states':dict(Counter(r['status'] for r in results)),
            'questionsPrepared':sum(r.get('questionsPrepared',0) for r in results),
            'cachedDocumentsThisPass':hits,'newDocumentsThisPass':created,'newOcrCalls':0,'newModelCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':sorted(results,key=lambda r:r['sourceSha256'])}
        write_json(folder/'progress.json',report)
    with process_lock(folder/'.writer.lock'):
        try:
            save('RUNNING')
            jobs=[]
            for row in rows:
                sha=row['sourceSha256']
                if row['status']!='SOURCE_MOCK_KEY_VERIFIED' or sha in damaged:
                    results.append({'sourceSha256':sha,'status':'EXCLUDED_UNRESOLVED_PRINTED_KEY_OR_DAMAGED_SOURCE',
                        'reason':row['status'] if sha not in damaged else 'DAMAGED_SOURCE_STREAM','questionsPrepared':0});continue
                if sha=='46c0ccd1904248f7e8201485c422a36a86fc7f62ddf1fdeea71187e72237074b':
                    row={**row,'explicitPageScopeReadings':{'39':{'section':3,'printedNumbers':[35,36,37],
                        'imagePath':str(root/'pdf-on-tarama/mock-tag-review/46c0ccd19042-page39.png'),
                        'imageSha256':'2c722f87ca56f4888ce53cc8ae7c4ad1e1b992b365ef863499d9ce73918d19c0',
                        'reading':'Three geometry questions; no printed section footer. Both adjacent pages print the same Mathematics section.',
                        'teacherApproved':False}}}
                if sha=='365ab97405f343d7b7b6f1b9174f535f24ebd19e079db150701ae178df2c226a':
                    row={**row,'explicitBlankPageReadings':{'44':{
                        'imagePath':str(root/'pdf-on-tarama/mock-layout-review/365ab97405f3-page44.png'),
                        'imageSha256':'d63ab07d73762d653f4700e389237be465660436cc0bab0171b42077b60395d6',
                        'reading':'Whole page viewed: blank question body, publication header, footer and column divider only.',
                        'teacherApproved':False}}}
                out=folder/sha[:16]
                identity={'sourceSha256':sha,'keyEvidence':[[s['sectionId'],s['keyEvidenceSha256']] for s in row['sections']],
                    'toolSha256':digest(Path(__file__)),'boundaryToolSha256':digest(APP/'scripts/yks_pilot_sorular.py'),
                    'pixelToolSha256':digest(APP/'scripts/yks_istisna_kirpim.py'),'rendererVersion':pymupdf.VersionBind,'version':VERSION}
                if args.limit is not None and len(jobs)>=args.limit:break
                jobs.append((row,str(out),identity))
            with ProcessPoolExecutor(max_workers=args.workers) as pool:
                pending={pool.submit(prepare_document,*job):job[0]['sourceSha256'] for job in jobs}
                for future in as_completed(pending):
                    result,reused=future.result();hits+=int(reused);created+=int(not reused)
                    results.append(result);save('RUNNING');print('Mock body',len(results),'/',len(rows),pending[future][:12],result['status'],result.get('questionsPrepared',0),flush=True)
            save('COMPLETE' if len(results)==len(rows) else 'PARTIAL')
        except BaseException:save('INTERRUPTED');raise
    print({k:v for k,v in read_json(folder/'progress.json').items() if k!='results'})


if __name__=='__main__':main()
