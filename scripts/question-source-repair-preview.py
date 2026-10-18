"""Prepare source-faithful crop repair previews; never replace a bank image.

PDF clipping preserves original glyphs/diagrams. Each manifest binds the old
image, PDF bytes/page and proposed fragments so a later explicit data correction
can retain history and verify the exact files. No answers or scores are changed.
"""
import hashlib
import json
from pathlib import Path

import pymupdf

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'
FRAGMENTS = {
    '3d-ayt-esit-agirlik-30-27': [
        {'source':[50,695,270,707],'destination':[10,10,270,25]},
        {'source':[300,80,532,200],'destination':[10,36,270,171]}],
    'mn-test-03-01-51': [
        {'source':[40,166,282,398],'destination':[10,10,252,242]}],
}


def load(path):
    return json.loads(path.read_text(encoding='utf-8'))


def main():
    proposals = {p['code']:p for p in load(APP / 'ornek-veri/content-ai-question-labels.json')['proposals']}
    questions = {q['code']:q for q in load(STATE / 'source-inventory.json')['questions']}
    pdfs = {p['key']:p for p in load(APP / 'backend/src/main/resources/pdf-review-labels.json')['items']}
    directory = STATE / 'source-repair'
    directory.mkdir(exist_ok=True)
    records = []
    for code, fragments in FRAGMENTS.items():
        proposal = proposals[code]
        proof = proposal['sourcePdfEvidence']
        pdf = pdfs[proof['sourceKey']]
        filename = APP.parent / 'Kaynaklar/ogm-materyal' / pdf['relativePath']
        checksum = hashlib.sha256(filename.read_bytes()).hexdigest()
        if checksum != proof['sourceSha256']:
            raise ValueError(f'Changed reviewed PDF: {code}')
        old = APP / 'veri/resimler-pilot' / questions[code]['image']
        if hashlib.sha256(old.read_bytes()).hexdigest()!=proposal['visualEvidence']['sha256']:
            raise ValueError(f'Changed original crop: {code}')
        width = max(f['destination'][2] for f in fragments)+10
        height = max(f['destination'][3] for f in fragments)+10
        with pymupdf.open(filename) as source, pymupdf.open() as result:
            page = result.new_page(width=width,height=height)
            for fragment in fragments:
                clip = pymupdf.Rect(fragment['source'])
                if not source[proof['page']-1].rect.contains(clip):
                    raise ValueError(f'Clip outside PDF page: {code}')
                page.show_pdf_page(pymupdf.Rect(fragment['destination']),source,proof['page']-1,clip=clip)
            result.save(directory / f'{code}-candidate.pdf',garbage=4,deflate=True)
            page.get_pixmap(matrix=pymupdf.Matrix(2.5,2.5),alpha=False).save(directory / f'{code}-candidate.png')
        image = directory / f'{code}-candidate.png'
        records.append({'key':f'question:{code}','sourceProblem':proposal['sourceProblem'],
                        'state':'PREVIEW_NOT_APPLIED','oldImage':questions[code]['image'],
                        'oldImageSha256':proposal['visualEvidence']['sha256'],
                        'sourcePdf':proof,'fragments':fragments,
                        'candidateImage':image.relative_to(APP).as_posix(),
                        'candidateImageSha256':hashlib.sha256(image.read_bytes()).hexdigest(),
                        'proposedLabels':proposal['targets'],
                        'scoringChange':False,'questionCodeChange':False,'historyMutation':False,
                        'historyPolicy':'Önceki kaynak hash ve dosya korunur; mevcut kayıt uygulanırsa kaynak sürümü ve inceleme durumu yenilenir.'})
    report = {'version':1,'status':'PREPARED','sourceOrLearnerWrites':0,'records':records}
    (directory / 'manifest.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'status':'PREPARED','records':len(records),'sourceOrLearnerWrites':0}))


if __name__=='__main__':
    main()
