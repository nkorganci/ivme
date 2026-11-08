"""Persist the actual whole-document reading of one unkeyed summary question."""
from pathlib import Path
import pymupdf
from yks_birlestirme import Store,read_json,write_json,digest
from yks_pilot_kaynaklari import APP

SOURCE='e33b5672c0fb21b1cc124560ef6e59d3dd5fe0e26266a5a8d012897f20d9ee26'
IMAGES={1:'9ee6336fcbcd6e2481dcf0932d375ccd19254ce77406b93f997bfb50790227a5',
    2:'f48e70261f44003f05656eb5c63cd11026bffe4ff6c7c572093461cbf494dde1'}


def review(root):
    original=next(r for r in read_json(root/'new-source-discovery/scoped-report.json')['results'] if r['sourceSha256']==SOURCE)
    source=Path(original['sourcePath'])
    if digest(source)!=SOURCE:raise ValueError('Actually read summary PDF changed')
    pages=[]
    with pymupdf.open(source) as doc:
        if len(doc)!=2:raise ValueError('All actually read summary pages required')
        for number,expected in IMAGES.items():
            image=root/'new-source-discovery/document-review'/('e33b5672-page'+str(number)+'.png')
            if digest(image)!=expected:raise ValueError('Actually viewed whole-page image changed')
            pages.append({'physicalPage':number,'imagePath':str(image),'imageSha256':expected,
                'reading':'Literature overview, period chart, one unnumbered unkeyed multiple-choice panel.' if number==1 else
                    'Literary/instructional text-type and Turkish language-period charts; no answer table or solution to page1 question.',
                'method':'EXECUTING_AGENT_VIEWED_COMPLETE_ORIGINAL_PAGE_AT_130_DPI'})
        spans=[s for b in doc[0].get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']
            if any(c in s['text'] for c in ['Altın Yaruk','Atabetü’l Hakayık','Sekiz Yükmek','Göktürk Kitabeleri','Alp Er Tunga Sagusu'])]
        if len(spans)!=5 or {s['color'] for s in spans}!={2301728}:raise ValueError('Actual five unmarked source option colors changed')
    return {'sourceSha256':SOURCE,'sourcePath':str(source),'status':'WHOLE_SUMMARY_READ_QUESTION_HAS_NO_EXPLICIT_PRINTED_ANSWER_IN_THIS_PDF',
        'pageCount':2,'pagesRead':pages,'detectedQuestions':1,'sourceQuestionNumber':None,
        'newIntakeQuestionsEligible':0,'archiveDocumentPreserved':True,
        'noKeyConclusionScope':'ONLY_THESE_TWO_HASH_BOUND_PDF_PAGES_NOT_OTHER_ARCHIVE_SOURCES',
        'globalKeyAbsenceClaimed':False,'documentFolderTopicCopiedToQuestion':False,
        'action':'KEEP_SUMMARY_RESOURCE_EXCLUDE_UNKEYED_QUESTION_FROM_NEW_INTAKE_DO_NOT_INFER_AN_ANSWER',
        'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);row=review(root)
    report={'status':'PASS','scope':'ONE_ACTUALLY_VIEWED_TWO_PAGE_DOCUMENT_ONLY','documents':1,
        'unkeyedQuestionsExcludedFromNewIntake':1,'questionBankWrites':0,'teacherApproved':False,'results':[row]}
    write_json(root/'new-source-discovery/explicit-document-review.json',report)
    print({k:v for k,v in report.items() if k!='results'})


if __name__=='__main__':main()
