"""Double-check complete native body-line coverage and lossless crop pixels.

This checks a prepared crop against the current original PDF. It does not turn
a graphical question's content or a topic proposal into a teacher approval.
"""
from collections import Counter
import hashlib
from pathlib import Path

import pymupdf
from PIL import Image
from yks_birlestirme import Store,digest,signature,read_json,write_json,process_lock
from yks_pilot_sorular import APP,source_lines

VERSION='source-crop-pixels-and-native-lines-v1'


def uncovered_body_lines(page,cards):
    regions=[pymupdf.Rect(card['bboxPt']) for card in cards]
    if not regions:raise ValueError('No source question regions on body page')
    first=min(r.y0 for r in regions);last=max(r.y1 for r in regions)
    return [line for line in source_lines(page) if pymupdf.Rect(line['bbox']).y0>=first
        and pymupdf.Rect(line['bbox']).y1<=last and not any(r.contains(pymupdf.Rect(line['bbox'])) for r in regions)]


def check_pixels(page,card):
    pixmap=page.get_pixmap(dpi=180,clip=pymupdf.Rect(card['bboxPt']),alpha=False)
    expected=hashlib.sha256(pixmap.samples).hexdigest()
    with Image.open(card['image']) as image:
        if image.size!=(pixmap.width,pixmap.height) or image.mode!='RGB':raise ValueError('Prepared crop dimensions/color differ')
        actual=hashlib.sha256(image.tobytes()).hexdigest()
    if actual!=expected:raise ValueError('Prepared crop pixels differ from the original source render')
    return {'sourcePixelSha256':expected,'preparedPixelSha256':actual,'width':pixmap.width,'height':pixmap.height}


def main():
    store=Store(APP/'veri/yks-birlestirme');state=store.current()
    folder=store.child(state['runId']+'/question-cohort')
    summary=read_json(folder/'source-crop-report.json');results=[];coverage=[];reused=0
    cache=folder/'crop-pixel-cache';cache.mkdir(exist_ok=True)
    with process_lock(folder/'.crop-check-writer.lock'):
        for item in summary['results']:
            if item['status']!='PREPARED':continue
            file=Path(item['package'])
            if digest(file)!=item['packageSha256']:raise ValueError('Crop package changed before pixel check')
            package=read_json(file);source=Path(package['sourcePath']);sha=package['sourceSha256']
            if digest(source)!=sha:raise ValueError('Original PDF bytes changed')
            with pymupdf.open(source) as pdf:
                for number in sorted({c['pdfPage'] for c in package['cards']}):
                    cards=[c for c in package['cards'] if c['pdfPage']==number]
                    missing=uncovered_body_lines(pdf[number-1],cards)
                    coverage.append({'sourceSha256':sha,'pdfPage':number,'uncoveredBodyLines':missing})
                    if missing:raise ValueError('A native source body line falls outside all question crops')
                for card in package['cards']:
                    if digest(card['image'])!=card['imageSha256']:raise ValueError('Prepared crop checksum differs')
                    identity=signature([VERSION,sha,card['pdfPage'],card['bboxPt'],card['imageSha256'],pymupdf.VersionBind])
                    saved=cache/(identity+'.json')
                    if saved.is_file():pixels=read_json(saved);reused+=1
                    else:
                        pixels=check_pixels(pdf[card['pdfPage']-1],card)
                        pixels.update(version=VERSION,sourceSha256=sha,imageSha256=card['imageSha256'],bboxPt=card['bboxPt'])
                        write_json(saved,pixels)
                    if pixels.get('version')!=VERSION or pixels.get('sourceSha256')!=sha or pixels.get('imageSha256')!=card['imageSha256'] or pixels.get('bboxPt')!=card['bboxPt']:
                        raise ValueError('Crop pixel cache belongs to a different source/region/image')
                    if pixels['sourcePixelSha256']!=pixels['preparedPixelSha256']:raise ValueError('Invalid crop pixel cache')
                    results.append({'sourceCode':card['code'],'sourceSha256':sha,'pdfPage':card['pdfPage'],
                        'imageSha256':card['imageSha256'],'pixelProofPath':str(saved),'pixelProofSha256':digest(saved),
                        'sourceAndPreparedPixelsEqual':True,'teacherApproved':False})
            if digest(source)!=sha:raise ValueError('PDF changed during pixel verification')
        report={'status':'PASS','scope':'REPRESENTATIVE_CROP_TECHNICAL_INTEGRITY_ONLY','questions':len(results),
            'sourceBodyPages':len(coverage),'uncoveredNativeBodyLines':sum(len(r['uncoveredBodyLines']) for r in coverage),
            'sourceAndPreparedCropPixelsEqual':True,'reusedPixelProofs':reused,'newPixelRenders':len(results)-reused,
            'toolSha256':digest(Path(__file__)),'cropReportSha256':digest(folder/'source-crop-report.json'),
            'results':results,'bodyCoverage':coverage,'questionBankWrites':0,'teacherApproved':False}
        write_json(folder/'crop-integrity-report.json',report)
    print(__import__('json').dumps({k:v for k,v in report.items() if k not in ('results','bodyCoverage')}))


if __name__=='__main__':main()
