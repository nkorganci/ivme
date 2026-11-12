"""Prepare reviewed pilot assets and a current backup; does not import/publish."""
import argparse
import csv
import hashlib
import json
import shutil
from pathlib import Path
from mebi_pratik2_tam_pdf_tarama import APP,BASE
from kaynakli_arastirma_db import db_connection,query
from yks11_gecis import make_dump
from yks_birlestirme import write_json


def digest(path):
    with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()


def run(backup=False):
    package=BASE/'single-test-crop-pilot/reviewed-package.json'
    proof=BASE/'single-test-crop-pilot/second-reading/report.json'
    pack=json.loads(package.read_text(encoding='utf8'))
    if json.loads(proof.read_text(encoding='utf8'))['status']!='PASS':raise ValueError('Second answer reading required')
    out=BASE/'publication-preparation';out.mkdir(exist_ok=True)
    image_root=APP/'veri/resimler-pilot';images=[];rows=[]
    for item in pack['items']:
        source=BASE/item['image']
        if digest(source)!=item['imageSha256']:raise ValueError('Reviewed crop changed')
        relative=f'mebi-pratik-2/{item["sourceSha256"][:20]}/{item["code"]}.png'
        target=image_root/relative;target.parent.mkdir(parents=True,exist_ok=True)
        if target.exists():
            if digest(target)!=item['imageSha256']:raise ValueError('Publication image collision')
        else:shutil.copyfile(source,target)
        images.append({'code':item['code'],'relative':relative,'sha256':digest(target)})
        rows.append([item['code'],item['exam'],'Biyoloji',item['topic'],
            'MEBİ AYT Biyoloji Tarama Testi 7',relative,item['answer'],5,'true',item['bank']])
    target=out/'insert-only.csv'
    with target.open('w',encoding='utf8',newline='') as stream:
        writer=csv.writer(stream);writer.writerow(['code','exam_type','subject','topic','source','image','correct_answer','choice_count','active','bank']);writer.writerows(rows)
    report={'status':'ASSETS_PREPARED_NOT_IMPORTED','images':images,'csvSha256':digest(target),
        'sourcePackageSha256':digest(package),'secondReadingSha256':digest(proof),'questionWrites':0}
    if backup:
        cmd,env,_=db_connection('ivme')
        before=json.loads(query((cmd,env,None),"""SELECT json_build_object('questions',count(*),
            'fingerprint',md5(string_agg(code||':'||extract(epoch from updated_at)::text,'|' ORDER BY code)),
            'catalogRun',(SELECT run_key FROM learning_catalog.current_run)) FROM questions"""))
        report['before']=before
        write_json(out/'backup-start.json',{'status':'RUNNING','before':before})
        report['databaseBackup']=make_dump(cmd,env,out/'ivme-before-mebi2.dump')
    write_json(out/'report.json',report)
    print(json.dumps({k:v for k,v in report.items() if k!='images'}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--backup',action='store_true');args=parser.parse_args()
    run(args.backup)
