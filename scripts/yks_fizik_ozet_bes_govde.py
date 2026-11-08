"""Bind five actually viewed printed bodies to the already reconciled key.

This is a source-pixel preparation only. No invented OCR transcript, automatic
fine-topic/novelty decision, main-cohort extension or question-bank write.
"""
from pathlib import Path

import pymupdf

from yks_birlestirme import Store, read_json, write_json, digest, process_lock
from yks_pilot_kaynaklari import APP
from yks_istisna_kirpim import original_image, verify_image

SOURCE = '66d6cd9275fd931a59bd1b03718f7623ba183c90c35d7508ff995804c42babe7'
BOUNDARIES = [63, 228.3, 340.8, 565.8, 778.3, 965]
ANSWERS = ['E', 'C', 'E', 'E', 'D']
ACTUALLY_VIEWED_CROP_SHA256 = ['eab675e832d3e0ae985882032d5172d71de45357b68a2b297e6a8abbf1e9694e', '3fb1a2ee41cac35fd612085df8c2c69c7b1d54e73346a730e2cf22defcc54b3d', 'bbb42d1d6129a158e946cbe97cf999491ff70c6baed3d301cb9b2d55c9c1aab6', '806a0374fbd989fe823cb54aaf0cdb03cd0c003dd77c816ce641afa64c2b151c', '59cf7dd62a20da5e7fa11c96d3fd365d916205e6aa6c281a61d352ec138ea7bf']


def main():
    if pymupdf.VersionBind != '2.0':
        raise ValueError('Actual corrected crop readings use PyMuPDF 2.0; use the recorded system Python, not the older project renderer')
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    layout_path = root / 'physics-summary-layout-actual-review/report.json'
    layout = read_json(layout_path)
    reviewed = next(r for r in layout['results'] if r['sourceSha256'] == SOURCE)
    page_image = reviewed['viewedWholePage']
    if digest(page_image) != reviewed['viewedWholePageSha256']:
        raise ValueError('Actually opened whole original page differs')
    key_path = root / 'physics-summary-effective-key-regions/report.json'
    keys = read_json(key_path)
    source = next(r for r in keys['results'] if r['sourceSha256'] == SOURCE)
    expected = [{'number': n, 'answer': a} for n, a in enumerate(ANSWERS, 1)]
    if source['printedRegionAnswers'] != expected or not source['contiguousPrintedNumbers']:
        raise ValueError('Actually read complete printed key differs')
    if digest(source['sourcePath']) != SOURCE:
        raise ValueError('Original source changed')
    folder = root / 'physics-summary-five-body-preparation-v2'
    folder.mkdir(exist_ok=True)
    cards = []
    created = 0
    with process_lock(folder / '.writer.lock'), pymupdf.open(source['sourcePath']) as doc:
        if len(doc) != 1:
            raise ValueError('Expected actually viewed one-page original')
        native_lines = [l for block in doc[0].get_text('dict')['blocks'] for l in block.get('lines', [])]
        for line in native_lines:
            x0, y0, x1, y1 = line['bbox']
            if x0 >= 718 and y0 >= BOUNDARIES[0] and y0 < BOUNDARIES[-1]:
                if x1 > 910 or not any(start <= y0 and y1 <= end for start, end in zip(BOUNDARIES, BOUNDARIES[1:])):
                    raise ValueError('Native body/option line would be truncated by source crop')
        for n, answer in enumerate(ANSWERS, 1):
            regions = [{'pdfPage': 1, 'bboxPt': [718, BOUNDARIES[n - 1], 910, BOUNDARIES[n]]}]
            image = folder / f'question-{n}.webp'
            if not image.is_file():
                pixels, _ = original_image(doc, regions)
                pixels.save(image, format='WEBP', lossless=True)
                created += 1
            proof = verify_image(doc, regions, image)
            if digest(image) != ACTUALLY_VIEWED_CROP_SHA256[n - 1]:
                raise ValueError('Actually opened corrected question crop differs')
            cards.append({'sourceCode': f'physics-summary-{SOURCE[:12]}-q{n}',
                          'sourceSha256': SOURCE, 'sourcePath': source['sourcePath'],
                          'pdfPage': 1, 'printedNumber': n, 'printedAnswer': answer,
                          'sourceRegions': regions, 'image': str(image), 'imageSha256': digest(image),
                          'pixelProof': proof, 'bodyEvidence': 'ACTUALLY_OPENED_WHOLE_SOURCE_PAGE',
                          'transcriptStatus': 'NOT_CREATED_USE_ORIGINAL_IMAGE',
                          'sourceStatementMarkerReviewRequired': n == 4,
                          'examScopeAccepted': False, 'fineTopicAccepted': False,
                          'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
        if digest(source['sourcePath']) != SOURCE:
            raise ValueError('Original source changed during preparation')
        package = folder / 'candidates.json'
        write_json(package, {'scope': 'FIVE_SEPARATE_IMAGE_ONLY_PREPARATIONS_OUTSIDE_MAIN_12052_QUEUE',
                             'cards': cards, 'questionBankWrites': 0})
        report = {'status': 'PASS', 'sourceSha256': SOURCE, 'questions': len(cards),
                  'package': str(package), 'packageSha256': digest(package),
                  'inputs': {str(key_path): digest(key_path), str(layout_path): digest(layout_path),
                             page_image: digest(page_image)},
                  'printedBodyNumbersActuallyViewed': [1, 2, 3, 4, 5],
                  'printedAnswers': expected, 'newCropsThisPass': created,
                  'originalSourcePixelsEqual': True, 'cropImagesActuallyRead': True,
                  'bodyKeyBinding': 'PRINTED_BODY_NUMBER_TO_RECONCILED_SOURCE_KEY_REGION',
                  'nativeBodyOptionLineCoverage': 'ALL_VISIBLE_PANEL_LINES_CONTAINED_WITHOUT_TRUNCATION',
                  'supersedesIncompleteCropDirectory': 'physics-summary-five-body-preparation',
                  'sourceStatementMarkerReviewQuestions': [4],
                  'transcriptCreated': False, 'newOcrCalls': 0, 'newModelCalls': 0,
                  'newQuestionAdmissionAccepted': False, 'questionBankWrites': 0,
                  'teacherApproved': False, 'toolSha256': digest(Path(__file__))}
        write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in ['inputs', 'printedAnswers']})


if __name__ == '__main__':
    main()
