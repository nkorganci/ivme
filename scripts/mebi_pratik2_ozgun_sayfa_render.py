"""Render only evidence pages for bound MEBI Practice 2 candidates.

Each PNG is derived directly from its hashed source PDF; no generative image
tool is involved.  The index records every candidate's body/key page asset.
"""
from pathlib import Path
import hashlib,json
import fitz

APP=Path(__file__).resolve().parents[1]
BASE=APP/'veri/mebi-pratik-2/20261111-source-inventory'
SOURCE=Path(r'D:\workspace\mebi-yks')
OUT=BASE/'original-page-png'

def slug(sha,page):return f'{sha[:20]}-p{page:04}.png'
def main():
    candidates=json.loads((BASE/'body-key-binding-candidates.json').read_text(encoding='utf-8'))['candidates']
    pages={}
    for row in candidates:
        pages[(row['sourceSha256'],row['sourceDocument'],row['bodyPage'])]=None
        pages[(row['answerSha256'],row['answerDocument'],row['answerPage'])]=None
    OUT.mkdir(exist_ok=True); rendered=[];review=[]
    for (sha,relative,page),_ in pages.items():
        target=OUT/slug(sha,page)
        try:
            if not target.is_file():
                pdf=fitz.open(SOURCE/relative)
                pix=pdf[page-1].get_pixmap(matrix=fitz.Matrix(2,2),alpha=False)
                pix.save(target);pdf.close()
            actual=hashlib.file_digest(target.open('rb'),'sha256').hexdigest()
            rendered.append({'sourceSha256':sha,'relativePath':relative,'physicalPage':page,
              'png':str(target.relative_to(BASE)),'pngSha256':actual,'bytes':target.stat().st_size})
        except Exception as error:
            review.append({'queue':'MEBI_PRACTICE_2_REVIEW_QUEUE','studentVisible':False,
              'relativePath':relative,'sha256':sha,'physicalPage':page,'reviewStatus':'KAYNAK_BOZUK','reason':type(error).__name__})
    result={'version':1,'scope':'MEBI_PRACTICE_2_ORIGINAL_PAGE_PNG','status':'PASS','dpi':144,
      'renderedPages':rendered,'rendered':len(rendered),'reviewQueueAdditions':review,
      'studentVisibleWrites':0,'databaseWrites':0}
    (BASE/'original-page-render-index.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PASS','rendered':len(rendered),'review':len(review)},ensure_ascii=False))
if __name__=='__main__':main()
