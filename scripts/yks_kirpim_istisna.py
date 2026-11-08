"""Repair explicitly deferred diagnostic page layouts into separate source crops.

The original pilot/full preparation is immutable. Shared contexts stay deferred
until their actual source region is attached to every dependent question.
"""
import argparse
from collections import Counter
import copy
import hashlib
import importlib.util
import io
from pathlib import Path
import re
import unicodedata

import pymupdf
from PIL import Image
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP,plain
from yks_pilot_sorular import source_lines,boundaries,ANCHOR,OPTION,question_sequence
from yks_pilot_kirpim_kontrol import check_pixels,uncovered_body_lines
from yks_tam_kaynak_kontrol import verified_keys
from pdf_source_reconcile import text_fingerprint

VERSION='source-layout-repair-v1-full-width-and-column-extents'
SHARED=re.compile(r'\b\d+\s*(?:ve|[-–.]+)\s*\d+\s*\.?\s*sorular[ıi]',re.I)


def layout_regions(lines,width,height):
    left=[l for l in lines if ANCHOR.match(l['text']) and .07*height<l['bbox'][1]<.91*height and l['bbox'][0]<width*.18]
    if not left:raise ValueError('No reliable left question anchors')
    margin=min(l['bbox'][0] for l in left);left=[l for l in left if abs(l['bbox'][0]-margin)<=3]
    first=min(l['bbox'][1] for l in left)
    wide=any(l['bbox'][0]<width*.2 and l['bbox'][2]>width*.8 and first-4<=l['bbox'][1]<height*.91
        and not l['text'].startswith('>') for l in lines)
    if wide:
        left.sort(key=lambda l:l['bbox'][1]);regions=[]
        footer=min((l['bbox'][1]-4 for l in lines if l['bbox'][1]>height*.9 and
            any(term in re.sub(r'\s+','',plain(l['text'])) for term in ['ORTAOGRETIMGENELMUDURLUGU','MEBITARAMATESTLERI','DINOGRETIMIGENELMUDURLUGU'])),default=height*.93)
        right=[l for l in lines if ANCHOR.match(l['text']) and width*.5<l['bbox'][0]<width*.65 and .07*height<l['bbox'][1]<.91*height]
        split=next((l['bbox'][1] for l in left[1:] if any(abs(r['bbox'][1]-l['bbox'][1])<8
            and int(ANCHOR.match(r['text'])[1])==int(ANCHOR.match(l['text'])[1])+1 for r in right)),None)
        prefix=[l for l in left if split is None or l['bbox'][1]<split-1]
        for i,line in enumerate(prefix):
            end=prefix[i+1]['bbox'][1]-4.1 if i+1<len(prefix) else split-4.1 if split else footer
            regions.append({'number':int(ANCHOR.match(line['text'])[1]),'bboxPt':[margin-2,line['bbox'][1]-4,width-14,end],
                'column':0,'layout':'FULL_WIDTH_SOURCE_TEXT'})
        if split:
            lower=[l for l in lines if l['bbox'][1]>=split-3]
            tail,_=boundaries(lower,width,height)
            for row in tail:
                row['bboxPt'][2]=width-14 if row['column'] else width/2-1
                row['layout']='COLUMN_AFTER_FULL_WIDTH_PREFIX'
            return regions+tail,'FULL_WIDTH_PREFIX_THEN_TWO_COLUMNS'
        return regions,'FULL_WIDTH_SOURCE_TEXT'
    regions,_=boundaries(lines,width,height)
    for col in [0,1]:
        subset=sorted([r for r in regions if r['column']==col],key=lambda r:r['bboxPt'][1])
        anchors=[l['bbox'][1] for l in left] if col==0 else [r['anchor']['bbox'][1] for r in subset]
        for i,row in enumerate(subset):
            box=row['bboxPt']
            # Never pull a long page heading into an individual formula crop.
            header_bottom=max((l['bbox'][3] for l in lines if l['text'].startswith('>') and l['bbox'][1]<first),default=0)
            box[1]=max(box[1],header_bottom+.1) if header_bottom and header_bottom<row['anchor']['bbox'][1]-2 else box[1]
            box[2]=width-14 if col else width/2-1
            if i+1<len(subset):box[3]=subset[i+1]['bboxPt'][1]-.1
            row['layout']='COLUMN_SOURCE_EXTENTS'
    return regions,'COLUMN_SOURCE_EXTENTS'


