"""Certify exact reuse of the twelve pilot questions, without importing/updating."""
from pathlib import Path

from yks_birlestirme import Store,digest,read_json,signature,write_json
from yks_soru_pilotu import live_bank,SOURCE,APP,OUT
from pdf_source_reconcile import text_fingerprint


def exact_reuse(card,question,original):
    if question['exam_type']!='AYT' or question['subject']!='Tarih':
        raise ValueError('Pilot canonical question scope differs')
    if original['updated_at']!=question['stamp'] or original['image']!=question['image']:
        raise ValueError('Original text evidence is stale or points to another bank image')
    before=text_fingerprint(original['original']['text']);after=text_fingerprint(card['text'])
    if before is None or before!=after:
        raise ValueError('Full source text/options/numbers differ')
    if question['correct_answer']!=card['answer'] or card['answerMethodA']!=card['answerMethodB'] or card['answerMethodA']!=card['answer']:
        raise ValueError('Canonical and two printed source answer readings differ')
    return {'sourceCode':card['code'],'canonicalQuestionCode':question['code'],
            'printedNumber':card['printedNumber'],'action':'REUSE_EXISTING_QUESTION_NOT_IMPORT',
            'method':'EXACT_NFC_CONTENT_SEQUENCE_AND_CURRENT_VERSION_AND_TWO_SOURCE_ANSWERS',
            'textFingerprint':before,'answer':card['answer'],'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/soru-pilotu/'+SOURCE[:16])
    package=read_json(folder/'candidates.json');comparison=read_json(folder/'bank-comparison.json')
    questions,_=live_bank(APP)
    if signature(questions)!=comparison['bankSnapshotSha256']:raise ValueError('Bank comparison became stale')
    by_code={r['code']:r for r in questions}
    source_inventory=APP/'veri/content-labels/source-inventory.json'
    original={r['code']:r for r in read_json(source_inventory)['questions']}
    visual={r['code']:r for r in read_json(OUT/'bank-image-fingerprints.json')['images']}
    comparisons={r['sourceCode']:r for r in comparison['candidates']};decisions=[]
    for card in package['cards']:
        if digest(folder/card['image'])!=card['imageSha256']:raise ValueError('Pilot source image changed')
        match=comparisons[card['code']]['textMatches'][0]['code']
        question=by_code[match]
        image=APP/'veri/resimler-pilot'/question['image']
        if digest(image)!=visual[match]['fileSha256']:raise ValueError('Canonical bank image bytes changed')
        decisions.append(exact_reuse(card,question,original[match]))
    if len(decisions)!=12 or len({r['canonicalQuestionCode'] for r in decisions})!=12:
        raise ValueError('Pilot source/canonical mapping incomplete or duplicated')
    report={'status':'PASS','scope':'TWELVE_PILOT_QUESTIONS_ONLY','sourceSha256':SOURCE,
            'sourcePackageSha256':digest(folder/'candidates.json'),'bankComparisonSha256':digest(folder/'bank-comparison.json'),
            'bankSnapshotSha256':comparison['bankSnapshotSha256'],'sourceInventorySha256':digest(source_inventory),
            'existingQuestionsReused':12,'newQuestions':0,'questionsInserted':0,'questionsUpdated':0,
            'teacherApproved':False,'decisions':decisions,
            'nextAction':'Reuse these canonical IDs; full archive extraction/duplicate/topic/pilot acceptance remains open'}
    write_json(folder/'exact-reuse-report.json',report)
    print({'status':'PASS','existingQuestionsReused':12,'questionsInserted':0,'questionsUpdated':0})


if __name__=='__main__':main()
