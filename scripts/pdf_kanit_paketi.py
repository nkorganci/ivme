"""Versioned, stage-keyed evidence pack for one PDF (TAS-07).

The original PDF is only read. Per physical page the pack records geometry, text
blocks (stable ids, reading order, bbox + coordinate space), equation candidates,
tables, figure regions with rendered crops, caption/label links, OCR references and
a page disposition. Every stage is keyed by
`sourceSha256 + page + extractorVersion + parameterHash` (+ the upstream stage hash),
so a changed parameter, prompt or catalogue name re-runs only the stage it affects.
No model is called. OCR runs only for a page that has no usable text layer, only when
asked, and the shared OCR caches are consulted first.

Machine output is evidence, never approval: equations stay `UNVERIFIED`, topic links
are candidates, and human decisions live outside the regenerable pack.
"""
import argparse
import contextlib
from functools import lru_cache
import hashlib
import io
import json
import os
import re
import sys
import time
from pathlib import Path

import numpy
import pymupdf

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent / 'Kaynaklar'
OUT = APP / 'veri/pdf-kanit'
DECISIONS = APP / 'veri/content-labels/pdf-kanit-kararlar'
TESSDATA = APP / 'veri/tessdata'

SCHEMA = 'ivme.pdf-kanit/v1'
LAYOUT_VERSION = 'kanit-layout-v1'
CROP_VERSION = 'kanit-crop-v1'
OCR_VERSION = 'kanit-ocr-lines-v1'
TOOL = f'pymupdf-{pymupdf.VersionBind}'
COORDINATES = {'unit': 'pt', 'origin': 'top-left', 'yAxis': 'down', 'rotationApplied': True,
               'note': 'PyMuPDF page space after the page /Rotate entry; the same space crop clips use'}

LAYOUT_PARAMS = {
    'textLayerMinChars': 25, 'minFigureEdgePt': 18, 'minFigureAreaRatio': 0.003,
    'backgroundAreaRatio': 0.6, 'mergeGapPt': 6, 'labelMaxChars': 24, 'labelReachPt': 8,
    'captionGapPt': 40, 'captionOverlap': 0.3, 'gutterMinPt': 10, 'decorPageRatio': 0.4,
    'decorMinPages': 3, 'tableMinRows': 2, 'tableMinCols': 2, 'tableMaxPageRatio': 0.85,
    'tableMinFilled': 0.5, 'tableMinLineItems': 4, 'equationScore': 0.35, 'containsMathScore': 0.08,
    'garbledProblemRatio': 0.05, 'privateUseProblemRatio': 0.2, 'blankInkRatio': 0.0005,
    'renderDpi': 72, 'rasterBodyAreaRatio': 0.25,
}
CROP_PARAMS = {'dpi': 144, 'paddingPt': 3}
OCR_PARAMS = {'dpi': 144, 'language': 'tur', 'inkClosePt': 9, 'inkMinEdgePt': 24, 'inkDark': 160}

MATH_FONT = re.compile(r'(?i)math|symbol|mtextra|mtsy|mtmi|cmmi|cmsy|cmex|cmr\d|euclid|stix|equation')
OPERATORS = set('=+<>^*×÷−±∓√∛∜∑∏∫∬∮∂∇∞≈≠≡≤≥∈∉⊂⊃⊆⊇∪∩∅∀∃∧∨¬→←↔⇒⇔°′″∠⊥∥△π')
RELATIONS = set('=<>≈≠≡≤≥∈∉⊂⊃⊆⊇→⇒⇔')
GREEK = re.compile('[Α-Ωα-ω]')
SUPERSUB = set('²³¹⁰⁴⁵⁶⁷⁸⁹⁺⁻⁼⁽⁾ⁿ₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎')
MINUS_VARIANTS = set('-−–—‐‑‒')
LONG_WORD = re.compile(r'[^\W\d_]{4,}')
CAPTION = re.compile(r'^\s*(Şekil|Sekil|Resim|Grafik|Tablo|Çizim|Cizim|Figure|Fig\.)\s*[-–.:]?\s*\d+', re.I)
PRIVATE_USE = re.compile(f'[{chr(0xE000)}-{chr(0xF8FF)}]')
REPLACEMENT = chr(0xFFFD)
VERIFY_NEEDS = 'SIGN_EXPONENT_RADICAL_FRACTION_INDEX_INEQUALITY'
LOCK_STALE_SECONDS = 1800


# ---------------------------------------------------------------- identity and files

