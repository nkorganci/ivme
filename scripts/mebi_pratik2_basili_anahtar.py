"""Read only explicit printed number-to-choice rows from answer-key pages."""
from pathlib import Path
import json,re
import fitz

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'
SOURCE=Path(r'D:\workspace\mebi-yks')
ROW=re.compile(r'(?<!\d)(\d{1,3})\s*[-.:)]\s*([ABCDE])\b')

def main():
    docs=json.loads((BASE/'page-matrix.json').read_text(encoding='utf-8'))['documents']
    readings=[];review=[]
    for document in docs:
        if not any(p['state'] in {'ANSWER_KEY','BOTH'} for p in document['pages']):continue
        try:
            pdf=fitz.open(SOURCE/document['relativePath'])
            for index,page in enumerate(pdf,1):
                text=page.get_text('text'); rows=ROW.findall(text)
                if not rows:continue
                seen={}
                for number,answer in rows:
                    previous=seen.setdefault(number,answer)
                    if previous!=answer:
                        review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
                          'relativePath':document['relativePath'],'sha256':document['sha256'],'physicalPage':index,
                          'reviewStatus':'CEVAP_UYUSMUYOR','reason':'MULTIPLE_PRINTED_CHOICES_FOR_SAME_NUMBER'})
                for number,answer in seen.items():
                    readings.append({'answerDocument':document['relativePath'],'answerSha256':document['sha256'],
                      'physicalPage':index,'printedNumber':int(number),'answer':answer,'status':'PRINTED_KEY_CANDIDATE',
                      'studentVisible':False})
            pdf.close()
        except Exception as error:
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':document['relativePath'],'sha256':document['sha256'],'reviewStatus':'KAYNAK_BOZUK','reason':type(error).__name__})
    result={'version':1,'scope':'MEBI_PRACTICE_2_PRINTED_ANSWER_ROWS','status':'PASS','readings':readings,
      'reviewQueueAdditions':review,'acceptedQuestions':0,'databaseWrites':0}
    (BASE/'printed-answer-readings.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','printedAnswerRows':len(readings),'review':len(review)},ensure_ascii=False))
if __name__=='__main__':main()
