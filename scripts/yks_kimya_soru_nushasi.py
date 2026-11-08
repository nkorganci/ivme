"""Compare individual chemistry questions across otherwise different editions.

A changed test never receives its old full key. Only complete same-number
questions with identical native text AND exact original RGB at 180/330 DPI
can become separate-key candidates. Original source editions stay unchanged.
"""
from collections import Counter
from contextlib import ExitStack
import hashlib
from pathlib import Path

import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest,signature,process_lock
from yks_pilot_kaynaklari import APP,test_identities,plain
from yks_pilot_sorular import source_lines,boundaries,OPTION
from yks_pilot_kirpim_kontrol import uncovered_body_lines
from yks_tam_ayri_anahtar import index_book,complete_body_numbers
from yks_ayri_anahtar import normalized_body

DPIS=[180,330]


def compare_question(left,right,box):
    rect=pymupdf.Rect(box)
    if left.rect!=right.rect:return {'status':'PAGE_GEOMETRY_DIFFERS'}
    a=left.get_text(clip=rect);b=right.get_text(clip=rect)
    if not a or normalized_body(a)!=normalized_body(b):return {'status':'NATIVE_QUESTION_CONTENT_DIFFERS','sourceTextSha256':signature(a),'bookTextSha256':signature(b)}
    if Counter(OPTION.findall(a))!=Counter('ABCDE') or Counter(OPTION.findall(b))!=Counter('ABCDE'):
        return {'status':'COMPLETE_SOURCE_OPTIONS_NOT_VERIFIED'}
    checks=[]
    for dpi in DPIS:
        x=left.get_pixmap(dpi=dpi,clip=rect,alpha=False);y=right.get_pixmap(dpi=dpi,clip=rect,alpha=False)
        source=hashlib.sha256(x.samples).hexdigest();book=hashlib.sha256(y.samples).hexdigest()
        checks.append({'dpi':dpi,'sourceRgbSha256':source,'bookRgbSha256':book,'equal':(x.width,x.height,source)==(y.width,y.height,book),
            'width':x.width,'height':x.height})
    return {'status':'INDIVIDUAL_ORIGINAL_NATIVE_AND_TWO_DPI_PIXELS_IDENTICAL' if all(x['equal'] for x in checks) else 'ORIGINAL_QUESTION_PIXELS_DIFFER',
        'nativeBodySha256':hashlib.sha256(normalized_body(a).encode()).hexdigest(),'bboxPt':list(rect),'pixels':checks}


