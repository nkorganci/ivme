"""Prepare original-pixel single-test crops for visual review, not publication."""
import argparse
import hashlib
import json
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE,SOURCE
from yks_birlestirme import write_json


def run(limit, output_name='single-test-crop-pilot'):
    documents=json.loads((BASE/'single-test-bindings.json').read_text(encoding='utf8'))['documents'][:limit]
    if output_name not in {'single-test-crop-pilot','single-test-crops'}:
        raise ValueError('Unsupported evidence output directory')
    output=BASE/output_name;output.mkdir(exist_ok=True)
    rows=[]
    for document in documents:
        source=SOURCE/document['relativePath']
        with source.open('rb') as stream:
            if hashlib.file_digest(stream,'sha256').hexdigest()!=document['sourceSha256']:
                raise ValueError('Source bytes changed')
        with pymupdf.open(source) as pdf:
            for question in document['questions']:
                body=question['body'];page=pdf[body['page']-1];mid=page.rect.width/2
                column=int(body['bbox'][0]>=mid)
                following=[q['body']['bbox'][1] for q in document['questions']
                    if q['body']['page']==body['page'] and int(q['body']['bbox'][0]>=mid)==column
                    and q['body']['bbox'][1]>body['bbox'][1]+2]
                clip=pymupdf.Rect(mid if column else 0,max(0,body['bbox'][1]-5),
                    page.rect.width if column else mid,min(following)-5 if following else page.rect.height-25)
                stem=document['sourceSha256'][:20]+'-q'+str(question['printedNumber'])
                image=output/(stem+'.png')
                if not image.exists():page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=clip,alpha=False).save(image)
                key=question['key'];keypage=pdf[key['page']-1]
                keyclip=pymupdf.Rect(key['bbox']);keyclip+=(-6,-6,6,6);keyclip&=keypage.rect
                keyimage=output/(stem+'-key.png')
                if not keyimage.exists():keypage.get_pixmap(matrix=pymupdf.Matrix(3,3),clip=keyclip,alpha=False).save(keyimage)
                rows.append({'sourceSha256':document['sourceSha256'],'relativePath':document['relativePath'],
                    'testNumber':document['testNumber'],'printedNumber':question['printedNumber'],
                    'bodyPage':body['page'],'bodyClip':list(clip),'keyPage':key['page'],'keyClip':list(keyclip),
                    'answer':key['answer'],'image':str(image.relative_to(BASE)),
                    'keyImage':str(keyimage.relative_to(BASE)),
                    'imageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
                    'keyImageSha256':hashlib.sha256(keyimage.read_bytes()).hexdigest(),
                    'status':'VISUAL_CROP_AND_TOPIC_REVIEW_REQUIRED','studentVisible':False})
    write_json(output/'manifest.json',{'status':'PILOT_CROPS_PREPARED','crops':rows,'acceptedQuestions':0})
    print(json.dumps({'pilotDocuments':len(documents),'cropPairs':len(rows),'acceptedQuestions':0}))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=1)
    parser.add_argument('--output-name',default='single-test-crop-pilot')
    args=parser.parse_args();run(args.limit,args.output_name)