def repair(source,original,out,visual_inside):
    sha=source['sourceSha256'];file=Path(source['sourcePath']);all_regions=[];modes={};shared=[]
    if digest(file)!=sha:raise ValueError('Original PDF changed before layout repair')
    with pymupdf.open(file) as pdf:
        for page in list(pdf)[:source['bodyPageCount']]:
            text=page.get_text()
            if SHARED.search(text):shared.append(page.number+1)
            regions,mode=layout_regions(source_lines(page),page.rect.width,page.rect.height);modes[page.number+1]=mode
            all_regions.extend({**r,'page':page.number+1} for r in regions)
        if shared:return {'sourceSha256':sha,'status':'SHARED_CONTEXT_REPAIR_STILL_REQUIRED','pages':shared,'questionBankWrites':0}
        question_sequence(all_regions,source['sourceAnswers']);cards=[];by_number={c['printedNumber']:c for c in original['cards']}
        for region in all_regions:
            number=region['number'];page=pdf[region['page']-1];box=pymupdf.Rect(region['bboxPt']);card=copy.deepcopy(by_number[number])
            text=page.get_text(clip=box).strip();options=Counter(OPTION.findall(text))
            if options!=Counter('ABCDE'):raise ValueError('Repaired region contains incomplete or neighboring options')
            key=signature([VERSION,sha,region['page'],list(box),pymupdf.VersionBind]);image=out/(card['code']+'.webp');stamp=out/(card['code']+'.crop.json')
            cached=read_json(stamp) if stamp.is_file() else {}
            if not image.is_file() or cached.get('key')!=key or digest(image)!=cached.get('sha256'):
                pixmap=page.get_pixmap(dpi=180,clip=box,alpha=False)
                with Image.open(io.BytesIO(pixmap.tobytes('png'))) as picture:picture.save(image,format='WEBP',lossless=True)
                write_json(stamp,{'key':key,'sha256':digest(image)})
            graphics,ink=visual_inside(page,box,source_lines(page));concerns=[]
            if '\ufffd' in text or any(unicodedata.category(c)=='Co' for c in text):concerns.append('NATIVE_GLYPH_REQUIRES_VISUAL_READING')
            card.update(pdfPage=region['page'],bboxPt=list(box),image=str(image.resolve()),imageSha256=digest(image),
                text=text,textSha256=hashlib.sha256(text.encode()).hexdigest(),textFingerprint=text_fingerprint(text),
                optionCounts=dict(options),containsGraphics=graphics,darkInkAfterMaskingText=ink,reviewConcerns=concerns,
                cropAcceptance='REPAIRED_LAYOUT_TECHNICAL_CHECK_ONLY',layout=region['layout'])
            cards.append(card)
        coverage=[];proofs=[]
        for number in sorted({c['pdfPage'] for c in cards}):
            coverage.append({'page':number,'uncoveredBodyLines':uncovered_body_lines(pdf[number-1],[c for c in cards if c['pdfPage']==number])})
        for card in cards:
            proof_key=signature([VERSION,sha,card['pdfPage'],card['bboxPt'],card['imageSha256'],pymupdf.VersionBind]);path=out/(proof_key+'.pixels.json')
            if not path.is_file():write_json(path,check_pixels(pdf[card['pdfPage']-1],card))
            value=read_json(path)
            if value['sourcePixelSha256']!=value['preparedPixelSha256']:raise ValueError('Repaired source pixels differ')
            proofs.append({'path':str(path),'sha256':digest(path)})
    if digest(file)!=sha:raise ValueError('Original PDF changed during layout repair')
    package={**original,'cards':cards,'extractorVersion':VERSION,'repairOfOriginalPackage':original['sourceSha256'],
        'questionBankWrites':0,'teacherApproved':False};package_file=out/'candidates.json';write_json(package_file,package)
    return {'sourceSha256':sha,'status':'REPAIRED_TECHNICAL_PREPARATION' if not any(p['uncoveredBodyLines'] for p in coverage) else 'SOURCE_COVERAGE_STILL_REVIEW_REQUIRED',
        'questions':len(cards),'pageLayouts':modes,'package':str(package_file),'packageSha256':digest(package_file),
        'bodyCoverage':coverage,'pixelProofs':proofs,'questionBankWrites':0,'teacherApproved':False}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId']);folder=root/'full-question-crop-repairs';folder.mkdir(exist_ok=True)
    existing=read_json(root/'full-question-crops/progress.json');sources={r['sourceSha256']:r for r in verified_keys(root)}
    selected=[r for r in existing['results'] if r['status']=='NATIVE_BODY_LINE_COVERAGE_REVIEW_REQUIRED'];results=[]
    spec=importlib.util.spec_from_file_location('pdf_metin',APP/'scripts/pdf-metin.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    with process_lock(folder/'.writer.lock'):
        for entry in selected:
            if digest(entry['package'])!=entry['packageSha256']:raise ValueError('Original deferred package changed')
            sha=entry['sourceSha256'];out=folder/sha[:16];out.mkdir(exist_ok=True)
            try:result=repair(sources[sha],read_json(entry['package']),out,module.visual_inside)
            except ValueError as exc:result={'sourceSha256':sha,'status':'SOURCE_LAYOUT_REPAIR_REVIEW_REQUIRED','reason':str(exc)}
            results.append(result)
            write_json(folder/'progress.json',{'status':'COMPLETE' if len(results)==len(selected) else 'RUNNING',
                'scope':'SEPARATE_REPAIR_OF_EIGHT_DEFERRED_SOURCE_LAYOUTS','states':dict(Counter(r['status'] for r in results)),
                'documents':len(selected),'completed':len(results),'originalSourceCropReportSha256':digest(root/'full-question-crops/progress.json'),
                'toolSha256':digest(Path(__file__)),'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':results})
            print(sha[:16],result['status'],flush=True)


if __name__=='__main__':main()
