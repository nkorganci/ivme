"""Find repeated questions between unpublished source cohorts, without admitting any.

The bank comparison alone cannot prevent two new batches from publishing the
same question. This queue binds all prepared packages, printed answers and
source bytes; text equality remains a candidate when original graphics differ.
"""
from collections import Counter,defaultdict
import hashlib
from pathlib import Path
import re
import unicodedata

from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP
from yks_secenek_degisimi import choices
from yks_soru_pilotu import live_bank

COHORTS=['full-question-comparison','full-question-repair-comparison','full-question-shared-comparison',
    'full-question-raster-comparison','full-question-exception-comparison','full-question-multikey-comparison',
    'full-question-rebound-comparison','full-mock-comparison','new-book-comparison/din']


def literal(value):
    # Preserve case, mathematical operators, punctuation, numbers and negation.
    # Do not silently treat the variable A as the same quantity as a.
    value=unicodedata.normalize('NFC',value).replace('\u00ad','')
    return re.sub(r'\s+',' ',value).strip()


def body_identity(text):
    try:stem,options=choices(text)
    except ValueError:return None
    stem=literal(stem);options={k:literal(v) for k,v in options.items()}
    if not stem or set(options)!=set('ABCDE') or len(set(options.values()))!=5:return None
    return {'identity':signature([stem,sorted(options.values())]),'stemSha256':signature(stem),'options':options}


def cluster(members):
    contents={m['answerContentSha256'] for m in members};images={m['imageSha256'] for m in members}
    answers_valid=all(m['printedAnswer'] in 'ABCDE' for m in members)
    status=('PRINTED_CORRECT_OPTION_CONTENT_CONFLICT_KEEP_SEPARATE' if not answers_valid or len(contents)!=1 else
        'EXACT_SOURCE_IMAGE_AND_ALL_OPTION_CONTENTS_REPEAT_CANDIDATE' if len(images)==1 else
        'COMPLETE_STEM_AND_OPTIONS_REPEAT_CANDIDATE_GRAPHICS_REVIEW_REQUIRED')
    return {'clusterId':signature(sorted((m['sourceCode'],m['sourceSha256']) for m in members)),
        'status':status,'members':members,'questions':len(members),'distinctSourcePdfs':len({m['sourceSha256'] for m in members}),
        'printedAnswerLetters':sorted({m['printedAnswer'] for m in members}),
        'sameCorrectOptionContent':answers_valid and len(contents)==1,'sameImageBytes':len(images)==1,
        'automaticNewQuestionAdmissionAllowed':False,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);out=root/'cross-source-candidates';out.mkdir(exist_ok=True)
    packages={};inputs={};bank_shas=set();cards={};memberships=defaultdict(list)
    with process_lock(out/'.writer.lock'):
        for name in COHORTS:
            file=root/name/'comparison-report.json';report=read_json(file)
            if report['status']!='PASS':raise ValueError('Complete all-cohort comparison required: '+name)
            inputs[str(file)]=digest(file);bank_shas.add(report['bankSnapshotSha256'])
            for path,sha in report['sourcePackages'].items():
                if path in packages and packages[path]!=sha:raise ValueError('Conflicting source package versions')
                packages[path]=sha
                if digest(path)!=sha:raise ValueError('Prepared source package changed')
                package=read_json(path)
                for card in package['cards']:
                    code=card['code']
                    if code in cards and signature(cards[code])!=signature(card):raise ValueError('Conflicting source question code across prepared cohorts: '+code)
                    cards[code]=card;memberships[code].append(name)
        if len(bank_shas)!=1:raise ValueError('Prepared batches were compared against different live banks')
        bank,_=live_bank(APP);bank_sha=signature(bank)
        if bank_sha not in bank_shas:raise ValueError('Live bank changed since prepared comparisons')
        grouped=defaultdict(list);unparsed=[];sources=[]
        for card in cards.values():
            if digest(card['image'])!=card['imageSha256']:raise ValueError('Prepared source question crop bytes changed')
            body=body_identity(card['text']);sources.append([card['code'],card['sourceSha256'],card['imageSha256'],signature(card['text']),card['answer']])
            if body is None:unparsed.append(card['code']);continue
            answer=card['answer']
            if type(answer) is not str or answer not in list('ABCDE'):raise ValueError('Prepared source answer is not a source-bound letter')
            grouped[body['identity']].append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
                'cohorts':memberships[card['code']],'printedNumber':card.get('printedNumber'),'exam':card['exam'],
                'subjectId':card.get('subjectId'),'printedAnswer':answer,'imageSha256':card['imageSha256'],
                'image':card['image'],'sourceTextSha256':hashlib.sha256(card['text'].encode()).hexdigest(),
                'answerContentSha256':signature(body['options'][answer]),'literalOptionHashes':{k:signature(v) for k,v in body['options'].items()}})
        clusters=[cluster(rows) for rows in grouped.values() if len(rows)>1]
        clusters.sort(key=lambda c:(-c['questions'],c['clusterId']))
        after,_=live_bank(APP)
        if signature(after)!=bank_sha or any(digest(p)!=sha for p,sha in {**inputs,**packages}.items()):raise ValueError('Source/bank evidence changed during candidate grouping')
        report={'status':'PASS','scope':'CROSS_UNPUBLISHED_SOURCE_COHORT_DUPLICATE_CANDIDATES_NOT_ACCEPTANCE',
            'questions':len(cards),'sourceDocuments':len({c['sourceSha256'] for c in cards.values()}),'sourcePackages':packages,
            'bankSnapshotSha256':bank_sha,'inputs':inputs,'sourceQuestionIdentitySha256':signature(sources),
            'literalFiveOptionQuestions':len(cards)-len(unparsed),'unparsedQuestions':unparsed,
            'duplicateCandidateClusters':len(clusters),'clusteredSourceQuestions':sum(c['questions'] for c in clusters),
            'states':dict(Counter(c['status'] for c in clusters)),'toolSha256':digest(Path(__file__)),
            'questionBankWrites':0,'sourceWrites':0,'newQuestionsAccepted':0,'newModelCalls':0,'newOcrCalls':0,
            'teacherApproved':False,'results':clusters}
        write_json(out/'report.json',report)
        by_source=[]
        for c in clusters:
            for m in c['members']:by_source.append({'sourceCode':m['sourceCode'],'sourceSha256':m['sourceSha256'],'clusterId':c['clusterId'],
                'status':c['status'],'relatedSourceCodes':[other['sourceCode'] for other in c['members'] if other['sourceCode']!=m['sourceCode']],
                'newQuestionAccepted':False})
        write_json(out/'source-question-index.json',{'status':'PASS','reportSha256':digest(out/'report.json'),'results':by_source})
    print({k:v for k,v in report.items() if k not in ['results','sourcePackages','inputs','unparsedQuestions']})


if __name__=='__main__':main()
