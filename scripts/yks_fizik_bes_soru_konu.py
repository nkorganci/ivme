"""Bind the five reviewed bodies to actual MEBI movement-topic source pages.

Topic support does not clear source defects, variants or novelty review.
"""
from pathlib import Path
import re

import pymupdf
from PIL import Image
from yks_birlestirme import Store, read_json, write_json, digest
from yks_pilot_kaynaklari import APP

LEAF = 'mebi.tyt.fizik.62ac11b7-314c-435d-9cc6-08dc086eb842'
PDF = 'c89601e501c2937baaf56b62d60e751e8e14d1bd34d6dae9618c9010a5677c32'
PAGES = ['a387a4dcedc0d2338ff5488f201a314603af9731fd9b1cbbefd38b480a831487',
         'f9905dafa0f4ec39d8de54c10eb67f868030103b058bc211963914364c774c48',
         '4cc41c0fea96d0cb05ea16edef62217372d06123a8e5efc9350b83a1c68c6b01',
         '300768918dce04d6ff4144dc034b9b9d511db0b8f223cb47da53d4139e143cb2']
QUOTES = {
    1: [(1, 'Hareketi tanımlamak ve incelemek için seçilen gözlem noktasına referans noktası denir.')],
    2: [(1, 'Bir cisim aynı anda birden fazla hareket çeşidini yapabilir.')],
    3: [(2, 'Bir cismin izlediği yörüngenin uzunluğuna alınan yol denir.'),
        (2, 'Yer değiştirme vektörel bir büyüklük olup SI’da birimi metre (m)’dir.')],
    4: [(3, 'Hız yer değiştirmeye, sürat alınan yola bağlı olan farklı kavramlardır.'),
        (4, 'Belirli bir zaman aralığında toplam alınan yolun geçen toplam zamana oranına ortalama sürat denir.')],
    5: [(3, 'Hız yer değiştirmeye, sürat alınan yola bağlı olan farklı kavramlardır.'),
        (4, 'Belirli bir zaman aralığında toplam alınan yolun geçen toplam zamana oranına ortalama sürat denir.')],
}


def normalized(text):
    return ' '.join(re.sub('\u00ad\\s*', '', text).split())


def main():
    store = Store(APP / 'veri/yks-birlestirme')
    root = store.child(store.current()['runId'])
    folder = root / 'physics-summary-five-topic-review'
    page_path = folder / 'pages.json'
    pages = read_json(page_path)
    nav_path = root / 'yks-04/full/attempt-0007/navigation-candidate.json'
    if digest(nav_path) != pages['navigationSha256'] or pages['sourceSha256'] != PDF:
        raise ValueError('Actually read source navigation or PDF changed')
    nav = read_json(nav_path)
    leaf = next(t for c in nav['navigation'] for u in c['units'] for t in u['topics'] if t['categoryId'] == LEAF)
    definition = next(d for d in nav['categoryDefinitions'] if d['id'] == LEAF)
    if leaf['sourceExam'] != 'TYT' or leaf['subjectId'] != 'fizik' or definition['exam'] != 'TYT':
        raise ValueError('Exact registered subject/exam leaf required')
    asset = next(a for a in leaf['assets'] if a['kind'] == 'pdf' and a['sourceSha256'] == PDF)
    if digest(asset['originalPath']) != PDF or asset['originalPath'] != pages['sourcePdf']:
        raise ValueError('Exact original MEBI topic PDF required')
    package_path = root / 'physics-summary-five-body-comparison/candidates.json'
    cards = read_json(package_path)['cards']
    comparison_path = root / 'physics-summary-five-body-comparison/report.json'
    comparison = read_json(comparison_path)
    actual_path = root / 'physics-summary-five-body-comparison/actual-bank-image-review.json'
    actual = read_json(actual_path)
    if actual['sourcePackageSha256'] != digest(package_path) or comparison['packageSha256'] != digest(package_path):
        raise ValueError('Actual image review and source transcription differ')
    rows = []
    with pymupdf.open(asset['originalPath']) as doc:
        if len(doc) != 6:
            raise ValueError('Whole six-page original topic PDF required')
        for index, expected in enumerate(PAGES):
            item = pages['pages'][index]
            if item['page'] != index + 1 or item['sha256'] != expected or digest(item['path']) != expected:
                raise ValueError('Actually read topic page changed')
            pix = doc[index].get_pixmap(dpi=110, alpha=False)
            with Image.open(item['path']) as image:
                if image.mode != 'RGB' or image.size != (pix.width, pix.height) or image.tobytes() != pix.samples:
                    raise ValueError('Viewed topic pixels differ from the registered original')
        for card in cards:
            n = card['printedNumber']
            if digest(card['image']) != card['imageSha256']:
                raise ValueError('Actually read source body changed')
            quotes = []
            for number, quote in QUOTES[n]:
                if normalized(quote) not in normalized(doc[number - 1].get_text()):
                    raise ValueError('Actual topic quote is not on its claimed source page')
                quotes.append({'pdfPage': number, 'quote': quote, 'sourcePdfSha256': PDF})
            variants = [r['canonicalCandidateCode'] for r in actual['results'] if r['sourceCode'] == card['code']
                        and r['status'] == 'SOURCE_NUMBER_AND_OPTION_VARIANT_KEEP_SEPARATE']
            rows.append({'sourceCode': card['code'], 'sourceSha256': card['sourceSha256'],
                         'status': 'ACTUAL_SOURCE_FINE_TOPIC_SUPPORTED_OTHER_ACCEPTANCE_GATES_OPEN',
                         'categoryId': LEAF, 'topicSourceQuotes': quotes,
                         'sourceImageSha256': card['imageSha256'],
                         'sourcePrintedAnswer': card['answer'],
                         'sourceStatementMarkerReviewRequired': card['sourceStatementMarkerReviewRequired'],
                         'variantCanonicalCodesKeptSeparate': variants,
                         'noveltyAccepted': False, 'categoryPublished': False,
                         'newQuestionAdmissionAccepted': False, 'teacherApproved': False})
    write_json(folder / 'report.json', {'status': 'PASS', 'questions': len(rows),
               'scope': 'ONLY_FIVE_ACTUALLY_READ_SOURCE_TASKS_AND_FOUR_MEBI_PAGES',
               'categoryId': LEAF, 'registeredTopicPdfSha256': PDF,
               'registeredTopicPdfPages': 6, 'actualTopicPdfPagesRead': 4,
               'results': rows, 'sourcePackageSha256': digest(package_path),
               'inputs': {str(nav_path): digest(nav_path), str(page_path): digest(page_path),
                          str(actual_path): digest(actual_path), str(comparison_path): digest(comparison_path)},
               'questionBankWrites': 0, 'categoryPublished': False, 'noveltyAccepted': False,
               'newQuestionAdmissionAccepted': False, 'teacherApproved': False,
               'toolSha256': digest(Path(__file__))})
    print({'status': 'PASS', 'questions': len(rows), 'topicPagesActuallyRead': 4, 'published': False})


if __name__ == '__main__':
    main()
