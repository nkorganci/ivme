"""Propose, never accept, question-document to answer-document pairings."""
from pathlib import Path
import json,re,unicodedata
from collections import Counter

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'

def tokens(path):
    value=unicodedata.normalize('NFKD',path).encode('ascii','ignore').decode().casefold()
    value=re.sub(r'cevap|anahtar|cozum|cozumler|pdf|test|kitap|deneme|tarama|[0-9a-f]{8,}',' ',value)
    return {x for x in re.split(r'[^a-z0-9]+',value) if len(x)>2}

def main():
    matrix=json.loads((BASE/'page-matrix.json').read_text(encoding='utf-8'))['documents']
    questions=[d for d in matrix if any(p['state'] in {'QUESTION_BODY','BOTH'} for p in d['pages'])]
    answers=[d for d in matrix if any(p['state'] in {'ANSWER_KEY','BOTH'} for p in d['pages'])]
    pairs=[]; review=[]; states=Counter()
    for question in questions:
        qt=tokens(question['relativePath']); ranked=[]
        for answer in answers:
            if answer['relativePath']==question['relativePath']:
                ranked.append((999,answer));continue
            if question.get('exam') and answer.get('exam') and question['exam']!=answer['exam']:continue
            at=tokens(answer['relativePath']); shared=len(qt&at); score=shared*10
            if question.get('lesson') and question['lesson']==answer.get('lesson'):score+=20
            if Path(question['relativePath']).parent==Path(answer['relativePath']).parent:score+=15
            if score:ranked.append((score,answer))
        ranked.sort(key=lambda row:(-row[0],row[1]['relativePath']))
        best=ranked[0] if ranked else None
        equal=len(ranked)>1 and ranked[1][0]==best[0] if best else False
        if best and (best[0]==999 or (best[0]>=25 and not equal)):
            states['PAIR_CANDIDATE']+=1;pairs.append({'questionDocument':question['relativePath'],'questionSha256':question['sha256'],
              'answerDocument':best[1]['relativePath'],'answerSha256':best[1]['sha256'],'score':best[0],
              'status':'PAIR_CANDIDATE_REQUIRES_PRINTED_NUMBER_CHECK'})
        else:
            states['INSAN_INCELEMESI']+=1;review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':question['relativePath'],'sha256':question['sha256'],'reviewStatus':'INSAN_INCELEMESI',
              'reason':'ANSWER_DOCUMENT_PAIR_NOT_UNIQUE_OR_NOT_FOUND'})
    result={'version':1,'scope':'MEBI_PRACTICE_2_ANSWER_DOCUMENT_PAIRING','status':'PASS','questionDocuments':len(questions),
      'answerDocuments':len(answers),'states':dict(states),'pairs':pairs,'reviewQueueAdditions':review,
      'acceptedQuestions':0,'databaseWrites':0,'studentVisibleWrites':0}
    (BASE/'answer-document-pairs.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','questionDocuments':len(questions),'answerDocuments':len(answers),'states':dict(states),'review':len(review)},ensure_ascii=False))
if __name__=='__main__':main()
