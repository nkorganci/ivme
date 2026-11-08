"""Bind mock disciplines to actual printed ranges, then classify repeat candidates.

Combined Mathematics/Geometry and Philosophy Group scopes remain ambiguous;
an existing bank label never becomes independent source discipline evidence.
"""
from collections import Counter
import json
from pathlib import Path
import re

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_deneme_govde import glyph_lines
from yks_soru_pilotu import live_bank
from yks_pilot_tekrar_incele import classify_exact
from yks_stages.database import Snapshot,connection

SUBJECTS={'TURK DILI VE EDEBIYATI':['edebiyat'],'TARIH':['tarih'],'COGRAFYA':['cografya'],
    'DIN KULTURU VE AHLAK BILGISI':['din'],'FELSEFE':['felsefe'],
    'FELSEFE GRUBU':['felsefe','psikoloji','sosyoloji','mantik'],
    'FIZIK':['fizik'],'KIMYA':['kimya'],'BIYOLOJI':['biyoloji']}
RANGE=re.compile(r'('+ '|'.join(sorted(SUBJECTS,key=len,reverse=True)) +r')\s*(?:[-–]?\s*[12])?\s*\(\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*\)')


def printed_ranges(text,expected_count):
    normalized=re.sub(r'\s+',' ',plain(text));result=[];members={}
    for match in RANGE.finditer(normalized):
        name,first,last=match[1],int(match[2]),int(match[3])
        if not 1<=first<=last<=expected_count:raise ValueError('Printed discipline range lies outside section')
        value={'printedDiscipline':name,'first':first,'last':last,'allowedSubjectIds':SUBJECTS[name]}
        for n in range(first,last+1):
            if n in members:raise ValueError('Printed discipline ranges overlap or duplicate')
            members[n]=value
        result.append(value)
    if set(members)!=set(range(1,expected_count+1)):raise ValueError('Complete printed discipline ranges required; no fixed exam fallback')
    return result,members


