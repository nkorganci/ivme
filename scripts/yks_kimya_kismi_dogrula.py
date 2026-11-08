"""Read back every partial chemistry key/package/source proof, without redoing OCR."""
from pathlib import Path
from yks_birlestirme import Store,read_json,write_json,digest
from yks_pilot_kaynaklari import APP
from yks_kimya_kismi_anahtar import validate_prepared_source


def main():
    store=Store(APP/'veri/yks-birlestirme');root=store.child(store.current()['runId']);folder=root/'partial-chemistry-preparation'
    file=folder/'progress.json';report=read_json(file)
    if report['status']!='COMPLETE':raise ValueError('Wait for complete original partial source preparation')
    checked=[]
    for row in report['results']:
        if row['status']!='PREPARED':continue
        count=validate_prepared_source(row)
        checked.append({'sourceSha256':row['sourceSha256'],'questions':count,'packageSha256':row['packageSha256'],
            'status':'CURRENT_SOURCE_KEY_PACKAGE_AND_ORIGINAL_PIXEL_PROOFS_REVALIDATED','fullTestAccepted':False,'teacherApproved':False})
    if sum(r['questions'] for r in checked)!=report['questionsPrepared']:raise ValueError('Partial source count differs from original preparation')
    output={'status':'PASS','sourcePreparationSha256':digest(file),'sourceDocuments':len(checked),'questions':sum(r['questions'] for r in checked),
        'newModelCalls':0,'newOcrCalls':0,'newRenders':0,'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,
        'validatorSha256':digest(APP/'scripts/yks_kimya_kismi_anahtar.py'),'toolSha256':digest(Path(__file__)),'results':checked}
    write_json(folder/'current-source-verification.json',output);print({k:v for k,v in output.items() if k!='results'})


if __name__=='__main__':main()
