"""Mathematics pilot for the PDF evidence pack (TAS-07).

Builds packs for a fixed, representative selection of the mathematics sources (digital
text, two columns, ruled tables, graphs, dense equations, scanned pages), then runs the
same selection a second time with OCR disabled to prove nothing is recomputed. The report
states what was measured; it is not a content or teacher approval.
"""
import json
import time
from pathlib import Path
from unittest.mock import patch

import pdf_kanit_paketi as kanit

BASE = kanit.ROOT / 'ogm-materyal/Matematik'
REPORT = kanit.OUT / 'pilot-matematik/rapor.json'

# (path under Kaynaklar/ogm-materyal/Matematik, pages). Chosen by hand from the source
# inventory so that every layout family is present; sizes stay inside the pilot range
# of 10-20 sources and 50-100 pages.
SPEC = [
    ('TYT/Konu Anlatimi (Video Notlari)/03 - DENKLEMLER ORAN ORANTI.pdf', '1-10'),
    ('AYT/Ders Anlatim Sunulari 11. Sinif/41 - KURE.pdf', '1-4'),
    ('TYT-AYT Ortak/Konu Ozetleri 9. Sinif/03 - KUMELERDE ISLEMLER- I.pdf', '1'),
    ('TYT-AYT Ortak/Konu Ozetleri 9. Sinif/02 - KUMELERDE TEMEL KAVRAMLAR- II.pdf', '1'),
    ('TYT-AYT Ortak/OGM Soru Bankasi 10. Sinif/01 - Sayma ve Olasilik (Bolum 1).pdf', '1-6'),
    ('AYT/Konu Anlatimi (Video Notlari)/14 - LIMIT VE SUREKLILIK.pdf', '1-12'),
    ('TYT-AYT Ortak/Ders Anlatim Sunulari 9. Sinif/01 - bilesik onermeler.pdf', '1-5'),
    ('TYT-AYT Ortak/Konu Ozetleri 9. Sinif/01 - KUMELERDE TEMEL KAVRAMLAR- I.pdf', '1'),
    ('TYT-AYT Ortak/OGM Soru Bankasi 9. Sinif/01 - Mantik.pdf', '1-8'),
    ('AYT/YKS Kampi Testleri/Matematik (AYT) - Test 01.pdf', '1-4'),
]

CATEGORIES = {
    'dijital_metin': 'metin katmanı kullanılabilir, ≥3 blok',
    'iki_sutun': 'iki sütun düzeni (boşluk tespit edildi)',
    'tablo': 'çizgili tablo bulundu',
    'sekil_grafik': 'en az bir şekil/grafik bölgesi ve kırpımı',
    'yogun_denklem': 'denklem adayı ≥8 blok veya blokların yarısından fazlası',
    'tarama': 'metin katmanı olmayan sayfa (OCR önbelleği veya satır konumlu OCR)',
}


def categories(record):
    layout, ocr = record['layout'], record.get('ocr') or {}
    blocks = layout['blocks'] + (((ocr.get('lines') or {}).get('blocks')) or [])
    flagged = sum(bool(b['verification']) for b in blocks)
    found = set()
    if layout['textLayer']['usable'] and len(layout['blocks']) >= 3:
        found.add('dijital_metin')
    if layout['columns']['count'] == 2:
        found.add('iki_sutun')
    if layout['tables']:
        found.add('tablo')
    if record['disposition']['counts']['figures']:
        found.add('sekil_grafik')
    if flagged >= 8 or (len(blocks) >= 4 and flagged > len(blocks) / 2):
        found.add('yogun_denklem')
    if layout['ocrNeed'] == 'NO_TEXT_LAYER' and (ocr.get('lines') or ocr.get('reference')):
        found.add('tarama')
    return found


def run_selection(spec, ocr_lines):
    total, rows = kanit.Stats(), []
    started = time.monotonic()
    for relative, pages in spec:
        path = BASE / relative
        sha, known = kanit.known_hash(path)
        summary, stats = kanit.build_pack(path, pages, ocr_lines=ocr_lines, relative=known, sha=sha)
        total.add(stats)
        rows.append({'path': known or relative, 'sourceSha256': summary['sourceSha256'], 'pages': pages})
    total['elapsedSeconds'] = round(time.monotonic() - started, 2)
    return dict(total), rows


