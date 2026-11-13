"""Prepare only new source/pixel-verified questions; leave established IDs intact."""
import csv
import hashlib
import json
import shutil
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks_birlestirme import write_json


def run():
    publication=json.loads((BASE/'publication-preparation/publication-result.json').read_text(encoding='utf8'))
    if publication['status']!='PUBLISHED':raise ValueError('Pilot catalog publication must finish before next batch')
    proof=BASE/'single-test-crops/source-pixel-acceptance.json'
    accepted=json.loads(proof.read_text(encoding='utf8'))['accepted']
    cmd,env,_=db_connection('ivme');conn=(cmd,env,None)
    existing=set(json.loads(query(conn,"SELECT coalesce(json_agg(code),'[]') FROM questions WHERE bank='MEBI_PRACTICE_2'")))
    new=[row for row in accepted if row['code'] not in existing]
    folder=BASE/'verified-source-batch-001';folder.mkdir(exist_ok=True)
    metadata=[];images=[];rows=[]
    for row in new:
        if not row['productionImportAllowed'] or row['status']!='SOURCE_VERIFIED_READY_FOR_INSERT_ONLY':raise ValueError('Source admission missing')
        relative=f'mebi-pratik-2/{row["sourceSha256"][:20]}/{row["code"]}.png'
        target=APP/'veri/resimler-pilot'/relative;source=BASE/row['image']
        if hashlib.sha256(source.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Verified crop changed')
        target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():
            if hashlib.sha256(target.read_bytes()).hexdigest()!=row['imageSha256']:raise ValueError('Image collision')
        else:shutil.copyfile(source,target)
        title=f'MEBİ {row["exam"]} {row["subject"]} Tarama {row["testNumber"]}'
        images.append({'code':row['code'],'relative':relative,'sha256':row['imageSha256']})
        rows.append([row['code'],row['exam'],row['subject'],row['topic'],title,relative,row['answer'],5,'true','MEBI_PRACTICE_2'])
        metadata.append({'kind':'QUESTION','code':row['code'],'exam':row['exam'],'subject':row['subject'],
            'topic':row['topic'],'categoryIds':[row['categoryId']],'bank':'MEBI_PRACTICE_2','active':True,
            'available':True,'image':relative,'source':title,'title':title+f' — {row["printedNumber"]}',
            'locations':{row['categoryId']:[{'type':'PDF','sourceKey':'pdf:'+row['sourceSha256'],
                'pdfPageStart':row['bodyPage'],'pdfPageEnd':row['bodyPage'],'pageCount':row['keyPage']}]}})
    csv_path=folder/'insert-only.csv'
    with csv_path.open('w',encoding='utf8',newline='') as stream:
        writer=csv.writer(stream);writer.writerow(['code','exam_type','subject','topic','source','image','correct_answer','choice_count','active','bank']);writer.writerows(rows)
    write_json(folder/'resource-inputs.json',metadata)
    before=json.loads(query(conn,"""SELECT json_build_object('questions',count(*),
        'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code)),
        'catalogRun',(SELECT run_key FROM learning_catalog.current_run)) FROM questions"""))
    backup=json.loads((BASE/'publication-preparation/report.json').read_text(encoding='utf8'))
    report={'status':'VERIFIED_SOURCE_BATCH_PREPARED','sourceRows':len(new),'images':images,
        'csvSha256':hashlib.sha256(csv_path.read_bytes()).hexdigest(),'before':before,
        'databaseBackup':backup['databaseBackup'],'sourceAcceptanceSha256':hashlib.sha256(proof.read_bytes()).hexdigest(),
        'alreadyImportedSourceCodes':len(accepted)-len(new),'questionWrites':0}
    write_json(folder/'report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k not in ('images','databaseBackup')}))


if __name__=='__main__':run()
