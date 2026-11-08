"""Inventory visible summary body geometry without inferring question admission.

Saved OCR is reused. Native geometry is collected once because the earlier
native cache contains text but no line boxes. Off-page native objects cannot
become visible question anchors. Number/key agreement only queues a review.
"""
from collections import Counter
from pathlib import Path
import re

import pymupdf
from PIL import Image, ImageDraw

from yks_birlestirme import Store, read_json, write_json, digest, process_lock
from yks_pilot_kaynaklari import APP, plain

VERSION = 'visible-summary-body-geometry-v1'


def visible(box, width, height):
    return (len(box) == 4 and 0 <= box[0] < box[2] <= width
            and 0 <= box[1] < box[3] <= height)


def number_candidate(text):
    # A damaged ToUnicode map is a location hint, never a trusted transcript.
    match = re.match(r'^\s*([1-9])(?:\.[)]?|[)])(?:\s|$)', text)
    if match:
        return int(match[1]), 'LITERAL_NUMBER_PREFIX'
    match = re.match(r'^[\s\x03]*([\x14-\x1c])(?:\x11\x0c?|\x0c)', text)
    if match:
        return ord(match[1]) - 19, 'DAMAGED_TOUNICODE_NUMBER_LOCATION_HINT_ONLY'
    return None