def canon(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest_of(value):
    return hashlib.sha256(canon(value).encode()).hexdigest()


def file_sha256(path):
    value = hashlib.sha256()
    with open(path, 'rb') as stream:
        for chunk in iter(lambda: stream.read(1 << 20), b''):
            value.update(chunk)
    return value.hexdigest()


def write_json(path, value, indent=None):
    """Atomic: a half-written file never looks like a finished stage."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f'{path.name}.tmp.{os.getpid()}')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=indent,
                                    separators=None if indent else (',', ':')) + '\n', encoding='utf-8')
    os.replace(temporary, path)


def write_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f'{path.name}.tmp.{os.getpid()}')
    temporary.write_bytes(data)
    os.replace(temporary, path)


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def pack_dir(sha, out=None):
    return (out or OUT) / sha[:2] / sha


def rounded(values, digits=2):
    return [round(float(v), digits) for v in values]


def union(rects):
    result = pymupdf.Rect(rects[0])
    for rect in rects[1:]:
        result |= rect
    return result


def grow(rect, amount):
    return pymupdf.Rect(rect.x0 - amount, rect.y0 - amount, rect.x1 + amount, rect.y1 + amount)


def short_id(prefix, *parts):
    return f'{prefix}-{hashlib.sha256(canon(parts).encode()).hexdigest()[:12]}'


def page_range(spec, count):
    if not spec:
        return list(range(1, count + 1))
    pages = []
    for part in spec.split(','):
        start, _, end = part.partition('-')
        pages += range(int(start), int(end or start) + 1)
    return sorted({page for page in pages if 1 <= page <= count})


class PackBusy(RuntimeError):
    pass


class PackLock:
    """One owner per pack; a lock that stops being touched is taken over."""

    def __init__(self, directory):
        self.path = directory / '.kilit'
        self.held = False

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        for _ in range(2):
            try:
                handle = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(handle, str(os.getpid()).encode())
                os.close(handle)
                self.held = True
                return self
            except FileExistsError:
                if time.time() - self.path.stat().st_mtime > LOCK_STALE_SECONDS:
                    self.path.unlink(missing_ok=True)
                    continue
                raise PackBusy(f'Paket başka bir süreçte işleniyor: {self.path.parent.name}')
        raise PackBusy('Kilit alınamadı')

    def touch(self):
        os.utime(self.path)

    def __exit__(self, *exc):
        if self.held:
            self.path.unlink(missing_ok=True)


# ---------------------------------------------------------------- text and math

def text_lines(page):
    """Native text lines with span facts; whitespace-only lines are dropped.

    PyMuPDF reports text, image and drawing geometry in the unrotated page space; every box
    here is moved into the displayed (page.rect) space, the one crops are rendered in.
    """
    lines, matrix = [], page.rotation_matrix
    for block in page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
        if block['type'] != 0:
            continue
        for line in block['lines']:
            text = ''.join(span['text'] for span in line['spans']).strip()
            if text:
                lines.append({'text': text, 'bbox': pymupdf.Rect(line['bbox']) * matrix, 'block': block['number'],
                              'spans': [(span['font'], span['size'], span['flags'], span['text']) for span in line['spans']]})
    return lines


def math_profile(lines):
    """Facts about math-looking content. A score is a hint, never proof of correctness."""
    text = '\n'.join(line['text'] for line in lines)
    compact = ''.join(text.split())
    total = max(1, len(compact))
    operators = sum(c in OPERATORS for c in compact)
    greek = len(GREEK.findall(compact))
    supsub = sum(c in SUPERSUB for c in compact)
    math_font = sum(len(s[3].strip()) for line in lines for s in line['spans'] if MATH_FONT.search(s[0] or ''))
    flagged_super = sum(len(s[3].strip()) for line in lines for s in line['spans'] if s[2] & 1)
    score = min(1.0, (operators + greek + supsub + math_font + flagged_super) / total)
    risks = []
    if len({c for c in compact if c in MINUS_VARIANTS}) >= 2:
        risks.append('MINUS_VARIANTS')
    if PRIVATE_USE.search(text):
        risks.append('PRIVATE_USE_GLYPH')
    if REPLACEMENT in text or '(cid:' in text:
        risks.append('REPLACEMENT_OR_CID_GLYPH')
    if flagged_super:
        risks.append('SUPERSCRIPT_SPANS')
    short = [line for line in lines if len(line['text']) <= 12]
    if any(abs((a['bbox'].x0 + a['bbox'].x1) / 2 - (b['bbox'].x0 + b['bbox'].x1) / 2) <= 6
           and 0 <= b['bbox'].y0 - a['bbox'].y1 < 1.5 * (a['bbox'].height or 1) for a, b in zip(short, short[1:])):
        risks.append('STACKED_SHORT_LINES')
    return {'score': round(score, 3), 'relation': any(c in RELATIONS for c in compact),
            'longWords': len(LONG_WORD.findall(text)), 'risks': risks, 'chars': len(compact)}


def classify_text(profile, params):
    equation = profile['score'] >= params['equationScore'] or (
        profile['relation'] and profile['longWords'] == 0 and 0 < profile['chars'] <= 120)
    return ('EQUATION' if equation else 'TEXT'), bool(equation or profile['score'] >= params['containsMathScore'] or profile['relation'])


def text_quality(text, params):
    compact = ''.join(text.split())
    total = max(1, len(compact))
    broken = text.count(REPLACEMENT) + 5 * text.count('(cid:')
    private = len(PRIVATE_USE.findall(text))
    return {'chars': len(text.strip()), 'alphaChars': sum(c.isalpha() for c in text), 'garbledRatio': round(broken / total, 4), 'privateUseRatio': round(private / total, 4),
            'unreliable': broken / total >= params['garbledProblemRatio'] or private / total >= params['privateUseProblemRatio']}


def block_record(sha, number, rect, text, members, fonts, source, role, table_id):
    profile = math_profile(members)
    kind, contains = classify_text(profile, LAYOUT_PARAMS)
    if role != 'body':
        kind, contains = 'TEXT', False
    text_sha = hashlib.sha256(text.encode()).hexdigest()
    risks = profile['risks'] + (['OCR_MATH_UNRELIABLE'] if source == 'OCR' else [])
    return {'id': short_id('blk' if source == 'TEXT_LAYER' else 'ocr', sha, number, rounded(rect, 1), text_sha[:16]),
            'kind': kind, 'role': role, 'source': source, 'bbox': rounded(rect), 'lines': len(members), 'text': text,
            'textSha256': text_sha, 'fonts': fonts, 'tableId': table_id, 'containsMath': contains,
            'mathScore': profile['score'], 'mathRisks': risks if contains else [],
            'verification': {'state': 'UNVERIFIED', 'needs': VERIFY_NEEDS} if contains else None}


# ---------------------------------------------------------------- reading order

def find_gutter(rects, width, params):
    """Widest vertical empty strip near the middle with several blocks on both sides."""
    narrow = [r for r in rects if r.width < 0.7 * width]
    lo, hi = int(0.25 * width), int(0.75 * width)
    covered = numpy.zeros(max(1, hi - lo), dtype=bool)
    for rect in narrow:
        covered[max(0, int(rect.x0) - lo):max(0, int(rect.x1) - lo + 1)] = True
    best, start = None, None
    for index in range(len(covered) + 1):
        free = index < len(covered) and not covered[index]
        if free and start is None:
            start = index
        elif not free and start is not None:
            if index - start >= params['gutterMinPt'] and (best is None or index - start > best[1] - best[0]):
                best = (start, index)
            start = None
    if best is None:
        return None
    x0, x1 = lo + best[0], lo + best[1]
    if sum(r.x1 <= x0 + 1 for r in narrow) >= 2 and sum(r.x0 >= x1 - 1 for r in narrow) >= 2:
        return x0, x1
    return None


def reading_order(rects, gutter):
    """Indices in reading order: left column then right column inside full-width bands."""
    indices = sorted(range(len(rects)), key=lambda i: (rects[i].y0, rects[i].x0))
    if gutter is None:
        return indices
    order, left, right = [], [], []

    def flush():
        order.extend(left + right)
        left.clear()
        right.clear()

    for i in indices:
        rect = rects[i]
        if rect.x0 < gutter[0] and rect.x1 > gutter[1]:
            flush()
            order.append(i)
        elif (rect.x0 + rect.x1) / 2 < sum(gutter) / 2:
            left.append(i)
        else:
            right.append(i)
    flush()
    return order


# ---------------------------------------------------------------- tables and figures

def find_tables(page, drawings, params):
    """Ruled tables only; a page without ruling lines is not searched."""
    if sum(item[0] in ('l', 're', 'qu') for d in drawings for item in d['items']) < params['tableMinLineItems']:
        return [], None
    page_area = page.rect.get_area()
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            found = page.find_tables().tables
    except Exception as error:
        return [], f'{type(error).__name__}: {error}'
    tables = []
    for table in found:
        rect = pymupdf.Rect(table.bbox) * page.rotation_matrix
        if table.row_count < params['tableMinRows'] or table.col_count < params['tableMinCols']:
            continue
        if rect.get_area() > params['tableMaxPageRatio'] * page_area:
            continue
        cells = [[(cell or '').strip() for cell in row] for row in table.extract()]
        filled = sum(bool(cell) for row in cells for cell in row) / max(1, sum(len(row) for row in cells))
        if filled < params['tableMinFilled']:
            continue
        tables.append({'bbox': rounded(rect), 'rows': table.row_count, 'cols': table.col_count, 'header': cells[0][:12],
                       'cells': [row[:24] for row in cells[:60]], 'cellsSha256': digest_of(cells), 'method': 'find_tables'})
    return tables, None


def image_key(info, rect):
    """Identity of a placed image: its object when known, else position, pixel size and pixel digest."""
    xref = info.get('xref') or 0
    digest = info.get('digest')
    return ('x', xref) if xref else ('s', *[round(v) for v in rect], info['width'], info['height'],
                                     digest.hex() if isinstance(digest, bytes) else digest)


def decor_images(doc, params):
    """Images repeated on many pages (logos, banners, watermarks), found once per document.

    Repetition needs the same object or the same position, size and pixel digest, so a title
    banner that changes from slide to slide stays a figure.
    """
    seen = {}
    for page in doc:
        for info in page.get_image_info(xrefs=True):
            rect = (pymupdf.Rect(info['bbox']) * page.rotation_matrix) & page.rect
            if not rect.is_empty:
                seen.setdefault(image_key(info, rect), set()).add(page.number)
    limit = max(params['decorMinPages'], params['decorPageRatio'] * doc.page_count)
    if doc.page_count <= params['decorMinPages']:
        return []
    return sorted([list(key) for key, pages in seen.items() if len(pages) >= limit], key=canon)


def figure_regions(page, drawings, decor, tables, params):
    """Raster and vector candidates merged into regions; backgrounds and decor are listed apart."""
    page_rect, page_area, matrix = page.rect, page.rect.get_area(), page.rotation_matrix
    pieces, background, decorated = [], [], []
    for info in page.get_image_info(xrefs=True):
        rect = (pymupdf.Rect(info['bbox']) * matrix) & page_rect
        if rect.is_empty or rect.get_area() <= 0:
            continue
        xref = info.get('xref') or None
        if image_key(info, rect) in decor:
            decorated.append({'bbox': rounded(rect), 'xref': xref})
        elif rect.get_area() >= params['backgroundAreaRatio'] * page_area:
            background.append({'bbox': rounded(rect), 'xref': xref, 'kind': 'PAGE_IMAGE'})
        else:
            pieces.append((rect, 'raster', xref))
    try:
        clusters = page.cluster_drawings(drawings=drawings)
    except Exception:
        clusters = []
    table_rects = [pymupdf.Rect(t['bbox']) for t in tables]
    for rect in clusters:
        rect = (pymupdf.Rect(rect) * matrix) & page_rect
        if rect.is_empty or any((rect & t).get_area() >= 0.7 * min(rect.get_area(), t.get_area()) for t in table_rects):
            continue
        if rect.get_area() >= params['backgroundAreaRatio'] * page_area:
            background.append({'bbox': rounded(rect), 'xref': None, 'kind': 'VECTOR_LAYOUT'})
        else:
            pieces.append((rect, 'vector', None))
    regions = [{'rect': pymupdf.Rect(r), 'kinds': {k}, 'xrefs': {x} if x else set()} for r, k, x in pieces]
    merged = True
    while merged:
        merged = False
        for i, a in enumerate(regions):
            for j in range(i + 1, len(regions)):
                if grow(a['rect'], params['mergeGapPt']).intersects(regions[j]['rect']):
                    a['rect'] |= regions[j]['rect']
                    a['kinds'] |= regions[j]['kinds']
                    a['xrefs'] |= regions[j]['xrefs']
                    del regions[j]
                    merged = True
                    break
            if merged:
                break
    keep = [r for r in regions if min(r['rect'].width, r['rect'].height) >= params['minFigureEdgePt']
            and r['rect'].get_area() >= params['minFigureAreaRatio'] * page_area]
    return keep, background, decorated


def attach_text(regions, lines, params):
    """Short nearby lines (axis labels, point names) belong to the figure; captions are found by prefix."""
    for region in regions:
        region['labelLines'] = []
        changed = True
        while changed:
            changed = False
            area = grow(region['rect'], params['labelReachPt'])
            for index, line in enumerate(lines):
                if index not in region['labelLines'] and len(line['text']) <= params['labelMaxChars'] and area.intersects(line['bbox']):
                    region['labelLines'].append(index)
                    region['rect'] |= line['bbox']
                    changed = True
        region['caption'] = None
        for index, line in enumerate(lines):
            if not CAPTION.match(line['text']) or index in region['labelLines']:
                continue
            gap_below = line['bbox'].y0 - region['rect'].y1
            gap_above = region['rect'].y0 - line['bbox'].y1
            overlap = (min(line['bbox'].x1, region['rect'].x1) - max(line['bbox'].x0, region['rect'].x0)) / max(1, min(line['bbox'].width, region['rect'].width))
            if (0 <= gap_below <= params['captionGapPt'] or 0 <= gap_above <= params['captionGapPt']) and overlap >= params['captionOverlap']:
                region['caption'] = index
                break
    return regions


def ink_figures(gray, scale, text_boxes, page_rect, params):
    """Figure regions on a scanned page: dark ink left after masking the OCR text."""
    import cv2
    ink = gray.copy()
    for rect in text_boxes:
        ink[max(0, int(rect.y0 * scale) - 2):int(rect.y1 * scale) + 3, max(0, int(rect.x0 * scale) - 2):int(rect.x1 * scale) + 3] = 255
    mask = (ink < params['inkDark']).astype(numpy.uint8)
    size = max(3, int(params['inkClosePt'] * scale)) | 1
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, numpy.ones((size, size), numpy.uint8))
    count, _, stats, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    rects = []
    for index in range(1, count):
        x, y, w, h, area = stats[index]
        rect = pymupdf.Rect(x / scale, y / scale, (x + w) / scale, (y + h) / scale)
        if min(rect.width, rect.height) < params['inkMinEdgePt']:
            continue
        if rect.width > 0.9 * page_rect.width and rect.height > 0.9 * page_rect.height:
            continue
        if area < 0.05 * w * h and max(rect.width, rect.height) > 0.8 * max(page_rect.width, page_rect.height):
            continue
        rects.append(rect)
    return sorted(rects, key=lambda r: (r.y0, r.x0))


def figure_record(sha, number, rect, kinds, xrefs, label_text=None, label_count=0, caption=None):
    wide = rect.height <= 60 and rect.width >= 4 * rect.height and set(kinds) == {'raster'}
    return {'id': short_id('fig', sha, number, rounded(rect, 1), sorted(xrefs), sorted(kinds)), 'bbox': rounded(rect),
            'sources': sorted(kinds), 'xrefs': sorted(xrefs), 'labelCount': label_count, 'labelText': label_text or None,
            'caption': caption, 'hints': ['WIDE_SHORT_MAY_BE_EQUATION_IMAGE'] if wide else [],
            'altText': {'candidate': caption or label_text or None, 'origin': 'CAPTION' if caption else ('LABELS' if label_text else None),
                        'state': 'CANDIDATE_UNREVIEWED'}}


# ---------------------------------------------------------------- stages

def render_certificate(page, dpi):
    pix = page.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY, alpha=False)
    gray = numpy.frombuffer(pix.samples, dtype=numpy.uint8).reshape(pix.height, pix.width).copy()
    return gray, {'dpi': dpi, 'pixels': [pix.width, pix.height], 'sha256': hashlib.sha256(pix.samples).hexdigest(),
                  'inkRatio': round(float((gray < 200).mean()), 5)}


def layout_key(sha, number, decor):
    return digest_of({'source': sha, 'page': number, 'extractor': LAYOUT_VERSION, 'tool': TOOL, 'params': LAYOUT_PARAMS, 'decor': decor})


def embedded_image_hashes(doc, xrefs, memo):
    """Hash of the original embedded bytes, so a crop can be tied back to the source image."""
    result = []
    for xref in xrefs:
        if xref not in memo:
            try:
                image = doc.extract_image(xref)
                memo[xref] = {'xref': xref, 'width': image.get('width'), 'height': image.get('height'),
                              'ext': image.get('ext'), 'sha256': hashlib.sha256(image['image']).hexdigest()}
            except Exception as error:
                memo[xref] = {'xref': xref, 'error': type(error).__name__}
        result.append(memo[xref])
    return result


def build_layout(page, sha, decor, memo, params=LAYOUT_PARAMS):
    """Everything the PDF itself says about one page: no OCR, no model."""
    number = page.number + 1
    lines = text_lines(page)
    text = '\n'.join(line['text'] for line in lines)
    quality = text_quality(text, params)
    _, render = render_certificate(page, params['renderDpi'])
    drawings = page.get_drawings()
    tables, table_error = find_tables(page, drawings, params)
    for table in tables:
        table['id'] = short_id('tbl', sha, number, table['bbox'], table['cellsSha256'][:16])
    regions, background, decorated = figure_regions(page, drawings, {tuple(k) for k in decor}, tables, params)
    regions = attach_text(regions, lines, params)
    figure_lines, caption_lines = {}, set()
    for position, region in enumerate(regions):
        for index in region['labelLines']:
            figure_lines[index] = position
        if region['caption'] is not None:
            caption_lines.add(region['caption'])
    table_of = {}
    for index, line in enumerate(lines):
        for table in tables:
            if grow(pymupdf.Rect(table['bbox']), 1).contains(line['bbox']):
                table_of[index] = table['id']
    gutter = find_gutter([line['bbox'] for line in lines], page.rect.width, params)

    def side(rect):
        if gutter is None or (rect.x0 < gutter[0] and rect.x1 > gutter[1]):
            return 'F'
        return 'L' if (rect.x0 + rect.x1) / 2 < sum(gutter) / 2 else 'R'

    grouped = {}
    for index, line in enumerate(lines):
        grouped.setdefault((line['block'], side(line['bbox'])), []).append(index)
    sizes = sorted(s[1] for line in lines for s in line['spans'] if s[3].strip())
    body_size = sizes[len(sizes) // 2] if sizes else 0
    pairs = []
    for indices in grouped.values():
        members = [lines[i] for i in indices]
        rect = union([m['bbox'] for m in members])
        if any(i in caption_lines for i in indices):
            role = 'caption'
        elif all(i in figure_lines for i in indices):
            role = 'figureLabel'
        elif max((s[1] for m in members for s in m['spans']), default=0) >= 1.3 * body_size and len(members) <= 2:
            role = 'heading'
        else:
            role = 'body'
        tables_here = {table_of.get(i) for i in indices}
        fonts = sorted({s[0] for m in members for s in m['spans'] if s[3].strip()})[:4]
        pairs.append((rect, block_record(sha, number, rect, '\n'.join(m['text'] for m in members), members, fonts,
                                         'TEXT_LAYER', role, tables_here.pop() if len(tables_here) == 1 else None)))
    order = reading_order([r for r, _ in pairs], gutter)
    blocks = [pairs[i][1] for i in order]
    for position, record in enumerate(blocks):
        record['order'] = position
    figures = []
    for region in sorted(regions, key=lambda r: (r['rect'].y0, r['rect'].x0)):
        rect = region['rect'] & page.rect
        label_text = ' '.join(lines[i]['text'] for i in sorted(region['labelLines'], key=lambda i: (lines[i]['bbox'].y0, lines[i]['bbox'].x0)))
        caption = lines[region['caption']]['text'] if region['caption'] is not None else None
        figure = figure_record(sha, number, rect, region['kinds'], region['xrefs'], label_text[:300], len(region['labelLines']), caption)
        figure['embeddedImages'] = embedded_image_hashes(page.parent, figure['xrefs'], memo)
        figures.append(figure)
    raster_area = sum(pymupdf.Rect(f['bbox']).get_area() for f in figures if 'raster' in f['sources']) / max(1, page.rect.get_area())
    blank_render = quality['chars'] == 0 and render['inkRatio'] < params['blankInkRatio']
    page_image = any(item['kind'] == 'PAGE_IMAGE' for item in background)
    need = None
    if blank_render:
        need = None
    elif quality['chars'] < params['textLayerMinChars']:
        need = 'NO_TEXT_LAYER'
    elif quality['unreliable']:
        need = 'TEXT_LAYER_UNRELIABLE'
    elif page_image or raster_area >= params['rasterBodyAreaRatio']:
        need = 'RASTER_BODY_POSSIBLE'
    # The whole page is kept as evidence when its content may live in an image the text layer cannot describe.
    page_render = not blank_render and (need in ('NO_TEXT_LAYER', 'TEXT_LAYER_UNRELIABLE') or page_image)
    return {'textLayer': {**quality, 'textSha256': hashlib.sha256(text.encode()).hexdigest(),
                          'usable': quality['chars'] >= params['textLayerMinChars'] and not quality['unreliable']},
            'render': render, 'columns': {'count': 2 if gutter else 1, 'gutterPt': list(gutter) if gutter else None},
            'blocks': blocks, 'tables': tables, 'tableError': table_error, 'figures': figures,
            'pageImages': background, 'decorImages': decorated, 'ocrNeed': need, 'pageRender': page_render}


def crop_key(upstream, sha):
    return digest_of({'source': sha, 'upstream': upstream, 'extractor': CROP_VERSION, 'tool': TOOL, 'params': CROP_PARAMS})


def build_crops(page, figures, directory, whole_page=False, params=CROP_PARAMS):
    """One PNG per figure region (plus the whole page when asked), named by content hash; identical crops are stored once."""
    crops = {}
    regions = [(figure['id'], grow(pymupdf.Rect(figure['bbox']), params['paddingPt']) & page.rect) for figure in figures]
    if whole_page:
        regions.append(('page', pymupdf.Rect(page.rect)))
    for key, rect in regions:
        pix = page.get_pixmap(clip=rect, dpi=params['dpi'], colorspace=pymupdf.csRGB, alpha=False)
        data = pix.tobytes('png')
        crop_sha = hashlib.sha256(data).hexdigest()
        target = directory / 'gorseller' / f'{crop_sha[:16]}.png'
        if not target.is_file() or hashlib.sha256(target.read_bytes()).hexdigest() != crop_sha:
            write_bytes(target, data)
        crops[key] = {'file': f'gorseller/{target.name}', 'sha256': crop_sha, 'pixels': [pix.width, pix.height],
                      'dpi': params['dpi'], 'clipPt': rounded(rect)}
    return crops


def ocr_model_sha():
    path = TESSDATA / 'tur.traineddata'
    return file_sha256(path) if path.is_file() else None


def ocr_key(sha, number, model_sha):
    return digest_of({'source': sha, 'page': number, 'extractor': OCR_VERSION, 'tool': TOOL, 'params': OCR_PARAMS, 'model': model_sha})


def shared_ocr(sha, number, model_sha):
    """Existing text-only OCR from the shared cache; nothing is run or written here."""
    if not model_sha:
        return None
    try:
        from pdf_ocr_cache import read_versions, preferred
        versions = read_versions(sha, number, model_sha)
        record = preferred(versions)
    except Exception:
        return None
    if not record:
        return None
    return {'extractorVersion': record['extractorVersion'], 'status': record['status'], 'textSha256': record['textSha256'],
            'modelSha256': record['modelSha256'], 'hasLines': bool(record.get('lines')), 'chars': len(record['text'].strip()),
            'versions': sorted(r['extractorVersion'] for r in versions)}


def build_ocr_lines(page, sha, params=OCR_PARAMS):
    """Local OCR with line boxes for one page; only called for pages that need it."""
    started = time.monotonic()
    number = page.number + 1
    pix = page.get_pixmap(dpi=params['dpi'], colorspace=pymupdf.csGRAY, alpha=False)
    rgb = pymupdf.Pixmap(pymupdf.csRGB, pix)
    with pymupdf.open('pdf', rgb.pdfocr_tobytes(language=params['language'], tessdata=str(TESSDATA))) as recognized:
        sheet = recognized[0]
        sx, sy = page.rect.width / sheet.rect.width, page.rect.height / sheet.rect.height
        found = []
        for block in sheet.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']:
            for line in block.get('lines', []):
                text = ''.join(span['text'] for span in line['spans']).strip()
                if text:
                    x0, y0, x1, y1 = line['bbox']
                    found.append({'text': text, 'bbox': pymupdf.Rect(x0 * sx, y0 * sy, x1 * sx, y1 * sy)})
    text = '\n'.join(line['text'] for line in found)
    gray, _ = render_certificate(page, params['dpi'])
    boxes = [line['bbox'] for line in found]
    figures = [figure_record(sha, number, rect, {'ink'}, set()) for rect in
              ink_figures(gray, params['dpi'] / 72, boxes, page.rect, params)]
    pairs = [(line['bbox'], block_record(sha, number, line['bbox'], line['text'],
                                         [{'text': line['text'], 'bbox': line['bbox'], 'spans': []}], [], 'OCR', 'body', None))
             for line in found]
    order = reading_order([r for r, _ in pairs], find_gutter([r for r, _ in pairs], page.rect.width, LAYOUT_PARAMS))
    blocks = [pairs[i][1] for i in order]
    for position, record in enumerate(blocks):
        record['order'] = position
    return {'status': 'EXTRACTED' if sum(c.isalpha() for c in text) >= 30 else 'UNREADABLE_OR_BLANK', 'text': text,
            'textSha256': hashlib.sha256(text.encode()).hexdigest(), 'blocks': blocks, 'figures': figures,
            'elapsedSeconds': round(time.monotonic() - started, 2)}


# ---------------------------------------------------------------- decisions (human, outside the pack)

def decisions_path(sha):
    return DECISIONS / f'{sha}.json'


def load_decisions(sha):
    return (read_json(decisions_path(sha)) or {}).get('pages', {})


def save_decision(sha, page, state, reviewer, note, render_sha):
    if state not in ('OUT_OF_SCOPE', 'TRULY_BLANK', 'COMPLETE'):
        raise ValueError('Karar OUT_OF_SCOPE, TRULY_BLANK veya COMPLETE olmalı')
    document = read_json(decisions_path(sha)) or {'sourceSha256': sha, 'pages': {}}
    document['pages'][str(page)] = {'state': state, 'reviewer': reviewer, 'note': note, 'renderSha256': render_sha,
                                    'recordedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}
    write_json(decisions_path(sha), document, indent=1)


# ---------------------------------------------------------------- disposition

def disposition(record, decision):
    """Three separate completeness measures; question acceptance is outside this pack."""
    layout, ocr, crops = record['layout'], record.get('ocr') or {}, record['crops']
    reasons, notes = [], []
    reference, lines = ocr.get('reference'), ocr.get('lines')
    ocr_ok = bool((lines and lines['status'] == 'EXTRACTED') or (reference and reference['status'] in ('EXTRACTED', 'BLANK_VERIFIED')))
    blank = (layout['textLayer']['chars'] == 0 and layout['render']['inkRatio'] < LAYOUT_PARAMS['blankInkRatio']) or (
        reference and reference['status'] == 'BLANK_VERIFIED' and layout['textLayer']['chars'] == 0)
    text_state = 'COMPLETE'
    need = layout['ocrNeed']
    if blank:
        text_state = 'BLANK'
    elif need in ('NO_TEXT_LAYER', 'TEXT_LAYER_UNRELIABLE'):
        if need == 'TEXT_LAYER_UNRELIABLE':
            reasons.append('TEXT_LAYER_UNRELIABLE')
        if not ocr_ok:
            evidence = lines or reference
            if need == 'NO_TEXT_LAYER' and evidence and layout['textLayer']['alphaChars'] >= 3:
                notes.append('SHORT_TEXT_PAGE')
            else:
                text_state = 'PROBLEM'
                reasons.append('OCR_UNREADABLE' if evidence else 'OCR_PENDING')
    elif need == 'RASTER_BODY_POSSIBLE' and not ocr_ok:
        notes.append('RASTER_CONTENT_TEXT_NOT_READ')
    if layout['tableError']:
        notes.append('TABLE_DETECTION_ERROR')
    figures = layout['figures'] + ((lines or {}).get('figures') or [])
    figure_state = 'NONE' if not figures else 'COMPLETE'
    if any(figure['id'] not in crops for figure in figures):
        figure_state = 'PROBLEM'
        reasons.append('FIGURE_CROP_MISSING')
    blocks = layout['blocks'] + ((lines or {}).get('blocks') or [])
    flagged = [b for b in blocks if b['verification']]
    overall = 'PROBLEM' if 'PROBLEM' in (text_state, figure_state) else ('TRULY_BLANK' if text_state == 'BLANK' else 'COMPLETE')
    result = {'overall': overall, 'text': text_state, 'figures': figure_state, 'equations': 'UNVERIFIED' if flagged else 'NONE',
              'questions': 'NOT_ASSESSED', 'reasons': sorted(set(reasons)), 'notes': notes,
              'counts': {'blocks': len(blocks), 'equationBlocks': sum(b['kind'] == 'EQUATION' for b in blocks),
                         'mathFlagged': len(flagged), 'tables': len(layout['tables']), 'figures': len(figures)},
              'decision': None}
    if decision:
        applied = decision['renderSha256'] == layout['render']['sha256']
        result['decision'] = {'state': decision['state'], 'reviewer': decision['reviewer'], 'note': decision['note'], 'applied': applied}
        if applied:
            result['overall'] = decision['state']
        else:
            result['decision']['reason'] = 'STALE_RENDER_HASH'
    return result


# ---------------------------------------------------------------- build

class Stats(dict):
    def __init__(self):
        super().__init__(pages=0, layoutBuilt=0, layoutReused=0, cropsBuilt=0, cropsReused=0, ocrBuilt=0, ocrReused=0,
                         ocrPending=0, repaired=0, failed=0, skippedPack=0, modelCalls=0, externalCalls=0)

    def add(self, other):
        for key, value in other.items():
            if key in self and isinstance(value, (int, float)):
                self[key] += value


def stage_valid(existing, name, key, output):
    stage = ((existing or {}).get('stages') or {}).get(name)
    return bool(stage) and stage.get('inputKey') == key and stage.get('state') == 'OK' and output is not None \
        and digest_of(output) == stage.get('outputSha256')


def build_page(doc, sha, number, directory, decor, decor_hash, memo, options, stats, decisions, model_sha):
    page = doc[number - 1]
    target = directory / 'sayfalar' / f'{number:04d}.json'
    existing = read_json(target)
    if existing and existing.get('schema') != SCHEMA + '.sayfa':
        existing = None
    record = {'schema': SCHEMA + '.sayfa', 'sourceSha256': sha, 'pageIndex': number, 'pageId': f'{sha[:12]}-p{number:04d}',
              'printedLabel': page.get_label() or None,
              'geometry': {'widthPt': round(page.rect.width, 2), 'heightPt': round(page.rect.height, 2),
                           'rotation': page.rotation, 'coordinates': COORDINATES}, 'stages': {}}
    key = layout_key(sha, number, decor_hash)
    if stage_valid(existing, 'layout', key, (existing or {}).get('layout')):
        layout, stage = existing['layout'], existing['stages']['layout']
        stats['layoutReused'] += 1
    else:
        stats['repaired'] += bool(existing)
        layout = build_layout(page, sha, decor, memo)
        stage = {'extractor': LAYOUT_VERSION, 'tool': TOOL, 'parameterHash': digest_of(LAYOUT_PARAMS)[:16], 'inputKey': key,
                 'outputSha256': digest_of(layout), 'state': 'OK'}
        stats['layoutBuilt'] += 1
    record['layout'], record['stages']['layout'] = layout, stage

    needs_ocr = layout['ocrNeed'] in ('NO_TEXT_LAYER', 'TEXT_LAYER_UNRELIABLE')
    ocr = {'reference': shared_ocr(sha, number, model_sha) if layout['ocrNeed'] else None, 'lines': None}
    okey = ocr_key(sha, number, model_sha)
    old_lines = ((existing or {}).get('ocr') or {}).get('lines')
    if needs_ocr and stage_valid(existing, 'ocr', okey, old_lines):
        ocr['lines'], record['stages']['ocr'] = old_lines, existing['stages']['ocr']
        stats['ocrReused'] += 1
    elif needs_ocr and (options.get('ocr_lines') or (options.get('ocr') and not ocr['reference'])):
        if not model_sha:
            raise RuntimeError('OCR modeli yok: veri/tessdata/tur.traineddata')
        ocr['lines'] = build_ocr_lines(page, sha)
        record['stages']['ocr'] = {'extractor': OCR_VERSION, 'tool': TOOL, 'parameterHash': digest_of(OCR_PARAMS)[:16],
                                   'inputKey': okey, 'outputSha256': digest_of(ocr['lines']), 'state': 'OK', 'modelSha256': model_sha}
        stats['ocrBuilt'] += 1
    elif ocr['reference']:
        stats['ocrReused'] += 1
    elif needs_ocr:
        stats['ocrPending'] += 1
    record['ocr'] = ocr if layout['ocrNeed'] else None

    figures = layout['figures'] + ((ocr['lines'] or {}).get('figures') or [])
    ckey = crop_key([stage['outputSha256'], (record['stages'].get('ocr') or {}).get('outputSha256')], sha)
    old_crops = (existing or {}).get('crops')
    wanted = [figure['id'] for figure in figures] + (['page'] if layout['pageRender'] else [])
    if (stage_valid(existing, 'crops', ckey, old_crops) and set(old_crops) == set(wanted)
            and all((directory / c['file']).is_file() and hashlib.sha256((directory / c['file']).read_bytes()).hexdigest() == c['sha256']
                    for c in old_crops.values())):
        record['crops'], record['stages']['crops'] = old_crops, existing['stages']['crops']
        stats['cropsReused'] += 1
    else:
        record['crops'] = build_crops(page, figures, directory, layout['pageRender'])
        record['stages']['crops'] = {'extractor': CROP_VERSION, 'tool': TOOL, 'parameterHash': digest_of(CROP_PARAMS)[:16],
                                     'inputKey': ckey, 'outputSha256': digest_of(record['crops']), 'state': 'OK'}
        stats['cropsBuilt'] += 1
    record['disposition'] = disposition(record, decisions.get(str(number)))
    write_json(target, record)
    stats['pages'] += 1
    return record


def open_pdf(path):
    pymupdf.TOOLS.mupdf_display_errors(False)
    pymupdf.TOOLS.mupdf_display_warnings(False)
    return pymupdf.open(path)


@lru_cache(maxsize=1)
def catalog_index():
    path = APP / 'backend/src/main/resources/pdf-review-labels.json'
    index = {}
    try:
        for item in json.loads(path.read_text(encoding='utf-8-sig'))['items']:
            index.setdefault(item.get('sourceSha256'), []).append(item)
    except (OSError, ValueError, KeyError):
        pass
    return index


def catalog_candidates(sha):
    """Existing automatic topic suggestions, carried as unreviewed candidates only."""
    return [{'key': item['key'], 'catalogId': item.get('catalogId'), 'title': item.get('title'),
             'categoryIds': item.get('suggestedCategoryIds', []), 'provenance': (item.get('automaticLabels') or {}).get('provenance'),
             'approval': 'AUTOMATIC_CANDIDATE_NOT_TEACHER_APPROVED'} for item in catalog_index().get(sha, [])]


def source_identity(path, sha, doc, relative, directory):
    """Identity of the bytes; every archive path that carried these bytes is kept (copies share one pack)."""
    info = doc.metadata or {}
    known = (read_json(directory / 'kaynak.json') or {}).get('paths', [])
    return {'schema': SCHEMA + '.kaynak', 'sourceSha256': sha, 'sizeBytes': Path(path).stat().st_size, 'pageCount': doc.page_count,
            'pdfMetadata': {k: info.get(k) for k in ('title', 'author', 'creator', 'producer', 'format') if info.get(k)},
            'paths': sorted(set(known) | ({relative} if relative else set())), 'original': 'READ_ONLY_NOT_COPIED',
            'catalogCandidates': catalog_candidates(sha)}


def current_versions():
    return {'layout': LAYOUT_VERSION, 'crop': CROP_VERSION, 'ocr': OCR_VERSION, 'tool': TOOL,
            'layoutParams': digest_of(LAYOUT_PARAMS)[:16], 'cropParams': digest_of(CROP_PARAMS)[:16]}


def repeated_figures(pages):
    """Figure boxes that recur on many pages (headers, ornaments): an annotation, never a deletion."""
    if len(pages) <= LAYOUT_PARAMS['decorMinPages']:
        return []
    seen = {}
    for number, record in pages.items():
        for figure in record['layout']['figures']:
            seen.setdefault((tuple(round(v) for v in figure['bbox']), tuple(figure['sources'])), set()).add(number)
    limit = max(LAYOUT_PARAMS['decorMinPages'], LAYOUT_PARAMS['decorPageRatio'] * len(pages))
    return [{'bbox': list(box), 'sources': list(kinds), 'pages': len(numbers)} for (box, kinds), numbers in sorted(seen.items())
            if len(numbers) >= limit]


def summarize(directory, sha, pages_expected):
    pages = {}
    for path in sorted((directory / 'sayfalar').glob('*.json')):
        record = read_json(path)
        if record:
            pages[record['pageIndex']] = record
    states, measures = {}, {'text': {}, 'figures': {}, 'equations': {}}
    totals = {'blocks': 0, 'equationBlocks': 0, 'mathFlagged': 0, 'tables': 0, 'figures': 0}
    pending, problems, math_pages, hashes = [], [], 0, []
    for number, record in sorted(pages.items()):
        d = record['disposition']
        states[d['overall']] = states.get(d['overall'], 0) + 1
        for key in measures:
            measures[key][d[key]] = measures[key].get(d[key], 0) + 1
        for key in totals:
            totals[key] += d['counts'][key]
        if 'OCR_PENDING' in d['reasons']:
            pending.append(number)
        if d['overall'] == 'PROBLEM':
            problems.append({'page': number, 'reasons': d['reasons']})
        math_pages += bool(d['counts']['mathFlagged'])
        hashes.append([number, record['stages']['layout']['outputSha256'], record['stages']['crops']['outputSha256'],
                       (record['stages'].get('ocr') or {}).get('outputSha256'), d['overall']])
    return {'schema': SCHEMA + '.ozet', 'sourceSha256': sha, 'pagesInPack': len(pages), 'pagesExpected': pages_expected,
            'complete': len(pages) == pages_expected, 'dispositions': states, 'measures': measures, 'totals': totals,
            'ocrPendingPages': pending, 'problemPages': problems[:200], 'pagesWithUnverifiedMath': math_pages,
            'repeatedFigures': repeated_figures(pages), 'packSha256': digest_of(hashes), 'versions': current_versions()}


def build_pack(path, pages=None, ocr=False, ocr_lines=False, relative=None, out=None, sha=None):
    """Create or refresh one pack. Returns (summary, stats). Unchanged stages are reused."""
    started = time.monotonic()
    path = Path(path)
    sha = sha or file_sha256(path)
    directory = pack_dir(sha, out)
    stats = Stats()
    previous = read_json(directory / 'ozet.json')
    if (previous and previous.get('complete') and not pages and not ocr_lines and not previous.get('failures')
            and previous['versions'] == current_versions() and not previous['ocrPendingPages']
            and previous.get('decisionsSha256') == digest_of(load_decisions(sha))
            and len(list((directory / 'sayfalar').glob('*.json'))) == previous['pagesExpected']
            and read_json(directory / 'kaynak.json')):
        stats['skippedPack'] = 1
        return previous, stats
    with PackLock(directory) as lock:
        doc = open_pdf(path)
        try:
            write_json(directory / 'kaynak.json', source_identity(path, sha, doc, relative, directory), indent=1)
            decor = decor_images(doc, LAYOUT_PARAMS)
            decor_hash = digest_of(decor)
            memo, decisions, model_sha, failures = {}, load_decisions(sha), ocr_model_sha(), []
            for number in page_range(pages, doc.page_count):
                try:
                    build_page(doc, sha, number, directory, decor, decor_hash, memo, {'ocr': ocr, 'ocr_lines': ocr_lines},
                               stats, decisions, model_sha)
                except Exception as error:
                    stats['failed'] += 1
                    failures.append({'page': number, 'error': f'{type(error).__name__}: {error}'})
                lock.touch()
            summary = summarize(directory, sha, doc.page_count)
            summary['failures'] = failures
            summary['decisionsSha256'] = digest_of(decisions)
            summary['complete'] = summary['complete'] and not failures
            write_json(directory / 'ozet.json', summary, indent=1)
            stats['elapsedSeconds'] = round(time.monotonic() - started, 2)
            write_json(directory / 'calisma.json', {'stats': stats, 'pages': pages or 'all'}, indent=1)
        finally:
            doc.close()
    return summary, stats


# ---------------------------------------------------------------- verify and view

def verify_pack(directory, pdf_path=None):
    """Integrity of what is on disk; stale versions are reported, not treated as corruption."""
    problems, stale = [], []
    source = read_json(directory / 'kaynak.json')
    if not source:
        return {'ok': False, 'problems': ['kaynak.json yok veya okunamıyor'], 'problemCount': 1, 'stalePages': []}
    sha = source['sourceSha256']
    if directory.name != sha:
        problems.append('Paket klasörü kaynak hash’iyle uyuşmuyor')
    if pdf_path and file_sha256(pdf_path) != sha:
        problems.append('PDF baytları paketin kaynak hash’inden farklı')
    seen_ids = set()
    pages = sorted((directory / 'sayfalar').glob('*.json'))
    for path in pages:
        record = read_json(path)
        if not record or record.get('sourceSha256') != sha:
            problems.append(f'{path.name}: okunamıyor veya kaynak uyuşmuyor')
            continue
        layout, stages = record['layout'], record['stages']
        if digest_of(layout) != stages['layout']['outputSha256']:
            problems.append(f'{path.name}: layout çıktısı hash’iyle uyuşmuyor')
        if digest_of(record['crops']) != stages['crops']['outputSha256']:
            problems.append(f'{path.name}: crops çıktısı hash’iyle uyuşmuyor')
        lines = (record.get('ocr') or {}).get('lines')
        if lines and digest_of(lines) != stages['ocr']['outputSha256']:
            problems.append(f'{path.name}: ocr çıktısı hash’iyle uyuşmuyor')
        width, height = record['geometry']['widthPt'], record['geometry']['heightPt']
        blocks = layout['blocks'] + ((lines or {}).get('blocks') or [])
        figures = layout['figures'] + ((lines or {}).get('figures') or [])
        for item in blocks + figures + layout['tables']:
            x0, y0, x1, y1 = item['bbox']
            if not (-1 <= x0 < x1 <= width + 1 and -1 <= y0 < y1 <= height + 1):
                problems.append(f'{path.name}: {item["id"]} bbox sayfa dışında')
            if item['id'] in seen_ids:
                problems.append(f'{path.name}: yinelenen kimlik {item["id"]}')
            seen_ids.add(item['id'])
        for figure in figures:
            if figure['id'] not in record['crops']:
                problems.append(f'{path.name}: {figure["id"]} için kırpım yok')
        if layout['pageRender'] and 'page' not in record['crops']:
            problems.append(f'{path.name}: sayfa görüntüsü kırpımı yok')
        for crop in record['crops'].values():
            file = directory / crop['file']
            if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != crop['sha256']:
                problems.append(f'{path.name}: {crop["file"]} eksik veya hash’i farklı')
        if sorted(b['order'] for b in layout['blocks']) != list(range(len(layout['blocks']))):
            problems.append(f'{path.name}: okuma sırası ardışık değil')
        layout_stage = stages['layout']
        if (layout_stage['extractor'], layout_stage['tool'], layout_stage['parameterHash']) != (LAYOUT_VERSION, TOOL, digest_of(LAYOUT_PARAMS)[:16]):
            stale.append(record['pageIndex'])
    if any(directory.rglob('*.tmp.*')):
        problems.append('Yarım kalmış geçici dosya var')
    return {'ok': not problems, 'pages': len(pages), 'problems': problems[:100], 'problemCount': len(problems), 'stalePages': stale[:200]}


def page_view(record, repeated=()):
    """One consumer-facing page: blocks (text layer, then OCR) in reading order, figures with their crops."""
    layout, lines = record['layout'], (record.get('ocr') or {}).get('lines') or {}
    again = {(tuple(item['bbox']), tuple(item['sources'])) for item in repeated}
    blocks = sorted(layout['blocks'], key=lambda b: b['order']) + sorted(lines.get('blocks') or [], key=lambda b: b['order'])
    figures = [{**figure, 'crop': record['crops'].get(figure['id']),
                'repeatedAcrossPages': (tuple(round(v) for v in figure['bbox']), tuple(figure['sources'])) in again}
               for figure in layout['figures'] + (lines.get('figures') or [])]
    return {'pageId': record['pageId'], 'pageIndex': record['pageIndex'], 'printedLabel': record['printedLabel'],
            'geometry': record['geometry'], 'blocks': blocks, 'tables': layout['tables'], 'figures': figures,
            'pageCrop': record['crops'].get('page'),
            'ocrReference': (record.get('ocr') or {}).get('reference'), 'disposition': record['disposition']}


# ---------------------------------------------------------------- source lookup

def registry_files():
    return (read_json(APP / 'veri/pdf-source-registry/manifest.json') or {'files': []})['files']


def known_hash(path):
    """Skip rehashing unchanged files by trusting the registry manifest on (size, mtime)."""
    try:
        relative = Path(path).resolve().relative_to(ROOT.resolve()).as_posix()
    except ValueError:
        return None, None
    stat = Path(path).stat()
    for item in registry_files():
        if item['path'] == relative and (item['size'], item['mtimeNs']) == (stat.st_size, stat.st_mtime_ns):
            return item['sha256'], relative
    return None, relative


def resolve_pdf(spec):
    """A path, or a registry path / source hash prefix."""
    path = Path(spec)
    if path.is_file():
        return path.resolve()
    for item in registry_files():
        if item['sha256'].startswith(spec) or item['path'] == spec:
            return ROOT / item['path']
    raise SystemExit(f'PDF bulunamadı: {spec}')


def run_one(job):
    path, pages, ocr, ocr_lines = job
    sha, relative = known_hash(path)
    try:
        summary, stats = build_pack(path, pages, ocr, ocr_lines, relative, sha=sha)
        return {'path': str(path), 'sha256': summary['sourceSha256'], 'summary': summary, 'stats': dict(stats), 'error': None}
    except Exception as error:
        return {'path': str(path), 'sha256': sha, 'summary': None, 'stats': {}, 'error': f'{type(error).__name__}: {error}'}


def source_sha(spec):
    path = Path(spec)
    if path.is_file():
        return known_hash(path)[0] or file_sha256(path), path
    if len(spec) < 64:
        found = [d.name for d in OUT.glob(f'{spec[:2]}/{spec}*')]
        if len(found) != 1:
            raise SystemExit('Hash öneki tek pakete çözülemedi')
        return found[0], None
    return spec, None


# ---------------------------------------------------------------- command line

def say(value):
    getattr(sys.stdout, 'reconfigure', lambda **kw: None)(encoding='utf-8')
    print(json.dumps(value, ensure_ascii=False, indent=1))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    one = sub.add_parser('olustur', help='bir PDF için kanıt paketi üret veya tazele (değişmeyen aşamalar yeniden çalışmaz)')
    one.add_argument('pdf')
    one.add_argument('--sayfa', help='1 tabanlı fiziksel sayfa: 3 veya 2-5 veya 1,4')
    one.add_argument('--ocr', action='store_true', help='metin katmanı olmayan ve OCR önbelleği olmayan sayfaları yerel OCR ile oku')
    one.add_argument('--ocr-konum', action='store_true', help='metin katmanı olmayan sayfalarda satır konumlu OCR üret (önbellek olsa da)')
    many = sub.add_parser('toplu', help='birçok PDF: Kaynaklar altında klasör veya liste dosyası')
    many.add_argument('--klasor', help='örn. ogm-materyal/Matematik')
    many.add_argument('--liste', help='her satırı bir PDF yolu olan dosya')
    many.add_argument('--ilk', type=int)
    many.add_argument('--workers', type=int, default=2)
    many.add_argument('--ocr', action='store_true')
    check = sub.add_parser('dogrula', help='paket bütünlüğü: hash, bbox, kırpım dosyaları, yarım dosya')
    check.add_argument('kaynak', help='PDF yolu veya kaynak hash’i')
    show = sub.add_parser('goster', help='bir sayfanın birleşik görünümü')
    show.add_argument('kaynak')
    show.add_argument('--sayfa', type=int, required=True)
    brief = sub.add_parser('ozet', help='paket özeti')
    brief.add_argument('kaynak')
    decide = sub.add_parser('karar', help='insan inceleme kararı (paket dışında, sayfa görüntü hash’ine bağlı)')
    decide.add_argument('kaynak')
    decide.add_argument('--sayfa', type=int, required=True)
    decide.add_argument('--durum', required=True, choices=['OUT_OF_SCOPE', 'TRULY_BLANK', 'COMPLETE'])
    decide.add_argument('--inceleyen', required=True)
    decide.add_argument('--not', dest='note', required=True)
    sub.add_parser('pilot', help='matematik pilotu: örnekleme, iki geçiş, rapor').add_argument('--yaz', action='store_true')
    args = parser.parse_args(argv)

    if args.command == 'olustur':
        path = resolve_pdf(args.pdf)
        sha, relative = known_hash(path)
        summary, stats = build_pack(path, args.sayfa, args.ocr, args.ocr_konum, relative, sha=sha)
        say({'sourceSha256': summary['sourceSha256'], 'dispositions': summary['dispositions'], 'measures': summary['measures'],
             'totals': summary['totals'], 'ocrPendingPages': summary['ocrPendingPages'], 'stats': stats})
    elif args.command == 'toplu':
        from concurrent.futures import ProcessPoolExecutor, as_completed
        if args.liste:
            paths = [Path(line.strip()) for line in Path(args.liste).read_text(encoding='utf-8').splitlines() if line.strip()]
        elif args.klasor:
            paths = sorted((ROOT / args.klasor).rglob('*.pdf'))
        else:
            raise SystemExit('--klasor veya --liste gerekli')
        paths = paths[:args.ilk] if args.ilk else paths
        total, rows = Stats(), []
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(run_one, (str(p), None, args.ocr, False)) for p in paths]
            for future in as_completed(futures):
                row = future.result()
                rows.append(row)
                total.add(row['stats'])
                if len(rows) % 25 == 0:
                    print(json.dumps({'done': len(rows), 'of': len(paths)}), flush=True)
        say({'pdfs': len(paths), 'errors': [{'path': r['path'], 'error': r['error']} for r in rows if r['error']], 'stats': total})
        raise SystemExit(1 if any(r['error'] for r in rows) else 0)
    elif args.command == 'pilot':
        import pdf_kanit_pilot
        pdf_kanit_pilot.main(write=args.yaz)
    else:
        sha, path = source_sha(args.kaynak)
        directory = pack_dir(sha)
        if args.command == 'dogrula':
            result = verify_pack(directory, path)
            say(result)
            raise SystemExit(0 if result['ok'] else 1)
        if args.command == 'ozet':
            say(read_json(directory / 'ozet.json'))
            return
        record = read_json(directory / 'sayfalar' / f'{args.sayfa:04d}.json')
        if not record:
            raise SystemExit('Sayfa pakette yok; önce paketi üret')
        if args.command == 'goster':
            say(page_view(record, (read_json(directory / 'ozet.json') or {}).get('repeatedFigures', [])))
        else:
            save_decision(sha, args.sayfa, args.durum, args.inceleyen, args.note, record['layout']['render']['sha256'])
            say({'saved': str(decisions_path(sha)), 'page': args.sayfa, 'state': args.durum})


if __name__ == '__main__':
    main()
