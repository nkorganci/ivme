"""Join document-pair candidates to unique printed answer readings; no publish."""
from pathlib import Path
import json
from collections import defaultdict,Counter

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'

def main():
    pairs=json.loads((BASE/'answer-document-pairs.json').read_text(encoding='utf-8'))['pairs']
    bodies=json.loads((BASE/'body-number-locators.json').read_text(encoding='utf-8'))['locators']
    readings=json.loads((BASE/'printed-answer-readings.json').read_text(encoding='utf-8'))['readings']
    answers=defaultdict(lambda:defaultdict(list))
    for row in readings:answers[row['answerSha256']][row['printedNumber']].append(row)
    pair_by_body=defaultdict(list)
    for pair in pairs:pair_by_body[pair['questionSha256']].append(pair)
    candidates=[];queue=[];states=Counter()
    for body in bodies:
        matches=pair_by_body.get(body['sourceSha256'],[])
        if len(matches)!=1:
            states['NUMARA_BELIRSIZ']+=1;queue.append({**body,'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE',
              'reviewStatus':'NUMARA_BELIRSIZ','reason':'BODY_DOCUMENT_HAS_NO_UNIQUE_ANSWER_DOCUMENT_PAIR'});continue
        pair=matches[0];rows=answers[pair['answerSha256']].get(body['printedNumber'],[])
        values={row['answer'] for row in rows}
        if len(values)!=1:
            states['CEVAP_UYUSMUYOR' if values else 'CEVAP_YOK']+=1
            queue.append({**body,'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE',
              'reviewStatus':'CEVAP_UYUSMUYOR' if values else 'CEVAP_YOK',
              'reason':'PRINTED_NUMBER_HAS_ZERO_OR_MULTIPLE_CHOICES_IN_PAIRED_KEY',
              'answerDocument':pair['answerDocument'],'answerSha256':pair['answerSha256']});continue
        answer=next(iter(values)); evidence=sorted(rows,key=lambda r:r['physicalPage'])[0]
        candidates.append({'status':'BODY_KEY_BINDING_CANDIDATE','studentVisible':False,'sourceDocument':body['sourceDocument'],
          'sourceSha256':body['sourceSha256'],'bodyPage':body['physicalPage'],'printedNumber':body['printedNumber'],
          'bodyOccurrence':body['pageOccurrence'],'answerDocument':pair['answerDocument'],'answerSha256':pair['answerSha256'],
          'answerPage':evidence['physicalPage'],'answer':answer,'exam':body['exam'],'lesson':body['lesson']})
        states['BINDING_CANDIDATE']+=1
    result={'version':1,'scope':'MEBI_PRACTICE_2_BODY_KEY_BINDING','status':'PASS','states':dict(states),
      'candidates':candidates,'reviewQueueAdditions':queue,'acceptedQuestions':0,'databaseWrites':0,'studentVisibleWrites':0}
    (BASE/'body-key-binding-candidates.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','states':dict(states),'candidates':len(candidates),'review':len(queue)},ensure_ascii=False))
if __name__=='__main__':main()
