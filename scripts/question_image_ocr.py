"""Read missing YKS question text from preserved bank images with local cached OCR."""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import csv
import hashlib
import json
from pathlib import Path
import subprocess

from PIL import Image
import pymupdf

from kaynakli_arastirma_db import db_connection,query
from pdf_ocr_cache import model_hash
from pdf_source_scan import APP,OUT,write_json

VERSION='question-tur-ocr-v1'


def read_image(job):
    filename,image_sha,model_sha=job
    target=OUT/'question-image-ocr'/f'{image_sha}-{model_sha[:16]}-{VERSION}.json'
    if target.exists():return json.loads(target.read_text(encoding='utf-8'))
    path=Path(filename)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=image_sha:raise ValueError('Question image changed')
    pymupdf.TOOLS.mupdf_display_errors(False)
    with Image.open(path) as image:
        rgb=image.convert('RGB')
        pix=pymupdf.Pixmap(pymupdf.csRGB,rgb.width,rgb.height,rgb.tobytes(),False)
    with pymupdf.open('pdf',pix.pdfocr_tobytes(language='tur',tessdata=str(APP/'veri/tessdata'))) as recognized:
        page=recognized[0];text=page.get_text()
        lines=[{'text':block[4],'bbox':list(block[:4])} for block in page.get_text('blocks')]
    result={'imageSha256':image_sha,'modelSha256':model_sha,'extractorVersion':VERSION,
            'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),'blocks':lines,
            'status':'EXTRACTED' if sum(c.isalpha() for c in text)>=30 else 'VISUAL_REVIEW_REQUIRED',
            'contentVerified':False}
    write_json(target,result)
    return result


def publish(connection,observations):
    if query(connection,"SELECT to_regclass('learning_catalog.question_content_observations') IS NOT NULL")!='t':
        raise ValueError('V86 is required before publishing image observations')
    path=OUT/'publish-question-observations.sql'
    with path.open('w',encoding='utf-8',newline='') as stream:
        stream.write('BEGIN;\nCREATE TEMP TABLE incoming_question_observations(code text,image_sha char(64),version text,model_sha char(64),data jsonb) ON COMMIT DROP;\nCOPY incoming_question_observations FROM STDIN WITH (FORMAT csv);\n')
        writer=csv.writer(stream,lineterminator='\n')
        for code,stamp,result in observations:
            writer.writerow([code,result['imageSha256'],result['extractorVersion'],result['modelSha256'],json.dumps({**result,'questionStamp':stamp},ensure_ascii=False)])
        stream.write("\\.\nINSERT INTO learning_catalog.question_content_observations(question_code,source_image_sha256,extractor_version,model_sha256,observations) SELECT i.code,i.image_sha,i.version,i.model_sha,i.data FROM incoming_question_observations i JOIN questions q ON q.code=i.code AND extract(epoch FROM q.updated_at)::text=i.data->>'questionStamp' WHERE q.exam_type IN ('TYT','AYT') ON CONFLICT(question_code,source_image_sha256,extractor_version,model_sha256) DO UPDATE SET observations=excluded.observations;\nCOMMIT;\n")
    command,env,_=connection
    with path.open(encoding='utf-8') as stream:
        result=subprocess.run([*command,'--quiet'],stdin=stream,env=env,capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise RuntimeError(result.stderr)
    print(f'Published {len(observations)} question image observations.',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--workers',type=int,default=2);parser.add_argument('--publish',action='store_true');args=parser.parse_args()
    connection=db_connection('ivme');model_sha=model_hash()
    rows=json.loads(query(connection,"SELECT json_agg(x) FROM (SELECT code,image,extract(epoch FROM updated_at)::text stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT')) x"))
    originals={r['code']:r.get('original',{}).get('text','') for r in json.loads((APP/'veri/content-labels/source-inventory.json').read_text(encoding='utf-8'))['questions']}
    fingerprints={r['code']:r for r in json.loads((OUT/'bank-image-fingerprints.json').read_text(encoding='utf-8'))['images'] if not r['error']}
    selected=[r for r in rows if sum(c.isalpha() for c in originals.get(r['code'],''))<60]
    observations=[];jobs={};cached=0
    for row in selected:
        fp=fingerprints[row['code']]
        target=OUT/'question-image-ocr'/f'{fp["fileSha256"]}-{model_sha[:16]}-{VERSION}.json'
        if target.exists():observations.append((row['code'],row['stamp'],json.loads(target.read_text(encoding='utf-8'))));cached+=1
        else:jobs[row['code']]=(row,(str(APP/'veri/resimler-pilot'/row['image']),fp['fileSha256'],model_sha))
    failures=[]
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures={pool.submit(read_image,job):(code,row) for code,(row,job) in jobs.items()}
        for future in as_completed(futures):
            code,row=futures[future]
            try:observations.append((code,row['stamp'],future.result()))
            except Exception as error:failures.append({'code':code,'error':str(error)})
            if (len(observations)-cached+len(failures))%100==0:
                print(f'Question image OCR: {len(observations)-cached}/{len(jobs)} new, {cached} cached, {len(failures)} failures',flush=True)
    snapshot=hashlib.sha256(json.dumps(sorted((r['code'],r['stamp'],fingerprints[r['code']]['fileSha256']) for r in rows),separators=(',',':')).encode()).hexdigest()
    write_json(OUT/'question-image-ocr-report.json',{'selected':len(selected),'observed':len(observations),'cached':cached,
        'bankSnapshotSha256':snapshot,'modelSha256':model_sha,'failures':failures})
    if args.publish:publish(connection,observations)


if __name__=='__main__':main()