def main(write=False):
    spec = SPEC
    if not spec:
        raise SystemExit('Pilot seçimi boş')
    first, sources = run_selection(spec, True)

    def no_ocr(*args, **kwargs):
        raise AssertionError('Aynı girdide OCR yeniden çalıştırıldı')

    with patch.object(kanit, 'build_ocr_lines', no_ocr):
        second, _ = run_selection(spec, True)

    found, dispositions, problems, verified, math_pages, pages_total = {}, {}, [], [], 0, 0
    for item, (relative, pages) in zip(sources, spec):
        directory = kanit.pack_dir(item['sourceSha256'])
        report = kanit.verify_pack(directory)
        verified.append({'sourceSha256': item['sourceSha256'], 'ok': report['ok'], 'problemCount': report['problemCount']})
        document = kanit.read_json(directory / 'kaynak.json')
        item['pageCount'] = document['pageCount']
        item['catalogCandidates'] = len(document['catalogCandidates'])
        for number in kanit.page_range(pages, document['pageCount']):
            record = kanit.read_json(directory / 'sayfalar' / f'{number:04d}.json')
            pages_total += 1
            state = record['disposition']['overall']
            dispositions[state] = dispositions.get(state, 0) + 1
            math_pages += record['disposition']['equations'] == 'UNVERIFIED'
            if state == 'PROBLEM':
                problems.append({'pageId': record['pageId'], 'reasons': record['disposition']['reasons']})
            for name in categories(record):
                entry = found.setdefault(name, {'pages': 0, 'examples': []})
                entry['pages'] += 1
                if len(entry['examples']) < 3:
                    entry['examples'].append({'sourceSha256': item['sourceSha256'], 'page': number, 'pageId': record['pageId']})
    report = {
        'task': 'TAS-07', 'extractor': kanit.current_versions(), 'sources': len(sources), 'pages': pages_total,
        'selection': sources, 'firstPass': first, 'secondPass': second, 'dispositions': dispositions,
        'categories': {name: {'description': text, **found.get(name, {'pages': 0, 'examples': []})} for name, text in CATEGORIES.items()},
        'pagesWithUnverifiedEquations': math_pages, 'problemPages': problems, 'verification': verified,
        'acceptance': {
            'sourcesInRange': 10 <= len(sources) <= 20, 'pagesInRange': 50 <= pages_total <= 100,
            'everyCategoryPresent': all(name in found for name in CATEGORIES),
            'noRecomputationOnSecondPass': all(second[key] == 0 for key in ('layoutBuilt', 'cropsBuilt', 'ocrBuilt', 'repaired')),
            'modelCalls': first['modelCalls'] + second['modelCalls'], 'externalCalls': first['externalCalls'] + second['externalCalls'],
            'everyPackVerified': all(v['ok'] for v in verified),
        },
        'limits': ['Denklem blokları UNVERIFIED; işaret/üs/kök/kesir/indeks/eşitsizlik yönü ayrı doğrulama ister.',
                   'Çizgisiz tablolar bu sürümde aranmaz.',
                   'Taranmış sayfalarda şekil bölgesi mürekkep bileşeniyle bulunur; OCR matematik sembollerini güvenilir okumaz.',
                   'Konu eşlemesi yalnız mevcut otomatik adaydır; öğretmen onayı değildir.'],
    }
    text = json.dumps(report, ensure_ascii=False, indent=1)
    if write:
        REPORT.parent.mkdir(parents=True, exist_ok=True)
        kanit.write_json(REPORT, report, indent=1)
    print(text)
    accepted = all(value for key, value in report['acceptance'].items() if key not in ('modelCalls', 'externalCalls'))
    accepted = accepted and report['acceptance']['modelCalls'] == 0 and report['acceptance']['externalCalls'] == 0
    raise SystemExit(0 if accepted else 1)
