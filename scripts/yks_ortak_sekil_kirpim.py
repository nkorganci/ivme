"""Attach the same original population-pyramid context to two source questions.

Self-contained images contain only original rendered source pixels and white
spacing; source text/diagrams are never redrawn or solved by a model.
"""
import copy
import hashlib
from pathlib import Path

import pymupdf
from PIL import Image
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_kaynaklari import APP
from yks_tam_kaynak_kontrol import verified_keys
from yks_pilot_sorular import source_lines
from yks_pilot_kirpim_kontrol import check_pixels,uncovered_body_lines
from pdf_source_reconcile import text_fingerprint

SOURCE='b5110a8bfc260f14270c13640360d4d51db4e5586f3b4c82f87e2f14b3b35c89'
VERSION='two-original-source-regions-and-white-gap-v1'


def join_regions(context,question,gap=24):
    if context.mode!='RGB' or question.mode!='RGB' or gap<0:raise ValueError('Original RGB regions and nonnegative spacing required')
    width=max(context.width,question.width)
    image=Image.new('RGB',(width,context.height+gap+question.height),'white')
    image.paste(context,(0,0));image.paste(question,(0,context.height+gap))
    return image


def verify_join(composite,context,question,gap=24):
    expected=join_regions(context,question,gap)
    if composite.mode!='RGB' or composite.size!=expected.size or composite.tobytes()!=expected.tobytes():
        raise ValueError('Shared context, question pixels, spacing, or color differ from actual source regions')
    return {'contextRgbSha256':hashlib.sha256(context.tobytes()).hexdigest(),
        'questionRgbSha256':hashlib.sha256(question.tobytes()).hexdigest(),
        'compositeRgbSha256':hashlib.sha256(composite.tobytes()).hexdigest(),'gapPixels':gap,
        'method':VERSION,'sourcePixelsPreserved':True}


