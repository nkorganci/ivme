"""Bind explicitly inspected summary bodies, including column continuations.

Coordinates refer to the actually opened frozen 100-DPI page images. The mixed
Physics/History sheet was displayed at 1197x2048; normalization uses that canvas.
No OCR, answer solving, topic assignment or question-bank mutation is performed.
"""
from collections import Counter
from pathlib import Path

import pymupdf
from PIL import Image

from yks_birlestirme import Store, read_json, write_json, digest, signature, process_lock
from yks_pilot_kaynaklari import APP
from yks_istisna_kirpim import original_image, verify_image


# Every rectangle was selected after reading the full original page. Question
# 2 in the first and seventh sources continues at the top of the right column.
# The last source's question 2 has its figure above its printed number.
REVIEWS = [
    (2, 'c58a3d86fe1d8a7e76359ff1b9543682518e0fc34412a1ca9b977fb13508b545', (1300, 767),
     [[[347, 225, 787, 548]], [[347, 553, 787, 742], [800, 225, 1245, 327]],
      [[800, 336, 1245, 615], [800, 615, 1040, 718]]], ['E', 'C', 'D'],
     {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN']}),
    (3, '92cf14c791f2d891b285d7ee33d120fe9a7ba7aec715d6ed0c07b66407a89be6', (999, 1060),
     [[[616, 214, 977, 344]], [[616, 353, 977, 672]], [[616, 677, 977, 1014]]],
     ['E', 'E', 'B'], {}),
    (4, '33375423668c26d67173fd35ebc5388d5ebb8cf13d1e34e29bae59df324dea86', (1300, 948),
     [[[482, 214, 863, 534]], [[482, 541, 863, 895]], [[870, 214, 1255, 568]]],
     ['E', 'A', 'B'], {}),
    (5, 'a219e7798846b5028ab8abd7cc4c93afa2952d26130e55e1ab29928b2590797b', (1300, 1043),
     [[[910, 66, 1248, 333]], [[910, 346, 1248, 609]], [[910, 616, 1248, 965]]],
     ['E', 'E', 'C'], {1: ['SOURCE_MAGENTA_OCCLUSION_PRESERVED_REVIEW_REQUIRED'],
                        3: ['SOURCE_MAGENTA_OCCLUSION_PRESERVED_REVIEW_REQUIRED']}),
    (6, 'e10370083a83f238527106537d41b24bc0337ab290ee9e735ee9a48b2bcdaaf3', (1295, 1076),
     [[[933, 698, 1262, 872]], [[933, 879, 1262, 1042]]], ['E', 'B'], {}),
    (7, '46db2fc5ef93fc686a384d22a2c18a4aae27a3ca74341d1b6c139fd93828e5a5', (1300, 861),
     [[[1030, 213, 1258, 445]], [[1030, 548, 1258, 785]]], ['B', 'D'], {}),
    (8, '3a82c0365ea9a942e5ede3b942fe9c9a02542d5e7bbd207860ea7efa62340034', (1270, 952),
     [[[728, 218, 980, 551]], [[728, 564, 980, 884], [990, 218, 1236, 326]],
      [[990, 336, 1236, 707]]], ['A', 'D', 'C'],
     {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN'],
      3: ['SOURCE_OVERLAPPING_OR_MALFORMED_SYMBOLS_PRESERVED_REVIEW_REQUIRED']}),
    (9, '7e1b12028ba5dfefb163f28cfea52d2e97f6f0a0f2ac0698a5d227a11892e3b3', (719, 857),
     [[[393, 185, 709, 474]], [[391, 476, 558, 655], [561, 476, 709, 620]],
      [[393, 660, 560, 790], [562, 650, 709, 782], [393, 790, 709, 823]]],
     ['D', 'D', 'C'], {3: ['FIGURE_EXTENDS_ABOVE_PRINTED_NUMBER']}),
    (10, '8a94aba3b08544ba4ba87eaee32eec4ad144ca3a8f66fb633661e05581441120', (1197, 2048),
     [[[834, 342, 1147, 646]], [[834, 651, 1147, 1027]]], ['C', 'E'],
     {1: ['SOURCE_YELLOW_ANNOTATION_PRESERVED'], 2: ['SOURCE_YELLOW_ANNOTATION_PRESERVED']}),
    (11, '328cbcf8398e2f20129e0a41ed4fb337090dcf453114fd0141058f5caec210cc', (1300, 823),
     [[[870, 125, 1245, 384]], [[870, 393, 1245, 600]], [[870, 611, 1245, 779]]],
     ['C', 'B', 'E'], {1: ['FIGURE_EXTENDS_ABOVE_PRINTED_NUMBER']}),
    (12, 'a5bcb4d4834bbcd1dfcef704ec3208915843965ed8354be214903c0dcbac300d', (1300, 1059),
     [[[1025, 215, 1256, 470]], [[1025, 470, 1256, 777]], [[1025, 783, 1256, 990]]],
     ['A', 'B', 'E'], {2: ['FIGURE_EXTENDS_ABOVE_PRINTED_NUMBER']}),
    (13, 'e62c4a27a1cf83967b905b114ea36485122e9517c5d813c8093257a5c1479633', (1300, 1230),
     [[[466, 985, 730, 1191]], [[735, 942, 992, 1191]], [[1000, 942, 1257, 1191]]],
     ['E', 'D', 'D'], {2: ['FIGURE_EXTENDS_ABOVE_HEADING_AND_PRINTED_NUMBER']}),
    (14, 'ef455b54bbae4043edb994909baf2b922aebfe858a302718f88bb60274fbbcbf', (1300, 977),
     [[[1038, 208, 1252, 495]], [[1038, 501, 1252, 935]]], ['E', 'E'], {}),
    (15, '9170dad8620400127668f7072b751509fad4ba565b8c3f2b8ab7b82f08b893b4', (1300, 1010),
     [[[884, 490, 1257, 739]], [[884, 741, 1257, 980]]], ['C', 'B'], {}),
    (16, '36bed41d334730435724de5629a1f6f90eabf7349a778d0b4ef3282bc3bcf04e', (1300, 858),
     [[[755, 110, 1007, 718]], [[755, 719, 1007, 830], [1013, 108, 1268, 189]],
      [[1013, 190.8, 1268, 586]], [[1013, 590, 1268, 781]]], ['D', 'E', 'D', 'C'],
     {2: ['CONTINUES_AT_TOP_OF_RIGHT_COLUMN', 'SOURCE_OVERLAPPING_OR_MALFORMED_SYMBOLS_PRESERVED_REVIEW_REQUIRED']}),
    (17, 'f58c71b8deb1f76bd67238aefdc74902830f89656b883099a448888c883fde4f', (1300, 942),
     [[[998, 73, 1258, 250]], [[998, 256, 1258, 585]], [[998, 590, 1258, 858]]],
     ['C', 'C', 'E'], {}),
]

REVIEWED_NATIVE_GEOMETRY_EXCEPTIONS = {
    (9, 2): 'f4f0f21f46efca78d102bae6b77962c77a4edd2de3d4cb75b68f94f70bfbed38',
    (9, 3): '925a319ef70251851b3b820924d4fe6f4463661960004f49f73971c263fd6492',
}


def page_regions(rectangles, canvas, page):
    width, height = canvas
    if width <= 0 or height <= 0:
        raise ValueError('Positive reviewed canvas required')
    regions = []
    for box in rectangles:
        if len(box) != 4 or not (0 <= box[0] < box[2] <= width and 0 <= box[1] < box[3] <= height):
            raise ValueError('Reviewed rectangle exceeds actual page')
        regions.append({'pdfPage': 1, 'bboxPt': [box[0] * page.rect.width / width,
            box[1] * page.rect.height / height, box[2] * page.rect.width / width,
            box[3] * page.rect.height / height]})
    return regions


def cut_lines(page, regions):
    """Reject line cuts; native text is a geometry hint, never a transcript."""
    cuts = []
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines', []):
            text = ''.join(s['text'] for s in line['spans'])
            if not text.strip():
                continue
            box = pymupdf.Rect(line['bbox'])
            for region in regions:
                clip = pymupdf.Rect(region['bboxPt'])
                intersection = clip & box
                if not intersection.is_empty and intersection.get_area() > .05:
                    if not (clip + (-.3, -.3, .3, .3)).contains(box):
                        cuts.append({'textHint': text, 'bboxPt': list(box), 'region': region})
    return cuts


def main():
    if pymupdf.VersionBind != '1.28.2':
        raise ValueError('Use project .venv renderer 1.28.2; do not overwrite frozen image evidence')
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    discovery_path = root / 'physics-summary-body-discovery/report.json'
    key_path = root / 'physics-summary-effective-key-regions/report.json'
    discovery = read_json(discovery_path)
    keys = {r['sourceSha256']: r for r in read_json(key_path)['results']}
    folder = root / 'physics-summary-bound-bodies'
    folder.mkdir(exist_ok=True)
    results = []
    with process_lock(folder / '.writer.lock'):
        for index, viewed_hash, canvas, bodies, answers, concerns in REVIEWS:
            row = discovery['results'][index - 1]
            sha = row['sourceSha256']
            if row['pageImageSha256'] != viewed_hash or digest(row['pageImage']) != viewed_hash:
                raise ValueError('Actually opened original page differs')
            key = keys[sha]
            if not key['contiguousPrintedNumbers'] or key['printedRegionAnswers'] != [
                    {'number': n, 'answer': a} for n, a in enumerate(answers, 1)] or len(bodies) != len(answers):
                raise ValueError('Actual printed body and reconciled key identities differ')
            if digest(row['sourcePath']) != sha:
                raise ValueError('Source changed')
            out = folder / sha[:16]
            out.mkdir(exist_ok=True)
            cards = []
            with pymupdf.open(row['sourcePath']) as doc:
                if len(doc) != 1:
                    raise ValueError('Expected actually opened one-page source')
                for n, rectangles in enumerate(bodies, 1):
                    regions = page_regions(rectangles, canvas, doc[0])
                    gaps = cut_lines(doc[0], regions)
                    # This source has overlapping native line boxes at the
                    # Q2/Q3 boundary. Preserve and expose those exceptions;
                    # they cannot pass the crop acceptance gate silently.
                    if gaps and signature(gaps) != REVIEWED_NATIVE_GEOMETRY_EXCEPTIONS.get((index, n)):
                        raise ValueError(f'Native line truncated at source {index} q{n}: {gaps}')
                    # Changed regions create a new immutable crop, preserving
                    # any superseded attempt instead of overwriting its pixels.
                    image = out / f'question-{n}-{signature(regions)[:12]}.webp'
                    if not image.is_file():
                        pixels, _ = original_image(doc, regions)
                        pixels.save(image, format='WEBP', lossless=True)
                    proof = verify_image(doc, regions, image)
                    cards.append({'sourceCode': f'physics-summary-{sha[:12]}-q{n}',
                        'sourceSha256': sha, 'sourcePath': row['sourcePath'], 'pdfPage': 1,
                        'printedNumber': n, 'printedAnswer': answers[n - 1],
                        'sourceRegions': regions, 'image': str(image), 'imageSha256': digest(image),
                        'pixelProof': proof, 'bodyNumberReading': 'ACTUAL_ORIGINAL_WHOLE_PAGE_READING',
                        'keyReadingEvidence': {'path': str(key_path), 'sha256': digest(key_path),
                            'methods': key['sourceReadingMethods']},
                        'sourceConcerns': concerns.get(n, []),
                        'nativeGeometryExceptions': gaps, 'nativeLineCuts': len(gaps),
                        'preparedCropActuallyRead': False, 'fineTopicAccepted': False,
                        'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
            if digest(row['sourcePath']) != sha:
                raise ValueError('Source changed during preparation')
            package = out / 'candidates.json'
            write_json(package, {'scope': 'SOURCE_BOUND_SUMMARY_PREPARATION_OUTSIDE_MAIN_12052',
                'sourceSha256': sha, 'cards': cards, 'questionBankWrites': 0})
            results.append({'sourceSha256': sha, 'sourcePath': row['sourcePath'],
                'status': 'ACTUAL_PAGE_BODY_KEY_BOUND_CROP_VISUAL_REVIEW_PENDING',
                'questions': len(cards), 'package': str(package), 'packageSha256': digest(package),
                'actuallyReadPage': row['pageImage'], 'actuallyReadPageSha256': viewed_hash,
                'mixedSubjectPanels': index == 10,
                'excludedOtherSubjectInlineQuestions': 3 if index == 10 else 0,
                'sourcePixelsPreserved': True,
                'nativeLineCuts': sum(c['nativeLineCuts'] for c in cards),
                'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
        report = {'status': 'PASS', 'scope': 'EXPLICITLY_REVIEWED_SUMMARY_SOURCE_PAGES_ONLY',
            'documents': len(results), 'questions': sum(r['questions'] for r in results),
            'results': results, 'states': dict(Counter(r['status'] for r in results)),
            'inputs': {str(discovery_path): digest(discovery_path), str(key_path): digest(key_path)},
            'originalSourcePixelsEqual': True,
            'nativeLineCuts': sum(r['nativeLineCuts'] for r in results),
            'newOcrCalls': 0, 'newModelCalls': 0, 'sourceWrites': 0, 'questionBankWrites': 0,
            'teacherApproved': False, 'fullStageAccepted': False, 'toolSha256': digest(Path(__file__))}
        write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in ['results', 'inputs']})


if __name__ == '__main__':
    main()
