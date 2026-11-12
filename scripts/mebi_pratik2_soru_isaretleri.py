"""Extract page-local printed question-number candidates without accepting them."""
from pathlib import Path
import json,re
import fitz

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'
SOURCE=Path(r'D:\workspace\mebi-yks')
MARKER=re.compile(r'(?m)^\s*(?:SORU\s*)?(\d{1,3})\s*[.)]')

def main():
    documents=json.loads((BASE/'page-matrix.json').read_text(encoding='utf-8'))['documents']
    rows=[];review=[]
    for document in documents:
        if not any(p['state'] in {'QUESTION_BODY','BOTH'} for p in document['pages']):continue
        try:
            pdf=fitz.open(SOURCE/document['relativePath'])
            for index,page in enumerate(pdf,1):
                text=page.get_text('text'); numbers=[int(x) for x in MARKER.findall(text)]
                for ordinal,number in enumerate(numbers):
                    rows.append({'sourceDocument':document['relativePath'],'sourceSha256':document['sha256'],
                      'physicalPage':index,'printedNumber':number,'pageOccurrence':ordinal+1,
                      'exam':document['exam'],'lesson':document['lesson'],'status':'BODY_NUMBER_CANDIDATE',
                      'studentVisible':False})
            pdf.close()
        except Exception as error:
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':document['relativePath'],'sha256':document['sha256'],'reviewStatus':'KAYNAK_BOZUK',
              'reason':type(error).__name__})
    output={'version':1,'scope':'MEBI_PRACTICE_2_BODY_NUMBER_LOCATORS','status':'PASS','locators':rows,
      'candidateCount':len(rows),'reviewQueueAdditions':review,'acceptedQuestions':0,'databaseWrites':0}
    (BASE/'body-number-locators.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','candidateLocators':len(rows),'review':len(review)},ensure_ascii=False))
if __name__=='__main__':main()
