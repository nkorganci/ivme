"""Preview low-text bank images from their exact provider-ID PDF positions."""
import hashlib
import json
import re

import pymupdf

from kaynakli_arastirma_db import db_connection,query
from pdf_source_scan import APP,OUT,ROOT,read_scan,write_json


def main():
    candidates=json.loads((OUT/'low-text-bank-images.json').read_text(encoding='utf-8'))
    connection=db_connection('ivme')
    repairs=[]
    for row in candidates:
        if not re.fullmatch(r'sb-\d+',row['code']):raise ValueError('Invalid provider question identity')
        locations=json.loads(query(connection,"""SELECT coalesce(json_agg(x),'[]') FROM(
          SELECT o.source_sha256,o.page_number,o.printed_numbers,min(f.relative_path) path,min(c.catalog_id) catalog_id
          FROM learning_catalog.pdf_question_occurrences o JOIN learning_catalog.pdf_source_files f USING(source_sha256)
          JOIN learning_catalog.pdf_source_catalog c USING(source_sha256)
          WHERE o.question_code='"""+row['code']+"' AND o.evidence->>'origin'='PROVIDER_ID_PRINTED_SEQUENCE_AND_ANSWER' GROUP BY o.source_sha256,o.page_number,o.printed_numbers) x"))
        if not locations:continue
        location=locations[0];sha=location['source_sha256'];number=location['printed_numbers'][0]
        page=read_scan(sha)['pages'][location['page_number']-1]
        marker=next(a for a in page['examples'] if a['number']==number and a['text'].startswith('Soru '))
        x0,y0,_,_=marker['bbox'];mid=page['width']/2;right=x0>mid
        following=[a['bbox'][1] for a in page['examples'] if a['text'].startswith('Soru ')
                   and (a['bbox'][0]>mid)==right and a['bbox'][1]>y0+3]
        bottom=min(following)-2 if following else page['height']*.945
        box=[mid+3 if right else 24,y0-2,page['width']-24 if right else mid-3,bottom]
        path=ROOT/location['path']
        with path.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=sha:raise ValueError('Source PDF changed')
        output=OUT/'empty-question-previews'/(row['code']+'.png');output.parent.mkdir(parents=True,exist_ok=True)
        with pymupdf.open(path) as document:document[location['page_number']-1].get_pixmap(clip=pymupdf.Rect(box),matrix=pymupdf.Matrix(2.5,2.5),alpha=False).save(output)
        original=APP/'veri/resimler-pilot'/row['image']
        repairs.append({'code':row['code'],'oldImage':row['image'],'oldImageSha256':hashlib.sha256(original.read_bytes()).hexdigest(),
                        'source':location,'bbox':box,'preview':output.relative_to(APP).as_posix(),
                        'previewSha256':hashlib.sha256(output.read_bytes()).hexdigest(),'status':'SOURCE_CROP_REVIEW_REQUIRED'})
    write_json(OUT/'empty-question-repair-preview.json',{'records':repairs})
    print(json.dumps({'previews':len(repairs)}),flush=True)


if __name__=='__main__':main()
