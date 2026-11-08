"""Classify full-source repeat candidates with current answers and controlled scopes."""
from collections import Counter
import argparse
import json
from pathlib import Path

from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_soru_pilotu import APP,live_bank
from yks_stages.database import Snapshot,connection
from yks_pilot_tekrar_incele import classify_exact


def main():
    parser=argparse.ArgumentParser(description=__doc__);choice=parser.add_mutually_exclusive_group()
    choice.add_argument('--repairs',action='store_true');choice.add_argument('--shared',action='store_true');choice.add_argument('--raster',action='store_true');args=parser.parse_args()
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    folder=root/('full-question-raster-comparison' if args.raster else 'full-question-shared-comparison' if args.shared else 'full-question-repair-comparison' if args.repairs else 'full-question-comparison')
    proof=read_json(folder/'comparison-report.json');comparison=read_json(folder/'bank-comparison.json')
    if proof['bankComparisonSha256']!=digest(folder/'bank-comparison.json'):raise ValueError('Full bank comparison changed')
    bank,_=live_bank(APP)
    if signature(bank)!=comparison['bankSnapshotSha256']:raise ValueError('Full bank comparison stale')
    by_code={r['code']:r for r in bank};cards={}
    for path,sha in proof['sourcePackages'].items():
        if digest(path)!=sha:raise ValueError('Full source package changed')
        cards.update({c['code']:c for c in read_json(path)['cards']})
    if set(cards)!={c['sourceCode'] for c in comparison['candidates']}:raise ValueError('Full source/comparison membership differs')
    inventory=APP/'veri/content-labels/source-inventory.json';original={r['code']:r for r in read_json(inventory)['questions']}
    needed={m['code'] for c in comparison['candidates'] for m in c['textMatches']};cmd,env=connection(APP)
    escaped=','.join("'"+c.replace("'","''")+"'" for c in sorted(needed))
    with Snapshot(cmd,env) as snapshot:
        run=snapshot.execute('SELECT run_key FROM learning_catalog.current_run;')
        scope_rows=json.loads(snapshot.execute("SELECT coalesce(json_agg(s),'[]') FROM (SELECT question_code,source_stamp,subject_ids,exam_ids,category_ids FROM learning_catalog.current_items WHERE kind='QUESTION' AND question_code IN ("+escaped+")) s;"))
        categories=json.loads(snapshot.execute("SELECT json_agg(definition ORDER BY category_id) FROM learning_catalog.current_categories;"))
    scopes={r['question_code']:r for r in scope_rows};results=[]
    for candidate in comparison['candidates']:
        card=cards[candidate['sourceCode']];exact=[]
        if digest(card['image'])!=card['imageSha256']:raise ValueError('Checked source question image changed')
        for match in candidate['textMatches']:
            code=match['code'];result=classify_exact(card,by_code[code],original.get(code,{}),scopes.get(code))
            if result:exact.append(result)
        states={r['status'] for r in exact}
        status=('EXISTING_SOURCE_MATCH_CANDIDATE' if states=={'EXACT_TEXT_SOURCE_ANSWER_AND_CONTROLLED_SCOPE_AGREE'} else
            'SOURCE_OR_CONTROLLED_SCOPE_CONFLICT_REVIEW' if exact else 'CONTENT_OR_IMAGE_REVIEW_REQUIRED')
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],'status':status,
            'exactTextCandidates':exact,'topTextCandidates':candidate['textMatches'][:3],
            'topVisualCandidates':candidate['visualMatches'][:3],'importAccepted':False,'teacherApproved':False})
    after,_=live_bank(APP)
    if signature(after)!=comparison['bankSnapshotSha256']:raise ValueError('Bank changed during controlled full-source candidate review')
    report={'status':'PASS','scope':'FULL_DIAGNOSTIC_KEYED_SOURCE_CONTROLLED_REPEAT_PREFLIGHT','questions':len(cards),
        'states':dict(Counter(r['status'] for r in results)),'bankSnapshotSha256':comparison['bankSnapshotSha256'],
        'comparisonReportSha256':digest(folder/'comparison-report.json'),'bankComparisonSha256':digest(folder/'bank-comparison.json'),
        'sourceInventorySha256':digest(inventory),'currentCatalogRun':run,'categoryDefinitionsSha256':signature(categories),
        'controlledScopeSha256':signature(scope_rows),'toolSha256':digest(Path(__file__)),
        'questionBankWrites':0,'newQuestionsAccepted':0,'teacherApproved':False,'results':results}
    write_json(folder/'controlled-repeat-review.json',report)
    write_json(folder/'current-candidate-scopes.json',{'runKey':run,'categories':categories,'scopes':scope_rows})
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
