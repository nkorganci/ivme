"""Keep the actually viewed pending mock contradiction out of new admission."""
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest,signature
from yks_pilot_kaynaklari import APP

CODE='mebi-mock-594b7ed3f474-s3-q4'
NEW_SHA='25fa2e34781234475493881fed189b6d208f60d8cf8f2c050212225449ef0dbe'
OLD_SHA='01e0181dfd89dbb83fe66ed6efd01f7cc2bbc9816f908792593deb1ed3b7b7cd'


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'pending-source-reuse';base=folder/'report.json';report=read_json(base)
    row=next(r for r in report['results'] if r['sourceCode']==CODE)
    if len(row['oldPendingRelations'])!=2:raise ValueError('Actual pending duplicate source set changed')
    new=root/'full-mock-bodies/594b7ed3f4745749'/(CODE+'.webp');images=[{'code':CODE,'path':str(new),'sha256':NEW_SHA}]
    for code,answer in [('md-ayt-esit-agirlik-22-04','C'),('md-ayt-sayisal-21-04','A')]:
        relation=next(r for r in row['oldPendingRelations'] if r['oldSourceCode']==code)
        if relation['oldSourceAnswer']!=answer or relation['preparedSourceAnswer']!='A':raise ValueError('Actual pending source answer version changed')
        name='md-ayt-esit-agirlik' if 'esit' in code else 'md-ayt-sayisal'
        path=APP.parent/'icerik/data/ogm/img'/name/(code+'.webp');images.append({'code':code,'path':str(path),'sha256':OLD_SHA})
    for image in images:
        if digest(image['path'])!=image['sha256']:raise ValueError('Actually read source question image changed')
    output={'status':'ACTUALLY_VIEWED_SAME_QUESTION_WITH_OLD_PENDING_ANSWER_CONFLICT_KEEP_EXCLUDED',
        'sourceSha256':row['sourceSha256'],'sourceCode':CODE,'sourceReportSha256':digest(base),
        'sourceImageReadings':images,'actualImageReadingMethod':'EXECUTING_AGENT_VIEWED_THREE_ACTUAL_SOURCE_IMAGES',
        'sourceReading':'Üç görüntüde x/y gerçek sayılar, p:x²−4<0, q:x·y<0, r:x²·y>0, (p∧q′)⇒r yanlış koşulu ve x²−4x tam sayı kökü aynıdır. A-E 12/11/10/9/8 seçenekleri aynı sıradadır. Eski iki görüntünün SHA’sı aynıdır ve altta sonraki soru5 başlangıcı vardır; yeni kırpım yalnız soru4’tür.',
        'originalPendingRelations':row['oldPendingRelations'],'oldCropRequiresRecropBeforeAnyFutureAdmission':True,
        'newQuestionAdmissionAllowed':False,'oldCanonicalOrPendingIdsPreserved':True,'printedAnswerConflictResolved':False,
        'teacherApproved':False,'sourceWrites':0,'questionBankWrites':0,'toolSha256':digest(Path(__file__))}
    write_json(folder/'actual-pending-image-review.json',output);print({k:v for k,v in output.items() if k not in ['sourceImageReadings','originalPendingRelations','sourceReading']})


if __name__=='__main__':main()