def section_proof(doc,row,section,first_page):
    page=doc[first_page-1];lines=glyph_lines(page)
    header='\n'.join(l['text'] for l in lines if l['bbox'][1]<page.rect.height*.25)
    section_id=section['sectionId'];number=int(section_id.split(':')[1]);count=len(section['answers'])
    if number==3: # Printed mathematics section also contains geometry.
        ranges=[{'printedDiscipline':'PRINTED_MATHEMATICS_SECTION','first':1,'last':count,'allowedSubjectIds':['matematik','geometri']}]
        members={n:ranges[0] for n in range(1,count+1)}
    elif row['exam']=='TYT' and number==1:
        ranges=[{'printedDiscipline':'PRINTED_TURKISH_SECTION','first':1,'last':count,'allowedSubjectIds':['turkce']}]
        members={n:ranges[0] for n in range(1,count+1)}
    else:ranges,members=printed_ranges(header,count)
    return {'sourceSha256':row['sourceSha256'],'sourcePath':row['sourcePath'],'sectionId':section_id,
        'printedSectionTitle':section['printedSectionTitle'],'physicalInstructionPage':first_page,
        'instructionBboxPt':[0,0,page.rect.width,page.rect.height*.25],'actualInstructionText':header,
        'actualInstructionTextSha256':__import__('hashlib').sha256(header.encode()).hexdigest(),
        'ranges':ranges,'members':members,'method':'ACTUAL_PRINTED_DISCIPLINE_RANGES_OR_EXPLICIT_SINGLE_SECTION_NAME',
        'fineTopicAccepted':False,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-mock-comparison'
    source=root/'full-mock-bodies/progress.json';bodies=read_json(source)
    proof=read_json(folder/'comparison-report.json');comparison=read_json(folder/'bank-comparison.json')
    if proof['bankComparisonSha256']!=digest(folder/'bank-comparison.json'):raise ValueError('Mock full-bank comparison changed')
    from yks_tam_tekrar_tara import crop_scope
    if proof['sourceCropScopeSignature']!=crop_scope(bodies):raise ValueError('Mock body scope changed after bank comparison')
    bank,_=live_bank(APP)
    if signature(bank)!=comparison['bankSnapshotSha256']:raise ValueError('Current bank changed since mock comparison')
    by_code={r['code']:r for r in bank};cards={};section_proofs=[];card_scopes={};scope_issues=[]
    keys={r['sourceSha256']:r for r in read_json(root/'pdf-on-tarama/full-mock-keys/progress.json')['results']}
    with process_lock(folder/'.scope-writer.lock'):
        for row in bodies['results']:
            if row['status']!='SECTION_BODY_SEQUENCE_AND_PIXELS_PREPARED':continue
            sha=row['sourceSha256'];key=keys[sha]
            if digest(key['sourcePath'])!=sha or digest(row['package'])!=row['packageSha256']:raise ValueError('Mock source or package changed')
            package=read_json(row['package']);cards.update({c['code']:c for c in package['cards']})
            with pymupdf.open(key['sourcePath']) as doc:
                for section in key['sections']:
                    first=next(p['page'] for p in row['pageObservations'] if p.get('sectionId')==section['sectionId'])
                    try:
                        value=section_proof(doc,key,section,first);index=len(section_proofs);section_proofs.append(value)
                        for c in package['cards']:
                            if c['sectionId']==section['sectionId']:
                                card_scopes[c['code']]={'sourceSha256':sha,'sourceCode':c['code'],'sectionId':c['sectionId'],
                                    'printedNumber':c['printedNumber'],'printedRange':value['members'][c['printedNumber']],
                                    'sectionProofIndex':index,'fineTopicAccepted':False,'teacherApproved':False}
                    except ValueError as exc:
                        page=doc[first-1];header='\n'.join(l['text'] for l in glyph_lines(page) if l['bbox'][1]<page.rect.height*.25)
                        scope_issues.append({'sourceSha256':sha,'sectionId':section['sectionId'],'issue':str(exc),
                            'physicalInstructionPage':first,'actualPrintedInstructionText':header,
                            'expectedPrintedKeyQuestions':len(section['answers']),'sourcePath':key['sourcePath']})
        if set(cards)!={r['sourceCode'] for r in comparison['candidates']}:raise ValueError('Mock source and full comparison membership differs')
        needed={m['code'] for c in comparison['candidates'] for m in c['textMatches']}
        escaped=','.join("'"+code.replace("'","''")+"'" for code in sorted(needed));cmd,env=connection(APP)
        with Snapshot(cmd,env) as snapshot:
            catalog_run=snapshot.execute('SELECT run_key FROM learning_catalog.current_run;')
            controlled=json.loads(snapshot.execute("SELECT coalesce(json_agg(s),'[]') FROM (SELECT question_code,source_stamp,subject_ids,exam_ids,category_ids FROM learning_catalog.current_items WHERE kind='QUESTION' AND question_code IN ("+escaped+")) s;"))
        controlled={r['question_code']:r for r in controlled};inventory=APP/'veri/content-labels/source-inventory.json'
        original={r['code']:r for r in read_json(inventory)['questions']};results=[]
        for candidate in comparison['candidates']:
            card=cards[candidate['sourceCode']];scope=card_scopes.get(card['code']);matches=[]
            if digest(card['image'])!=card['imageSha256']:raise ValueError('Original source mock image changed')
            if scope:
                allowed=scope['printedRange']['allowedSubjectIds']
                for match in candidate['textMatches']:
                    code=match['code'];current=controlled.get(code);subjects=current.get('subject_ids',[]) if current else []
                    if len(allowed)==1:subject=allowed[0]
                    elif len(subjects)==1 and subjects[0] in allowed:subject=subjects[0]
                    else:continue
                    actual=classify_exact({**card,'subjectId':subject},by_code[code],original.get(code,{}),current)
                    if actual:
                        if len(allowed)>1:
                            actual['sourceSubjectIndependentlyAssigned']=False
                            actual['allowedPrintedSectionSubjectIds']=allowed
                            if actual['status']=='EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE':
                                actual['status']='EXACT_TEXT_AND_ANSWER_WITHIN_COMBINED_SECTION_REQUIRES_SUBJECT_CONTENT_REVIEW'
                        else:actual['sourceSubjectIndependentlyAssigned']=True
                        matches.append(actual)
            states={m['status'] for m in matches}
            if not scope:status='PRINTED_DISCIPLINE_RANGE_REVIEW_REQUIRED'
            elif states=={'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE'}:status='EXISTING_SOURCE_MATCH_CANDIDATE'
            elif states and states<= {'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE','EXACT_TEXT_AND_ANSWER_WITHIN_COMBINED_SECTION_REQUIRES_SUBJECT_CONTENT_REVIEW'}:
                status='EXACT_TEXT_WITHIN_COMBINED_SECTION_SUBJECT_REVIEW_REQUIRED'
            elif matches:status='SOURCE_OR_CONTROLLED_SCOPE_CONFLICT_REVIEW'
            else:status='CONTENT_OR_IMAGE_REVIEW_REQUIRED'
            results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'sectionId':card['sectionId'],
                'status':status,'printedDisciplineScope':scope,'exactTextCandidates':matches,
                'topTextCandidates':candidate['textMatches'][:3],'topVisualCandidates':candidate['visualMatches'][:3],
                'importAccepted':False,'teacherApproved':False})
        after,_=live_bank(APP)
        if signature(after)!=comparison['bankSnapshotSha256']:raise ValueError('Bank changed during mock discipline/repeat analysis')
        scope_path=folder/'printed-section-scopes.json';write_json(scope_path,{'status':'COMPLETE_WITH_EXPLICIT_EXCEPTIONS' if scope_issues else 'PASS',
            'sectionsWithPrintedRangeEvidence':len(section_proofs),'questionsWithPrintedAllowedSubjectScope':len(card_scopes),
            'issues':scope_issues,'sectionProofs':section_proofs,'sourceCardScopes':list(card_scopes.values()),'teacherApproved':False})
        report={'status':'PASS','scope':'MOCK_PRINTED_DISCIPLINE_RANGES_AND_CONTROLLED_REPEAT_CANDIDATES_ONLY',
            'questions':len(cards),'states':dict(Counter(r['status'] for r in results)),
            'bankSnapshotSha256':comparison['bankSnapshotSha256'],'currentCatalogRun':catalog_run,
            'comparisonReportSha256':digest(folder/'comparison-report.json'),'bankComparisonSha256':digest(folder/'bank-comparison.json'),
            'printedSectionScopesPath':str(scope_path),'printedSectionScopesSha256':digest(scope_path),
            'sourceInventorySha256':digest(inventory),'controlledScopesSha256':signature(controlled),
            'questionBankWrites':0,'newQuestionsAccepted':0,'teacherApproved':False,'toolSha256':digest(Path(__file__)),'results':results}
        write_json(folder/'controlled-repeat-review.json',report)
    print({k:v for k,v in report.items() if k!='results'})
    print('Printed section scope exceptions:',scope_issues)


if __name__=='__main__':main()
