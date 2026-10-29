"""Prepare/admit explicitly source-reviewed lesson-slide cards, without reimport.

The local-model report is not an input acceptance file. The review must bind each
decision to the original package, image/text hashes, controlled category and
source content reading. Unselected/unresolved cards remain in the inventory.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from PIL import Image
from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,ROOT,digest,read_evidence_scan,write_json
from pdf_source_reconcile import json_query,text_fingerprint,prose_fingerprint,excluded_exam
from pdf_question_accept import compact,literal,bank_snapshot,validate_card,reviewed_answer,publish


def prepare(connection,review_path):
    review=json.loads(review_path.read_text(encoding='utf-8'));review_sha=digest(review_path)
    if review.get('reviewMethod')!='SOURCE_CONTENT_REVIEW' or review.get('teacherApproved') is not False:
        raise ValueError('An explicit source reading, separate from raw model proposals, is required')
    batch_sha=hashlib.sha256(compact(sorted(r['sourceCode'] for r in review['items'])).encode()).hexdigest()
    prior={(r['source_sha256'],r['evidence'].get('sourceCode')):r for r in json_query(connection,
        "SELECT source_sha256,question_code,evidence FROM learning_catalog.pdf_question_occurrences WHERE evidence ? 'acceptanceReviewSha256'")}
    pending=[]
    for decision in review['items']:
        previous=prior.get((decision['sourceSha256'],decision['sourceCode']))
        if not previous:pending.append(decision);continue
        evidence=previous['evidence'];expected=decision['sourceCode'] if decision['decision']=='NEW' else decision['canonicalCode']
        if previous['question_code']!=expected or evidence.get('imageSha256')!=decision['imageSha256'] or hashlib.sha256(evidence.get('sourceText','').encode()).hexdigest()!=decision['sourceTextSha256'] or evidence.get('categoryIds')!=decision['categoryIds']:
            raise ValueError('An admitted source card has a different content/scope decision')
    if not pending:return {'alreadyAccepted':True,'sourceSha256':batch_sha}
    questions=json_query(connection,"SELECT code,active,exam_type,subject,image,correct_answer,extract(epoch FROM updated_at)::text source_stamp FROM questions WHERE exam_type IN ('TYT','AYT') ORDER BY code")
    by_code={q['code']:q for q in questions};snapshot=bank_snapshot(questions)
    comparison_path=OUT/'text-duplicate-candidates.json';comparison=json.loads(comparison_path.read_text(encoding='utf-8'))
    if comparison.get('bankSnapshotSha256')!=snapshot:raise ValueError('Repeat the bank comparison after the last bank change')
    compared={r['code']:r for r in comparison['candidates']}
    categories={row['definition']['id']:row['definition'] for row in json_query(connection,'SELECT definition FROM learning_catalog.current_categories')}
    fingerprints={r['fingerprint']:r['question_code'] for r in json_query(connection,"""SELECT f.question_code,f.fingerprint
      FROM learning_catalog.question_content_fingerprints f JOIN questions q ON q.code=f.question_code
      WHERE q.active AND q.exam_type IN ('TYT','AYT') AND f.algorithm IN ('NFC_CONTENT_SEQUENCE_V1','EXACT_IMAGE_BYTES_V1','PROSE_TYPOGRAPHY_CONNECTOR_V1')""")}
    new=[];occurrences=[];inputs=[];seen=set();source_cache={}
    new_texts=[]
    for decision in sorted(pending,key=lambda item:item['decision']!='NEW'):
        code=decision['sourceCode']
        if len(decision.get('sourceReading',''))<20:raise ValueError('Recorded source-content reasoning is required')
        if code in seen:raise ValueError('Source review repeats a question');
        seen.add(code)
        package_path=(APP/decision['sourcePackage']).resolve()
        if not package_path.is_relative_to((OUT/'slide-candidates').resolve()):raise ValueError('Unexpected staged source')
        package=json.loads(package_path.read_text(encoding='utf-8'));sha=package['sourceSha256']
        if sha!=decision['sourceSha256']:raise ValueError('Source review hash changed')
        if digest(package_path)!=decision['packageSha256']:raise ValueError('Source package changed after review')
        card=next((c for c in package['cards'] if c['code']==code),None)
        if not card or card['answerProof']!='VECTOR_COLOR_AND_RENDERED_RED_PIXELS_AGREE':raise ValueError('Missing independent rendered source answer proof')
        if excluded_exam(card['text']):raise ValueError('This source example belongs to another exam outside the requested YKS scope')
        source=(ROOT/package['sourceRelativePath']).resolve()
        if not source.is_relative_to(ROOT.resolve()):raise ValueError('Source outside archive')
        if sha not in source_cache:
            if digest(source)!=sha:raise ValueError('Original PDF changed')
            source_cache[sha]=read_evidence_scan(sha,for_review=True)
        if not 1<=card['pdfPage']<=source_cache[sha]['pageCount']:raise ValueError('Question outside PDF')
        canonical=code if decision['decision']=='NEW' else decision['canonicalCode']
        validate_card(card,{**decision,'exam':categories[decision['categoryIds'][0]]['exam']},by_code.get(canonical))
        image=(package_path.parent/card['image']).resolve()
        if not image.is_relative_to(package_path.parent) or digest(image)!=card['imageSha256']:raise ValueError('Source crop changed')
        with Image.open(image) as picture:picture.verify()
        selected=[categories[id] for id in decision['categoryIds']]
        if any(not c.get('canonicalUnit') or c['exam']!=selected[0]['exam'] or c['subjectId']!=selected[0]['subjectId'] for c in selected):raise ValueError('Wrong controlled subject/topic scope')
        if decision['decision']=='NEW':
            if code in by_code:raise ValueError('Existing code cannot be imported again')
            match=compared.get(code)
            if not match or match.get('textSha256')!=hashlib.sha256(card['text'].encode()).hexdigest():raise ValueError('Source was not compared with the current whole bank')
            if match['matches'] and match['matches'][0]['similarity']>.85 and not decision.get('distinctStemAndOptionsReview'):
                raise ValueError('High-similarity question needs a recorded stem/option distinction')
            for fp in [card['imageSha256'],text_fingerprint(card['text']),prose_fingerprint(card['text'])]:
                if fp and fp in fingerprints:raise ValueError('Duplicate existing/batch question: '+fingerprints[fp])
                if fp:fingerprints[fp]=code
            image_ref='pdf-intake/'+sha+'/'+code+'.webp'
            row={'code':code,'exam':selected[0]['exam'],'subject':selected[0]['subject'],'topic':selected[0]['topic'],
                 'source':source.name,'image':image_ref,'imageSha256':card['imageSha256'],'answer':reviewed_answer(card,decision),'sourceImage':str(image)}
            new.append(row)
            new_texts.append((code,card['text']))
            by_code[code]={'active':True,'exam_type':row['exam'],'correct_answer':row['answer']}
            inputs.append({'kind':'QUESTION','code':code,'exam':row['exam'],'subject':row['subject'],'topic':row['topic'],
                'categoryIds':decision['categoryIds'],'bank':'OGM','active':True,'available':True,'image':image_ref,'source':source.name,
                'locations':{c['id']:[{'type':'QUESTION','questionCode':code},
                    {'type':'PDF','sourceKey':'pdf:'+str(min(package['sourceCatalogIds'])),
                     'pdfPageStart':card['pdfPage'],'pdfPageEnd':card['pdfPage'],'pageCount':source_cache[sha]['pageCount']}] for c in selected}})
        proof={'acceptanceReviewSha256':review_sha,'origin':'REVIEWED_PDF_ACCEPTANCE','sourceCode':code,
            'active':True,'bank':'OGM','exam':by_code[canonical]['exam_type'],'matchType':decision['matchType'],
            'sourceStamp':by_code[canonical].get('source_stamp'),'reference':decision['sourcePackage']+'#code='+code,
            'sourceFile':source.relative_to(ROOT).as_posix(),'page':card['pdfPage'],'topic':selected[0]['topic'],
            'printedNumbers':[],'sourceText':card['text'],'imageSha256':card['imageSha256'],
            'answersA':[card['answerMethodA']],'answersB':[card['answerMethodB']],'sourceAnswer':card['answer'],
            'answerPage':card['answerPage'],'answerPermutation':decision.get('answerPermutation',{}),
            'teacherApproved':False,'comparisonSha256':digest(comparison_path),'bankSnapshotSha256':snapshot,
            'categoryIds':decision['categoryIds'],'sourceReading':decision['sourceReading']}
        original_exam=re.search(r'(?m)^\s*((?:19|20)\d{2})\s*[-–]?\s*(YGS|LYS\d?|ÖSS|ÖYS|TYT|AYT)\b',card['text'])
        if original_exam:proof.update({'originalExam':original_exam[2],'originalExamYear':int(original_exam[1])})
        if decision.get('answerCorrection'):proof['answerCorrection']=decision['answerCorrection']
        if decision.get('externalSources'):proof['externalSources']=decision['externalSources']
        occurrences.append({'sourceCode':code,'sourceSha256':sha,'questionCode':canonical,'page':card['pdfPage'],
            'numbers':[],'decision':decision['decision'],'evidence':proof})
    batch_comparison={'algorithm':'TFIDF_WORD_1_2','maxSimilarity':0,'newQuestions':len(new_texts)}
    if len(new_texts)>1:
        from sklearn.feature_extraction.text import TfidfVectorizer
        matrix=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True).fit_transform(text for _,text in new_texts)
        similarities=(matrix@matrix.T).tocoo()
        pairs=[(i,j,float(value)) for i,j,value in zip(similarities.row,similarities.col,similarities.data) if i<j]
        batch_comparison['maxSimilarity']=max((value for _,_,value in pairs),default=0)
        close=[(new_texts[i][0],new_texts[j][0]) for i,j,value in pairs if value>.8]
        if close:raise ValueError('New source questions also resemble each other; review before admission: '+repr(close))
    result=subprocess.run(['node','scripts/resource-intake.mjs'],cwd=APP,input=compact(inputs),text=True,encoding='utf-8',capture_output=True,check=True)
    resources=json.loads(result.stdout)['resources']
    current=query(connection,'SELECT run_key FROM learning_catalog.current_run')
    guard=query(connection,"SELECT md5(string_agg(code||':'||active::text||':'||extract(epoch FROM updated_at)::text,',' ORDER BY code)) FROM questions WHERE exam_type IN ('TYT','AYT')")
    data={'sourceSha256':batch_sha,'reviewSha256':review_sha,'previousRun':current,'bankGuard':guard,
        'run':'pdf-slides-'+review_sha[:16]+'-'+snapshot[:12],'newQuestions':new,'occurrences':occurrences,'resources':resources,
        'newQuestionPairComparison':batch_comparison}
    write_json(OUT/'acceptance'/batch_sha/'prepared.json',data)
    return data


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--review',type=Path,default=OUT/'slide-content-review.json')
    parser.add_argument('--database',choices=['ivme','ivme_test'],default='ivme');parser.add_argument('--publish',action='store_true');parser.add_argument('--backup',type=Path)
    args=parser.parse_args();connection=db_connection(args.database);data=prepare(connection,args.review)
    if args.publish:publish(connection,data,args.backup)
    print(compact({'alreadyAccepted':data.get('alreadyAccepted',False),'newQuestions':len(data.get('newQuestions',[])),
        'existingMatches':sum(o['decision']=='MATCH' for o in data.get('occurrences',[])),'published':args.publish}))
