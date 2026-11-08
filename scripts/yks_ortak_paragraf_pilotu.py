"""Keep a real shared passage linked to both numbered mock questions."""
from collections import Counter
import hashlib
import io
from pathlib import Path
import re

import pymupdf
from PIL import Image
from yks_birlestirme import Store,digest,signature,read_json,write_json
from yks_pilot_sorular import APP,source_lines,boundaries,OPTION
from yks_pilot_kaynaklari import plain

SOURCE='10fa50c7f88284b75880ed69af3a630d88c50810b3db22af16374c4a2268c3b6'


def render(page,box,path):
    pixmap=page.get_pixmap(dpi=180,clip=pymupdf.Rect(box),alpha=False)
    with Image.open(io.BytesIO(pixmap.tobytes('png'))) as image:image.save(path,'WEBP',lossless=True)
    return {'image':str(path),'imageSha256':digest(path),'bboxPt':list(box),
            'sourcePixelSha256':hashlib.sha256(pixmap.samples).hexdigest()}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    key_report=root/'pdf-on-tarama/mock-key-pilot/mock-key-report.json'
    source=next(r for r in read_json(key_report)['results'] if r['sourceSha256']==SOURCE)
    section=source['sections'][0]
    if section['status']!='TWO_PRINTED_SOURCE_READINGS_AGREE' or section['sectionId']!='TYT:1':
        raise ValueError('Verified Turkish mock section key required')
    file=Path(source['sourcePath'])
    if digest(file)!=SOURCE:raise ValueError('Mock source changed')
    folder=root/'pilot-riskleri/shared-passage';folder.mkdir(parents=True,exist_ok=True)
    with pymupdf.open(file) as pdf:
        page=pdf[15];lines=source_lines(page)
        cues=[line for line in lines if re.match(r'35\s*[-–]\s*36\.\s*sorular',line['text'],re.I)]
        if len(cues)!=1:raise ValueError('Shared question range missing or ambiguous')
        if not any('TURKCE TESTI' in plain(line['text']) for line in lines):raise ValueError('Mock body discipline differs from key column')
        regions,rejected=boundaries(lines,page.rect.width,page.rect.height)
        selected=[r for r in regions if r['number'] in (35,36)]
        if sorted(r['number'] for r in selected)!=[35,36]:raise ValueError('Both shared-passage question anchors required')
        first=next(r for r in selected if r['number']==35)
        box=[first['bboxPt'][0],cues[0]['bbox'][1]-4,first['bboxPt'][2],first['bboxPt'][1]-2]
        text=page.get_text(clip=pymupdf.Rect(box)).strip()
        if len(text)<300:raise ValueError('Shared passage content incomplete')
        context_id='mebi-context:'+SOURCE+':p16:35-36'
        context={'contextId':context_id,'sourceSha256':SOURCE,'pdfPage':16,'questionNumbers':[35,36],
            'text':text,'textSha256':hashlib.sha256(text.encode()).hexdigest(),
            **render(page,box,folder/'shared-35-36.webp')}
        answers={r['number']:r['answer'] for r in section['answers']};cards=[]
        for row in selected:
            qtext=page.get_text(clip=pymupdf.Rect(row['bboxPt'])).strip()
            if Counter(OPTION.findall(qtext))!=Counter('ABCDE'):raise ValueError('Shared-passage question lacks complete options')
            cards.append({'printedNumber':row['number'],'sectionId':'TYT:1','exam':'TYT','subjectId':'turkce',
                'contextIds':[context_id],'sourceKeyPage':source['sourceKeyPage'],'answer':answers[row['number']],
                'answerEvidenceSha256':section['keyEvidenceSha256'],'sourceSha256':SOURCE,'pdfPage':16,
                'text':qtext,**render(page,row['bboxPt'],folder/('q'+str(row['number'])+'.webp')),
                'importAccepted':False,'teacherApproved':False})
        if any(card['contextIds']!=[context_id] for card in cards):raise ValueError('Shared source premise was lost')
    report={'status':'PASS','scope':'REAL_SHARED_PASSAGE_SOURCE_AND_NUMBERING_PILOT',
        'sourceSha256':SOURCE,'printedMockNumber':source['printedMockNumber'],'keyReportSha256':digest(key_report),
        'context':context,'cards':cards,'questionBankWrites':0,'teacherApproved':False,
        'topicAssignment':'NOT_YET_VERIFIED','newQuestionsAccepted':0,'toolSha256':digest(Path(__file__))}
    write_json(folder/'shared-passage-report.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k not in ('cards','context')}))


if __name__=='__main__':main()