def source_region(page,bbox):
    pixmap=page.get_pixmap(dpi=180,clip=pymupdf.Rect(bbox),alpha=False)
    return Image.frombytes('RGB',(pixmap.width,pixmap.height),pixmap.samples)


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current();root=store.child(state['runId'])
    source=next(s for s in verified_keys(root) if s['sourceSha256']==SOURCE)
    original_report=read_json(root/'full-question-crops/progress.json')
    item=next(r for r in original_report['results'] if r['sourceSha256']==SOURCE)
    if digest(item['package'])!=item['packageSha256']:raise ValueError('Original deferred source package changed')
    original=read_json(item['package']);cards=copy.deepcopy(original['cards']);by_number={c['printedNumber']:c for c in cards}
    folder=root/'full-question-shared-context';folder.mkdir(exist_ok=True);out=folder/SOURCE[:16];out.mkdir(exist_ok=True)
    if len(cards)!=29 or set(by_number)!=set(range(1,30)):raise ValueError('Expected original 29-question source required')
    with process_lock(folder/'.writer.lock'),pymupdf.open(source['sourcePath']) as doc:
        page=doc[0];first=by_number[4];second=by_number[5]
        if first['pdfPage']!=1 or second['pdfPage']!=1:raise ValueError('Actual shared source page differs')
        headings=[l for l in source_lines(page) if '4 ve 5. soruları' in l['text']]
        if len(headings)!=1:raise ValueError('Actual printed shared-figure heading is missing/ambiguous')
        bbox=[first['bboxPt'][0],headings[0]['bbox'][1]-4,page.rect.width-14,first['bboxPt'][1]-.1]
        context_image=source_region(page,bbox);context_file=out/'shared-population-pyramids.webp';context_image.save(context_file,format='WEBP',lossless=True)
        with Image.open(context_file) as decoded:
            if decoded.tobytes()!=context_image.tobytes():raise ValueError('Shared original context pixels changed')
        context_text=page.get_text(clip=pymupdf.Rect(bbox)).strip();context_id='source-context:'+SOURCE+':1:4-5'
        context={'contextId':context_id,'sourceSha256':SOURCE,'pdfPage':1,'bboxPt':bbox,'image':str(context_file),
            'imageSha256':digest(context_file),'text':context_text,'dependentPrintedNumbers':[4,5],
            'method':'EXACT_ORIGINAL_SOURCE_RENDER_REGION','teacherApproved':False}
        proofs=[]
        for card in cards:
            if digest(card['image'])!=card['imageSha256']:raise ValueError('Original question source crop changed')
            if card['printedNumber'] in [4,5]:
                native=source_region(doc[card['pdfPage']-1],card['bboxPt']);joined=join_regions(context_image,native)
                image=out/(card['code']+'-with-context.webp');joined.save(image,format='WEBP',lossless=True)
                with Image.open(image) as decoded:proof=verify_join(decoded,context_image,native)
                proof.update(sourceSha256=SOURCE,sourceCode=card['code'],sourceRegions=[{'pdfPage':1,'bboxPt':bbox},
                    {'pdfPage':card['pdfPage'],'bboxPt':card['bboxPt']}],imageSha256=digest(image))
                proof_file=out/(card['code']+'.pixels.json');write_json(proof_file,proof)
                text=context_text+'\n\n'+card['text']
                card.update(image=str(image),imageSha256=digest(image),text=text,textSha256=hashlib.sha256(text.encode()).hexdigest(),
                    textFingerprint=text_fingerprint(text),contextIds=[context_id],sourceRegions=proof['sourceRegions'],
                    containsGraphics=True,cropAcceptance='ORIGINAL_SHARED_CONTEXT_AND_QUESTION_PIXELS_VERIFIED',
                    reviewConcerns=['SHARED_FIGURE_CONTENT_REQUIRES_TOPIC_AND_OPTION_REVIEW'])
            else:
                proof_file=out/(card['code']+'.pixels.json')
                write_json(proof_file,{**check_pixels(doc[card['pdfPage']-1],card),'sourceSha256':SOURCE,
                    'sourceCode':card['code'],'imageSha256':card['imageSha256']})
            proofs.append({'path':str(proof_file),'sha256':digest(proof_file)})
        coverage=[]
        for number in sorted({c['pdfPage'] for c in cards}):
            page_cards=[c for c in cards if c['pdfPage']==number]
            if number==1:page_cards.append({'bboxPt':bbox})
            coverage.append({'page':number,'uncoveredBodyLines':uncovered_body_lines(doc[number-1],page_cards)})
        if any(p['uncoveredBodyLines'] for p in coverage):raise ValueError('Source body lines remain outside question/context regions')
        package={**original,'cards':cards,'contexts':[context],'extractorVersion':VERSION,'questionBankWrites':0,'teacherApproved':False}
        package_file=out/'candidates.json';write_json(package_file,package)
        if digest(source['sourcePath'])!=SOURCE:raise ValueError('Original PDF changed during context packaging')
        result={'sourceSha256':SOURCE,'status':'REPAIRED_TECHNICAL_PREPARATION','questions':len(cards),
            'package':str(package_file),'packageSha256':digest(package_file),'pixelProofs':proofs,'bodyCoverage':coverage,
            'contextImages':1,'selfContainedCompositeQuestions':2,'sourcePixelsPreserved':True,'teacherApproved':False}
        write_json(folder/'progress.json',{'status':'COMPLETE','scope':'ONE_ORIGINAL_SHARED_FIGURE_ATTACHED_TO_BOTH_QUESTIONS',
            'sourceKeyIdentity':signature(source['sourceAnswers']),'originalSourceCropReportSha256':digest(root/'full-question-crops/progress.json'),
            'toolSha256':digest(Path(__file__)),'questionBankWrites':0,'sourceWrites':0,'teacherApproved':False,'results':[result]})
    print({'status':'COMPLETE','questions':29,'sharedContextImages':1,'dependentQuestions':[4,5],
        'sourcePixelsPreserved':True,'questionBankWrites':0,'teacherApproved':False})


if __name__=='__main__':main()
