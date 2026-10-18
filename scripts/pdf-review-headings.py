"""Inventory every local OGM PDF and read only heading blocks, outlines and cover titles.

No question extraction, paragraph analysis or teacher decisions. Reuses a stat-keyed
cache; --refresh reopens all documents. Image-only headings use optional Tesseract.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
from collections import Counter
from pathlib import Path

import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
SOURCE = ROOT / 'Kaynaklar/ogm-materyal'
OUT = APP / 'veri/pdf-review-headings.json'
BRANCHES = {'Turkce': 'turkce', 'Turk Dili ve Edebiyati': 'edebiyat',
            'Matematik': 'matematik', 'Geometri': 'geometri', 'Tarih': 'tarih',
            'Cografya': 'cografya', 'Felsefe': 'felsefe', 'Din Kulturu': 'din',
            'Fizik': 'fizik', 'Kimya': 'kimya', 'Biyoloji': 'biyoloji',
            'Genel Denemeler': 'genel'}


def clean(text):
    return re.sub(r'\s+', ' ', text).strip()


def headings(doc, source_kind, tesseract):
    result = []
    seen = set()

    def add(text, page, method):
        text = clean(text)
        if len(text) < 4 or len(text) > 240 or text in seen or re.search(r'[\x00-\x1f\x7f-\x9f]', text):
            return
        if re.fullmatch(r'[\d\W]+', text) or re.search(r'^(?:ÖRNEK|SORU|ÇÖZÜM|CEVAP)\s*\d*\s*$', text, re.I):
            return
        seen.add(text)
        result.append({'text': text, 'page': page, 'method': method})

    for level, title, page in doc.get_toc():
        if level <= 3:
            add(title, page, 'outline')
    # Long course books: contents pages plus running headings, without reading body text.
    # Short presentations: cover and first three slides contain the unit and lesson.
    pages = range(min(len(doc), 4 if 'Sunular' in source_kind else 12))
    for index in pages:
        page = doc[index]
        blocks = page.get_text('dict', flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES)['blocks']
        for block in blocks:
            if 'lines' not in block:
                continue
            lines = block['lines']
            spans = [s for line in lines for s in line['spans'] if s['text'].strip()]
            if not spans:
                continue
            # Large display type is a heading. Small bold type counts only in the
            # page header. We deliberately discard all normal body-text blocks.
            size = max(s['size'] for s in spans)
            bold = any(s['flags'] & 16 for s in spans)
            top = block['bbox'][1] / page.rect.height
            if size >= 17 or (bold and size >= 10 and top < .18):
                add(' '.join(s['text'] for s in spans), index + 1, 'heading_font')
        # Raster summaries have their title in the upper band, not in the text layer.
        useful = [h for h in result if h['page'] == index + 1 and len(h['text']) > 12
                  and not re.search(r'OGM|MÜDÜRLÜ|MATERYAL|OR N|ÖR N', h['text'])]
        if index == 0 and (not useful or source_kind.startswith('Konu Özetleri')) and (APP / 'veri/tessdata/tur.traineddata').is_file():
            # OGM landscape summaries put the title on the narrow KONU line.
            # OCR only that line, never the paragraph or example-question columns.
            title_spans = [s for b in blocks if 'lines' in b for line in b['lines'] for s in line['spans']
                           if s['text'].strip() == 'KONU']
            top = title_spans[0]['bbox'][1] - 3 if title_spans else (70 if page.rect.width > page.rect.height else 130)
            bottom = title_spans[0]['bbox'][3] + 3 if title_spans else top + 38
            band = pymupdf.Rect(page.rect.width * .085, top, page.rect.width * .98, bottom)
            pix = page.get_pixmap(matrix=pymupdf.Matrix(4, 4), clip=band)
            with pymupdf.open('pdf', pix.pdfocr_tobytes(language='tur', tessdata=str(APP / 'veri/tessdata'))) as ocr:
                for line in ocr[0].get_text().splitlines():
                    add(line, index + 1, 'heading_ocr')
        elif index < 2 and not useful and tesseract:
            band = pymupdf.Rect(0, 0, page.rect.width, page.rect.height * .14)
            pix = page.get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=band)
            with tempfile.TemporaryDirectory(prefix='ivme-heading-') as temporary:
                png = Path(temporary) / 'header.png'
                pix.save(png)
                run = subprocess.run([tesseract, str(png), 'stdout', '-l', 'tur',
                                      '--tessdata-dir', str(APP / 'veri/tessdata'), '--psm', '11'],
                                     capture_output=True, timeout=35)
                for line in run.stdout.decode('utf8', errors='replace').splitlines():
                    add(line, index + 1, 'heading_ocr')
    return result[:250]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--tesseract', default=shutil.which('tesseract'))
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'veri-hatti/ogm-indirme/katalog.json').read_text(encoding='utf8'))
    rows = [dict(r) for r in catalog if not r.get('dosya') or r['dosya'].lower().endswith('.pdf')]
    known = {r['dosya'].replace('\\', '/') for r in rows if r.get('dosya')}
    for pdf in sorted(SOURCE.rglob('*.pdf')):
        relative = pdf.relative_to(SOURCE).as_posix()
        if relative in known:
            continue
        parts = pdf.relative_to(SOURCE).parts
        ident = 100000 + int(hashlib.sha256(relative.encode()).hexdigest()[:7], 16)
        rows.append({'id': ident, 'dosya': relative, 'baslik': re.sub(r'^\d+\s*-\s*', '', pdf.stem),
                     'ders': BRANCHES.get(parts[0], 'genel'),
                     'sinav': 'TYT-AYT' if 'TYT-AYT' in parts[1] else parts[1],
                     'kaynak': parts[2] if len(parts) > 3 else pdf.stem})
    old = {r['id']: r for r in json.loads(OUT.read_text(encoding='utf8'))['sources']} if OUT.exists() else {}
    sources = []
    for n, row in enumerate(rows):
        path = SOURCE / row['dosya'] if row.get('dosya') else None
        stat = path.stat() if path and path.is_file() else None
        stamp = [stat.st_size, stat.st_mtime_ns] if stat else None
        previous = old.get(row['id'])
        if not args.refresh and previous and previous.get('headingVersion') == 3 and previous.get('stamp') == stamp and previous.get('sourceTitle') == row['baslik']:
            sources.append(previous)
            continue
        grade = re.search(r'(9|10|11|12)\.\s*S[ıiIİ]n[ıiIİ]f', row['kaynak'])
        entry = {'id': row['id'], 'sourceTitle': row['baslik'], 'exam': row['sinav'] if row['sinav'] in ('TYT', 'AYT', 'TYT-AYT') else 'TYT-AYT',
                 'subjectId': row['ders'], 'source': row['kaynak'], 'relativePath': row.get('dosya') or '',
                 'grade': int(grade[1]) if grade else None, 'stamp': stamp,
                 'availability': 'available' if stat else 'missing_file' if path else 'video_only',
                 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest() if stat else None,
                 'headings': [], 'pageCount': None, 'headingVersion': 3}
        if stat:
            with pymupdf.open(path) as doc:
                entry['pageCount'] = len(doc)
                entry['headings'] = headings(doc, row['kaynak'], args.tesseract)
        sources.append(entry)
        if n % 100 == 0:
            print(f'Headings: {n + 1}/{len(rows)}', flush=True)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({'version': 1, 'sources': sources}, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps({'sources': len(sources), 'availability': dict(Counter(r['availability'] for r in sources)),
                      'withInternalHeadings': sum(bool(r['headings']) for r in sources)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
