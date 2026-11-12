"""Create a read-only page/answer coverage matrix for MEBI Practice 2."""
from pathlib import Path
import json,re
from collections import Counter
import fitz

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'
SOURCE=Path(r'D:\workspace\mebi-yks')
QUESTION=re.compile(r'(?m)^\s*(?:SORU\s*)?\d{1,3}\s*[.)]')
ANSWER=re.compile(r'(?i)cevap\s*(anahtar|listesi)|answer\s*key|\bdoğru\s*cevap')

def main():
    inventory=json.loads((BASE/'inventory.json').read_text(encoding='utf-8'))['items']
    rows=[];review=[];stats=Counter()
    for item in inventory:
        if item['state'] not in {'QUESTION_CANDIDATE','ANSWER_CANDIDATE'}:continue
        path=SOURCE/item['relativePath']
        if item['extension']!='.pdf':
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':item['relativePath'],'sha256':item['sha256'],'reviewStatus':'UNSUPPORTED_PAGE_CONTAINER',
              'reason':'NON_PDF_QUESTION_OR_ANSWER_CANDIDATE'})
            stats['nonPdfReview']+=1;continue
        try:
            document=fitz.open(path)
            pages=[]
            for number,page in enumerate(document,1):
                text=page.get_text('text')
                question=len(QUESTION.findall(text)); answer=bool(ANSWER.search(text))
                state='BOTH' if question and answer else 'QUESTION_BODY' if question else 'ANSWER_KEY' if answer else 'NONE'
                pages.append({'page':number,'state':state,'questionNumberMarkers':question,'textChars':len(text)})
                stats['pages.'+state]+=1
            document.close()
            rows.append({'relativePath':item['relativePath'],'sha256':item['sha256'],'exam':item['exam'],'lesson':item['lesson'],
              'sourceState':item['state'],'pages':pages,'pageCount':len(pages)})
            stats['pdfs']+=1
            if not any(page['state'] in {'QUESTION_BODY','BOTH'} for page in pages):
                review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
                  'relativePath':item['relativePath'],'sha256':item['sha256'],'reviewStatus':'NO_MACHINE_QUESTION_MARKER',
                  'reason':'ORIGINAL_PAGE_REVIEW_REQUIRED'})
        except Exception as error:
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':item['relativePath'],'sha256':item['sha256'],'reviewStatus':'KAYNAK_BOZUK',
              'reason':type(error).__name__})
            stats['pdfOpenError']+=1
    result={'version':1,'scope':'MEBI_PRACTICE_2_PAGE_COVERAGE','status':'PASS','documents':rows,
      'stats':dict(stats),'reviewQueueAdditions':review,'studentVisibleWrites':0,'databaseWrites':0}
    (BASE/'page-matrix.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','documents':len(rows),'stats':dict(stats),'reviewQueueAdditions':len(review)},ensure_ascii=False))
if __name__=='__main__':main()
