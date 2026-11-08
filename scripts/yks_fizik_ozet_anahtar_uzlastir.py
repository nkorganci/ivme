"""Join three immutable printed-region readings; never bind unenumerated bodies."""
from collections import Counter
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest
from yks_pilot_kaynaklari import APP


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);inputs={}
    def load(relative):
        file=root/relative;inputs[str(file)]=digest(file);return read_json(file)
    base=load('physics-summary-key-readings/report.json');actual=load('physics-summary-key-actual-review/report.json');retry=load('physics-summary-native-key-readings/report.json')
    if base['status']!='COMPLETE' or retry['status']!='COMPLETE' or actual['status']!='PASS':raise ValueError('Complete actual source-region readings required')
    parent_sha=inputs[str(root/'physics-summary-key-readings/report.json')]
    if actual['sourceReportSha256']!=parent_sha or retry['originalSummaryKeyReportSha256']!=parent_sha:raise ValueError('Original 75-key source scope changed')
    if actual['nativeHeadingRetryReportSha256']!=inputs[str(root/'physics-summary-native-key-readings/report.json')]:raise ValueError('Actual native-key retry changed')
    readings={};methods={};gaps=set();highlights=set()
    def add(sha,rows,method):
        if sha in readings and readings[sha]!=rows:raise ValueError('Actual accepted printed-region readings disagree')
        if not rows or len({r['number'] for r in rows})!=len(rows) or any(r['answer'] not in list('ABCDE') for r in rows):raise ValueError('Invalid actual source-region cells')
        readings[sha]=rows;methods.setdefault(sha,[]).append(method)
    for report in [base,retry]:
        for row in report['results']:
            if row.get('cropPath') and digest(row['cropPath'])!=row['cropSha256']:raise ValueError('Printed source strip changed')
            for name in ['evidence','stripOcrEvidence']:
                if row.get(name+'Path') and digest(row[name+'Path'])!=row[name+'Sha256']:raise ValueError('Immutable source reading changed')
            if row['status']=='ORIGINAL_KEY_STRIP_OCR_AND_LOCAL_VISION_AGREE_BODY_ENUMERATION_REQUIRED':
                if row['stripOcrReading']!=row['independentPrintedReading']:raise ValueError('OCR/visual source reading disagreement')
                add(row['sourceSha256'],row['stripOcrReading'],'ACTUAL_ORIGINAL_STRIP_OCR_AND_QWEN_AGREE')
    for row in actual['results']:
        if digest(row['viewedBoardPath'])!=row['viewedBoardSha256']:raise ValueError('Actually viewed source image changed')
        if row.get('cropPath') and digest(row['cropPath'])!=row['cropSha256']:raise ValueError('Actually viewed source strip changed')
        if row['actualPrintedAnswers']:add(row['sourceSha256'],row['actualPrintedAnswers'],'ACTUAL_ORIGINAL_SOURCE_IMAGE_CONTENT_READING')
        if not row['contiguousPrintedNumbers']:gaps.add(row['sourceSha256'])
        if row.get('sourceHighlightsRequireBodyReview'):highlights.add(row['sourceSha256'])
    if {r['sourceSha256'] for r in base['results']}!=set(readings):raise ValueError('Every original source must retain an explicit printed-region disposition')
    rows=[]
    for source in base['results']:
        sha=source['sourceSha256']
        if digest(source['sourcePath'])!=sha:raise ValueError('Original source summary changed')
        answers=readings[sha];numbers=[r['number'] for r in answers];contiguous=numbers==list(range(1,len(numbers)+1))
        if (sha in gaps)==contiguous:raise ValueError('Printed gap disposition differs from original source numbers')
        rows.append({'sourceSha256':sha,'sourcePath':source['sourcePath'],
            'status':'PRINTED_REGION_READ_BODY_ENUMERATION_AND_SCOPE_STILL_REQUIRED' if contiguous else 'ORIGINAL_PRINTED_NUMBER_GAP_NO_RENUMBER_OR_QUESTION_BINDING',
            'printedRegionAnswers':answers,'sourceReadingMethods':methods[sha],'contiguousPrintedNumbers':contiguous,
            'sourceHighlightsRequireBodyReview':sha in highlights,'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,
            'newQuestionAdmissionAccepted':False,'fineTopicAccepted':False,'teacherApproved':False})
    if any(digest(p)!=sha for p,sha in inputs.items()):raise ValueError('Printed key evidence changed during reconciliation')
    out=root/'physics-summary-effective-key-regions/report.json'
    write_json(out,{'status':'COMPLETE','scope':'ALL_75_SUMMARY_PRINTED_REGIONS_READ_NOT_FULL_SOURCE_BODY_OR_ANSWER_BINDING',
        'documents':len(rows),'completed':len(rows),'pending':0,'states':dict(Counter(r['status'] for r in rows)),
        'readPrintedRegionCells':sum(len(r['printedRegionAnswers']) for r in rows),
        'readContiguousRegionCells':sum(len(r['printedRegionAnswers']) for r in rows if r['contiguousPrintedNumbers']),
        'inputs':inputs,'results':rows,'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,
        'sourceQuestionAnswersBound':False,'wholeSourceKeyCompletenessAccepted':False,'newQuestionAdmissionAccepted':False,'teacherApproved':False,'toolSha256':digest(Path(__file__))})
    print({k:v for k,v in read_json(out).items() if k not in ['inputs','results']})


if __name__=='__main__':main()