def inspect(source_row,book,official_index):
    sha=source_row['sourceSha256'];exam=source_row['exam'];test=source_row['testNumber'];source=Path(source_row['sourcePath'])
    sections=official_index['keys'].get(test,[])
    base={'sourceSha256':sha,'sourcePath':str(source),'exam':exam,'subjectId':'kimya','testNumber':test,
        'officialBookSha256':source_row['officialBookSha256'],'officialBookPath':source_row['officialBookPath'],
        'fullTestKeyTransferred':False,'sourceWrites':0,'questionBankWrites':0,'teacherApproved':False}
    if len(sections)!=1:return {**base,'status':'OFFICIAL_PRINTED_KEY_NOT_UNIQUE','questions':[]}
    key=sections[0];answers=key['answers'];rows=[];page_checks=[]
    with pymupdf.open(source) as doc:
        ids=set().union(*(test_identities(p.get_text()) for p in doc))
        if ids!={(exam,test)} or 'KIMYA' not in plain(doc[0].get_text()):raise ValueError('Actual source chemistry test identity changed')
        numbers=complete_body_numbers(doc,answers)
        if numbers['status']!='PASS':return {**base,'status':'WHOLE_SOURCE_NUMBER_OR_OPTIONS_INCOMPLETE_NO_PARTIAL_KEY_BINDING','bodyNumberProof':numbers,'questions':[]}
        for page in doc:
            book_index=source_row['bookBodyStartPage']-1+page.number
            if book_index>=len(book):raise ValueError('Book counterpart page outside original document')
            official=book[book_index]
            if test_identities(official.get_text())!={(exam,test)}:raise ValueError('Official physical counterpart belongs to another test')
            native=source_lines(page);regions,_=boundaries(native,page.rect.width,page.rect.height)
            other,_=boundaries(source_lines(official),official.rect.width,official.rect.height)
            coverage=uncovered_body_lines(page,regions);other_coverage=uncovered_body_lines(official,other)
            page_checks.append({'sourcePage':page.number+1,'bookPage':book_index+1,
                'sourceUncoveredNativeLines':coverage,'bookUncoveredNativeLines':other_coverage})
            for region in regions:
                number=region['number'];matches=[r for r in other if r['number']==number]
                result={'status':'COUNTERPART_OR_FULL_NATIVE_PAGE_COVERAGE_REVIEW_REQUIRED'}
                if len(matches)==1 and not coverage and not other_coverage:
                    # Require exactly the same rectangle; changing page layout
                    # cannot conceal a missing formula/figure via fuzzy alignment.
                    if region['bboxPt']==matches[0]['bboxPt']:result=compare_question(page,official,region['bboxPt'])
                    else:result={'status':'QUESTION_BOUNDARY_GEOMETRY_DIFFERS'}
                rows.append({'sourceCode':'mebi-'+sha[:12]+'-q'+str(number),'sourceSha256':sha,'printedNumber':number,
                    'sourcePage':page.number+1,'bookPage':book_index+1,'sourceRegionPt':region['bboxPt'],
                    'unverifiedPrintedBookAnswerCandidate':next(a['answer'] for a in answers if a['number']==number),
                    **result,'answerBindingAccepted':False,'questionContentAccepted':False,'teacherApproved':False})
    return {**base,'status':'INDIVIDUAL_SOURCE_EDITION_COMPARISON_COMPLETE_WITH_EXPLICIT_DIFFERENCES',
        'bodyNumberProof':numbers,'officialKeyPage':key['page'],'officialKeyBboxPt':key['bboxPt'],
        'officialNativePrintedAnswers':answers,'independentPrintedKeyReadingRequired':True,
        'pageCoverageChecks':page_checks,'states':dict(Counter(r['status'] for r in rows)),'questions':rows}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);original=root/'pdf-on-tarama/full-key-scan/separate-chemistry/progress.json'
    prior=read_json(original)
    if prior['status']!='SUPPORTED_OFFICIAL_BOOK_PASS_COMPLETE':raise ValueError('Original complete chemistry source edition comparison required')
    rows=[r for r in prior['results'] if r['status']=='BODY_CONTENT_OR_LAYOUT_DIFFERENCE_REVIEW_REQUIRED']
    folder=root/'pdf-on-tarama/chemistry-question-editions';folder.mkdir(exist_ok=True);results=[];hits=0
    readers={str(p):digest(p) for p in [Path(__file__),APP/'scripts/yks_pilot_sorular.py',APP/'scripts/yks_tam_ayri_anahtar.py',APP/'scripts/yks_ayri_anahtar.py']}
    def save(status):
        write_json(folder/'report.json',{'status':status,'scope':'INDIVIDUAL_IDENTICAL_CHEMISTRY_QUESTIONS_NOT_FULL_TEST_KEY_OR_QUESTION_ACCEPTANCE',
            'documents':len(rows),'completed':len(results),'pending':len(rows)-len(results),'cachedSourcesThisPass':hits,
            'states':dict(Counter(r['status'] for r in results)),
            'questionStates':dict(sum((Counter(r.get('states',{})) for r in results),Counter())),
            'sourceReportSha256':digest(original),'readerFiles':readers,'newModelCalls':0,'newOcrCalls':0,
            'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results})
    with process_lock(folder/'.writer.lock'),ExitStack() as stack:
        books={};indices={}
        for row in rows:
            book_path=row['officialBookPath'];book_sha=row['officialBookSha256'];exam=row['exam']
            if exam in books:continue
            if digest(book_path)!=book_sha:raise ValueError('Official chemistry book changed')
            books[exam]=stack.enter_context(pymupdf.open(book_path));indices[exam]=index_book(books[exam],exam)
        try:
            save('RUNNING')
            for row in rows:
                sha=row['sourceSha256'];file=folder/(sha+'.json');identity={'sourceSha256':sha,'officialBookSha256':row['officialBookSha256'],
                    'priorSourceComparisonSha256':signature(row),'readerFiles':readers,'rendererVersion':pymupdf.VersionBind,'dpis':DPIS}
                if digest(row['sourcePath'])!=sha:raise ValueError('Original chemistry diagnostic PDF changed')
                old=read_json(file) if file.is_file() else {}
                if old.get('identity')==identity:result=old['result'];hits+=1
                else:result=inspect(row,books[row['exam']],indices[row['exam']]);write_json(file,{'identity':identity,'result':result})
                results.append(result);save('RUNNING')
                if len(results)%10==0:print('Individual chemistry source editions',len(results),'/',len(rows),flush=True)
            save('COMPLETE')
        except BaseException:save('INTERRUPTED');raise
    report=read_json(folder/'report.json');print({k:v for k,v in report.items() if k not in ['results','readerFiles']})


if __name__=='__main__':main()
