"""Supplement the single missing bank text using its actually read original image.

This evidence never edits the bank or replaces the original comparison report.
Only the missing bank question is compared, not all 80,230 questions again.
"""
from pathlib import Path

from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_soru_pilotu import APP,live_bank
from yks_konu_girdileri import load_bound_cards
from yks_soru_yenilik_kontrol import same_content

IMAGE='6cbf2baf7d1146a5416c85f933da84db68f8c2e11c1e60b9dbf18f2c560a17e5'
TEXT=('Pozitif elektrik yükü ile yüklenmiş elektroskopun topuzuna negatif yüklü iletken bir cisim dokundurulduğunda elektroskop yapraklarında,\n'
 'I. Biraz kapanma\nII. Tamamen kapanma\nIII. Önce tamamen kapanıp sonra tekrar açılma\n'
 'olaylarından hangileri gözlenebilir?\nA) Yalnız I\nB) I ve II\nC) I ve III\nD) II ve III\nE) I, II ve III')


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'full-question-topics/din'
    source=folder/'secondary-bank-comparison.json';report=read_json(source);missing=report['questionsWithoutUsableText']
    if len(missing)!=1 or missing[0]['code']!='sb-83612':raise ValueError('Actually read missing bank image scope changed')
    bank,_=live_bank(APP);bank_sha=signature(bank)
    if bank_sha!=report['bankSnapshotSha256']:raise ValueError('Source/bank comparison is stale')
    current=next(q for q in bank if q['code']=='sb-83612');image=APP/'veri/resimler-pilot'/current['image']
    if digest(image)!=IMAGE or current['stamp']!=missing[0]['stamp']:raise ValueError('Actually viewed original bank image changed')
    cards=load_bound_cards(read_json(folder/'topic-candidates.json'));results=[]
    for row in report['results']:
        card=cards[row['sourceCode']]
        if card['textSha256']!=row['sourceTextSha256'] or digest(card['image'])!=row['sourceImageSha256']:
            raise ValueError('Source question version changed')
        results.append({'sourceCode':card['code'],'sourceSha256':card['sourceSha256'],
            'sourceTextSha256':card['textSha256'],'additionalBankCode':current['code'],
            'exactStemAndAllOptions':same_content(card['text'],TEXT),
            'newQuestionAdmissionAccepted':False,'teacherApproved':False})
    output={'status':'PASS','scope':'ONE_CURRENT_BANK_IMAGE_TEXT_SUPPLEMENT_FOR_1094_ALREADY_COMPARED_DIN_QUESTIONS',
        'baseComparisonSha256':digest(source),'bankSnapshotSha256':bank_sha,'bankQuestion':current,
        'bankImagePath':str(image),'bankImageSha256':IMAGE,'actualOriginalImageRead':True,
        'originalImageReadMethod':'EXECUTING_AGENT_READ_ORIGINAL_AND_MAGNIFIED_PIXEL_CROP',
        'text':TEXT,'textSha256':signature(TEXT),'textProvenance':'ACTUAL_ORIGINAL_IMAGE_TRANSCRIPTION_FOR_COMPARISON_ONLY',
        'bankQuestionsRepresentedByOriginalTextOrThisImage':report['bankQuestionsWithUsableText']+1,
        'sourceQuestionsComparedToAdditionalBankImage':len(results),
        'additionalExactCandidates':sum(bool(r['exactStemAndAllOptions']) for r in results),
        'deferredSourceQuestions':report['deferredSourceQuestions'],'results':results,'toolSha256':digest(Path(__file__)),
        'canonicalTextOrAnswerWritten':False,'newOcrCalls':0,'newModelCalls':0,'questionBankWrites':0,'teacherApproved':False}
    after,_=live_bank(APP)
    if signature(after)!=bank_sha:raise ValueError('Current bank changed during incremental image text comparison')
    write_json(folder/'bank-image-text-supplement.json',output)
    print({k:v for k,v in output.items() if k not in ['results','text','deferredSourceQuestions']})


if __name__=='__main__':main()
