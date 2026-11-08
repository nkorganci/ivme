"""Audit exact textual repeat candidates against current controlled scope and answers.

Old bank subject display fields are not the branch authority. Current catalogue
subject/exam IDs are checked, and graphic/variant evidence remains reviewable.
This report does not import a question or certify visual/categorical acceptance.
"""
from collections import Counter
import json
from pathlib import Path

from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_soru_pilotu import APP,live_bank
from yks_stages.database import Snapshot,connection
from pdf_source_reconcile import text_fingerprint


def classify_exact(card,question,original,scope):
    if card.get('textFingerprint') is None or card['textFingerprint']!=text_fingerprint(original.get('original',{}).get('text','')):
        return None
    issues=[]
    if original.get('updated_at')!=question['stamp'] or original.get('image')!=question['image']:
        issues.append('ORIGINAL_TEXT_OR_IMAGE_VERSION_STALE')
    if question['correct_answer']!=card['answer']:issues.append('PRINTED_SOURCE_AND_BANK_ANSWER_DISAGREE')
    if not scope or scope.get('source_stamp')!=question['stamp']:issues.append('CONTROLLED_SCOPE_MISSING_OR_STALE')
    elif card['subjectId'] not in scope['subject_ids'] or card['exam'] not in scope['exam_ids']:
        issues.append('CURRENT_CONTROLLED_EXAM_OR_BRANCH_DIFFERS')
    return {'code':question['code'],'sourceCode':card['code'],'sourcePrintedAnswer':card['answer'],
        'bankAnswer':question['correct_answer'],'sourceExam':card['exam'],'sourceSubjectId':card['subjectId'],
        'bankLegacySubjectDisplay':question['subject'],'controlledSubjectIds':scope.get('subject_ids',[]) if scope else [],
        'controlledExamIds':scope.get('exam_ids',[]) if scope else [],
        'categoryIds':scope.get('category_ids',[]) if scope else [],
        'status':'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE' if not issues else 'SOURCE_OR_SCOPE_REVIEW_REQUIRED',
        'issues':issues,'sourceCropNeedsVisualReview':card['containsGraphics'] or bool(card['reviewConcerns']),
        'sourceCropSha256':card['imageSha256'],'questionVersion':question['stamp'],
        'importAction':'DO_NOT_ADD_ANOTHER_QUESTION_WITHOUT_RESOLVING_EXISTING_CANDIDATE',
        'topicEquivalenceAccepted':False,'visualEquivalenceAccepted':False,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/question-cohort')
    comparison=read_json(folder/'bank-comparison.json')
    questions,_=live_bank(APP)
    if signature(questions)!=comparison['bankSnapshotSha256']:raise ValueError('Bank comparison is stale')
    by_code={row['code']:row for row in questions}
    inventory=APP/'veri/content-labels/source-inventory.json'
    original={row['code']:row for row in read_json(inventory)['questions']}
    crop_report=read_json(folder/'source-crop-report.json');cards={}
    for row in crop_report['results']:
        if row['status']!='PREPARED':continue
        package=Path(row['package'])
        if digest(package)!=row['packageSha256']:raise ValueError('Source crop package changed')
        for card in read_json(package)['cards']:cards[card['code']]=card
    if set(cards)!={r['sourceCode'] for r in comparison['candidates']}:raise ValueError('Source and comparison candidate sets differ')
    needed={m['code'] for r in comparison['candidates'] for m in r['textMatches']}
    if not needed.issubset(by_code):raise ValueError('Unknown bank code in candidates')
    cmd,env=connection(APP)
    sql_codes=','.join("'"+code.replace("'","''")+"'" for code in sorted(needed))
    with Snapshot(cmd,env) as snapshot:
        run=snapshot.execute('SELECT run_key FROM learning_catalog.current_run;')
        scope_rows=json.loads(snapshot.execute("SELECT coalesce(json_agg(s),'[]') FROM (SELECT question_code,source_stamp,subject_ids,exam_ids,category_ids FROM learning_catalog.current_items WHERE kind='QUESTION' AND question_code IN ("+sql_codes+")) s;"))
        categories=json.loads(snapshot.execute("SELECT json_agg(definition ORDER BY category_id) FROM learning_catalog.current_categories;"))
    scopes={r['question_code']:r for r in scope_rows};decisions=[]
    for entry in comparison['candidates']:
        card=cards[entry['sourceCode']];exact=[]
        if digest(card['image'])!=card['imageSha256']:raise ValueError('Source crop bytes changed')
        for match in entry['textMatches']:
            code=match['code'];result=classify_exact(card,by_code[code],original.get(code,{}),scopes.get(code))
            if result:exact.append(result)
        states={r['status'] for r in exact}
        status=('EXISTING_SOURCE_MATCH_CANDIDATE' if states=={'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE'} else
                'SOURCE_OR_CONTROLLED_SCOPE_CONFLICT_REVIEW' if exact else 'CONTENT_OR_IMAGE_REVIEW_REQUIRED')
        decisions.append({'sourceCode':card['code'],'status':status,'exactTextCandidates':exact,
            'topTextCandidates':entry['textMatches'][:3],'topVisualCandidates':entry['visualMatches'][:3],
            'importAccepted':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=comparison['bankSnapshotSha256']:raise ValueError('Question bank changed during candidate review')
    report={'status':'PASS','scope':'SOURCE_KEY_AND_CONTROLLED_SCOPE_REPEAT_REVIEW_PREFLIGHT','questions':len(cards),
        'states':dict(Counter(r['status'] for r in decisions)),
        'bankSnapshotSha256':comparison['bankSnapshotSha256'],'sourceComparisonSha256':digest(folder/'bank-comparison.json'),
        'sourceInventorySha256':digest(inventory),'currentCatalogRun':run,'currentCategoryDefinitionsSha256':signature(categories),
        'catalogScopesSha256':signature(scope_rows),'results':decisions,'questionBankWrites':0,
        'newQuestionsAccepted':0,'teacherApproved':False,'toolSha256':digest(Path(__file__))}
    write_json(folder/'controlled-repeat-review.json',report)
    write_json(folder/'current-candidate-scopes.json',{'runKey':run,'categories':categories,'scopes':scope_rows})
    print(json.dumps({k:v for k,v in report.items() if k!='results'}))


if __name__=='__main__':main()