def inspect_lines(lines, width, height):
    inside = [line for line in lines if visible(line['bbox'], width, height)]
    outside = [line for line in lines if not visible(line['bbox'], width, height)]
    headers = [line for line in inside if re.fullmatch(
        r'(?:ORNEK\s+)?SORULAR\s*:?\s*', plain(line['text']))]
    numbers = []
    for line in inside:
        candidate = number_candidate(line['text'])
        if candidate:
            number, method = candidate
            # Spatial relation to a visible heading is required. Explanation
            # lists and left-column worked examples remain out of this queue.
            related = [h for h in headers if line['bbox'][1] >= h['bbox'][3]
                       and line['bbox'][0] >= h['bbox'][0] - 15]
            if related:
                numbers.append({**line, 'numberCandidate': number,
                                'readingMethod': method})
    return {'visibleHeaders': headers, 'numberLocationCandidates': numbers,
            'offPageNativeOrOcrLines': outside,
            'offPageNumberPrefixesIgnored': sum(number_candidate(l['text']) is not None
                                                for l in outside)}


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    key_path = root / 'physics-summary-effective-key-regions/report.json'
    keys = read_json(key_path)
    if keys['status'] != 'COMPLETE' or keys['documents'] != 75:
        raise ValueError('Complete frozen printed-region scope required')
    folder = root / 'physics-summary-body-discovery'
    folder.mkdir(exist_ok=True)
    results = []
    created = reused = renders = 0
    inputs = {str(key_path): digest(key_path)}
    with process_lock(folder / '.writer.lock'):
        for row in keys['results']:
            sha = row['sourceSha256']
            detail_path = root / 'saved-key-signal-discovery' / (sha + '.json')
            detail = read_json(detail_path)['result']
            inputs[str(detail_path)] = digest(detail_path)
            ocr_files = {r['savedReadingPath']: r['savedReadingSha256']
                         for r in detail['readings'] if r.get('savedReadingPath')}
            for file, expected in ocr_files.items():
                if digest(file) != expected:
                    raise ValueError('Saved original OCR changed')
            identity = {'sourceSha256': sha, 'keyReportSha256': inputs[str(key_path)],
                        'discoverySha256': inputs[str(detail_path)],
                        'ocrFiles': ocr_files, 'version': VERSION,
                        'renderer': pymupdf.VersionBind}
            cache = folder / (sha + '.json')
            prior = read_json(cache) if cache.is_file() else {}
            if prior and prior['identity']['renderer'] != pymupdf.VersionBind:
                raise ValueError('Use the recorded PyMuPDF renderer before reusing actual-page evidence; do not overwrite it with a different renderer')
            if digest(row['sourcePath']) != sha:
                raise ValueError('Original summary changed')
            if prior.get('identity') == identity:
                result = prior['result']
                if digest(result['pageImage']) != result['pageImageSha256']:
                    raise ValueError('Cached original review page changed')
                reused += 1
            else:
                with pymupdf.open(row['sourcePath']) as doc:
                    if len(doc) != 1:
                        raise ValueError('Expected the frozen one-page source family')
                    page = doc[0]
                    width, height = page.rect.width, page.rect.height
                    native = [{'text': ''.join(s['text'] for s in l['spans']),
                               'bbox': list(l['bbox'])}
                              for block in page.get_text('dict')['blocks']
                              for l in block.get('lines', [])]
                    readings = [{'method': 'NATIVE_UNTRUSTED_TOUNICODE',
                                 **inspect_lines(native, width, height)}]
                    for file in ocr_files:
                        saved = read_json(file)
                        if saved['sourceSha256'] != sha or saved['page'] != 1:
                            raise ValueError('Saved OCR belongs to another source')
                        readings.append({'method': saved['extractorVersion'],
                                         'savedReadingPath': file,
                                         **inspect_lines(saved.get('lines', []), width, height)})
                    image = folder / (sha + '-page.png')
                    page.get_pixmap(dpi=100, alpha=False).save(image)
                    renders += 1
                expected_numbers = [r['number'] for r in row['printedRegionAnswers']]
                proposals = [r for r in readings if sorted(
                    n['numberCandidate'] for n in r['numberLocationCandidates']) == expected_numbers]
                status = ('PRINTED_NUMBER_GAP_HOLD_NO_BODY_KEY_BINDING'
                          if not row['contiguousPrintedNumbers'] else
                          'VISIBLE_NUMBER_SEQUENCE_CANDIDATE_ACTUAL_BODY_REVIEW_REQUIRED'
                          if proposals else 'BODY_LAYOUT_OR_NUMBER_REVIEW_REQUIRED')
                result = {'sourceSha256': sha, 'sourcePath': row['sourcePath'],
                          'status': status, 'pageWidthPt': width, 'pageHeightPt': height,
                          'printedKeyRegionNumbers': expected_numbers,
                          'printedKeyCells': len(expected_numbers), 'readings': readings,
                          'matchingNumberSequenceMethods': [r['method'] for r in proposals],
                          'sourceHighlightsRequireBodyReview': row['sourceHighlightsRequireBodyReview'],
                          'pageImage': str(image), 'pageImageSha256': digest(image),
                          'actualBodyImageRead': False, 'sourceQuestionAnswersBound': False,
                          'newQuestionAdmissionAccepted': False, 'teacherApproved': False}
                write_json(cache, {'identity': identity, 'result': result})
                created += 1
            results.append(result)
        # Small contact sheets support layout review; the full original page
        # image remains available for reading actual question/option details.
        boards = []
        for offset in range(0, len(results), 6):
            chunk = results[offset:offset + 6]
            board = Image.new('RGB', (1500, 1050), 'white')
            draw = ImageDraw.Draw(board)
            for index, row in enumerate(chunk):
                x, y = (index % 3) * 500, (index // 3) * 525
                draw.text((x + 4, y + 4), f"{offset+index+1:02d} {row['sourceSha256'][:12]} key:{row['printedKeyRegionNumbers']}", fill='black')
                with Image.open(row['pageImage']) as image:
                    image.thumbnail((490, 490))
                    board.paste(image, (x + 4, y + 28))
            path = folder / f'layout-board-{offset//6+1:02d}.png'
            if not path.is_file():
                board.save(path)
            boards.append({'path': str(path), 'sha256': digest(path),
                           'sources': [r['sourceSha256'] for r in chunk]})
        if any(digest(p) != sha for p, sha in inputs.items()):
            raise ValueError('Frozen input changed during body discovery')
        report = {'status': 'COMPLETE', 'scope': 'ALL_75_VISIBLE_SUMMARY_GEOMETRIES_NOT_BODY_OR_INTAKE_ACCEPTANCE',
                  'documents': len(results), 'states': dict(Counter(r['status'] for r in results)),
                  'results': results, 'reviewBoards': boards, 'inputs': inputs,
                  'newNativeGeometryCollections': created, 'cacheHits': reused,
                  'newPageRenders': renders, 'newOcrCalls': 0, 'newModelCalls': 0,
                  'sourceQuestionAnswersBound': False, 'questionBankWrites': 0,
                  'teacherApproved': False, 'toolSha256': digest(Path(__file__))}
        write_json(folder / 'report.json', report)
    print({k: v for k, v in report.items() if k not in ['results', 'inputs', 'reviewBoards']})


if __name__ == '__main__':
    main()
