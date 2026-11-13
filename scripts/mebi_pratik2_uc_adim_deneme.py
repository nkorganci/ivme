"""Bind 3 Adım mock keys by printed step/mock/section and vector table bar.

Discovery only: no answer inference, topic invention, or database writes.
The vertical step label is centred in a tall printed bar; its text bounding
box does NOT cover the first/last answer row. The original vector rectangle,
not proximity to the rotated text, establishes the table boundary.
"""
import hashlib
import json
import re
import time
from collections import Counter, defaultdict
import pymupdf
from mebi_pratik2_tam_pdf_tarama import BASE, SOURCE
from mebi_pratik2_konu_basligi import normalize
from yks_birlestirme import write_json, process_lock

OUT = BASE/'three-step-mock-discovery'
STEP = re.compile(r'(?:ayt |tyt )?([1-3]) adim ([1-5]) deneme$')
BODY = re.compile(r'^\s*(\d{1,2})\s*[.)](?:\s|$)')
SECTIONS = {
    'turkce': 'TUR', 'temel matematik': 'MAT', 'matematik': 'MAT',
    'sosyal bilimler': 'SOS', 'fen bilimleri': 'FEN',
    'turk dili ve edebiyati sosyal bilimler 1': 'TDE-SB1',
    'sosyal bilimler 2': 'SB2',
}
SHORT = {'tur': 'TUR', 'tem': 'MAT', 'temel matematik': 'MAT', 'mat': 'MAT',
         'sos': 'SOS', 'fen': 'FEN', 'fb': 'FEN', 'tde sb1': 'TDE-SB1', 'sb2': 'SB2'}


def step(text):
    m = STEP.fullmatch(normalize(text))
    return (int(m[1]), int(m[2])) if m else None


def section(text):
    return SECTIONS.get(normalize(text).removesuffix(' testi'))


def short_section(text):
    value = normalize(text)
    m = re.fullmatch(r'(?:ayt|tyt) (.+)', value)
    return SHORT.get(m[1]) if m else None


def body_identity(page):
    top = [l for l in page['lines'] if l['bbox'][1] < 76]
    steps = {s for l in top if (s := step(l['text']))}
    sections = {s for l in top if (s := short_section(l['text']))}
    return (*next(iter(steps)), next(iter(sections))) if len(steps) == len(sections) == 1 else None


def vector_bars(page):
    bars = set()
    for drawing in page.get_drawings():
        for item in drawing['items']:
            if item[0] != 're':
                continue
            r = item[1]
            if 35 < r.x0 < 85 and 10 < r.width < 35 and r.height > 80:
                bars.add(tuple(r))
    return sorted(bars)


def key_rows(page, bars):
    lines = page['lines']; groups = []; issues = []
    labels = [l for l in lines if step(l['text']) and l['bbox'][0] < 90]
    for label in labels:
        box = label['bbox']; cx = (box[0]+box[2])/2; cy = (box[1]+box[3])/2
        containing = [r for r in bars if r[0] <= cx <= r[2] and r[1] <= cy <= r[3]]
        if len(containing) != 1:
            issues.append({'reason': 'STEP_LABEL_VECTOR_BAR_NOT_UNIQUE', 'label': label}); continue
        bar = containing[0]
        titles = [l for l in lines if section(l['text']) and l['bbox'][0] > 100
                  and bar[1]-3 <= l['bbox'][1] < bar[3]]
        integers = [l for l in lines if re.fullmatch(r'\d{1,2}', l['text'].strip())
                    and 75 < l['bbox'][0] < 505 and bar[1] < l['bbox'][1] < bar[3]]
        rows = []
        for cell in sorted(integers, key=lambda l: l['bbox'][1]):
            if not rows or abs(cell['bbox'][1]-rows[-1][0]['bbox'][1]) > 2:
                rows.append([cell])
            else:
                rows[-1].append(cell)
        for row in rows:
            y = row[0]['bbox'][1]; nums = sorted(int(l['text']) for l in row)
            if len(nums) < 5 or nums != list(range(min(nums), max(nums)+1)):
                issues.append({'reason': 'NUMBER_HEADER_NOT_CONTIGUOUS', 'cells': row}); continue
            preceding = [l for l in titles if l['bbox'][1] < y]
            if not preceding:
                issues.append({'reason': 'KEY_SECTION_HEADING_MISSING', 'cells': row}); continue
            title = max(preceding, key=lambda l: l['bbox'][1])
            if y-title['bbox'][1] > 80:
                issues.append({'reason': 'KEY_SECTION_HEADING_TOO_DISTANT', 'cells': row}); continue
            cells = [l for l in lines if re.fullmatch(r'[ABCDE]', l['text'].strip())
                     and 8 < l['bbox'][1]-y < 24 and 75 < l['bbox'][0] < 505]
            answers = []; missing = []
            xs = sorted((l['bbox'][0]+l['bbox'][2])/2 for l in row)
            spacing = min(b-a for a, b in zip(xs, xs[1:]))
            for number in row:
                x = (number['bbox'][0]+number['bbox'][2])/2
                matches = [l for l in cells if abs((l['bbox'][0]+l['bbox'][2])/2-x) < spacing*.3]
                if len(matches) != 1:
                    missing.append(int(number['text'])); continue
                answers.append({'printedNumber': int(number['text']), 'answer': matches[0]['text'].strip(),
                                'numberBBox': number['bbox'], 'answerBBox': matches[0]['bbox']})
            groups.append({'step': step(label['text'])[0], 'mock': step(label['text'])[1],
                           'sectionId': section(title['text']), 'sectionHeading': title,
                           'stepLabel': label, 'vectorIdentityBar': list(bar), 'numberHeader': row,
                           'keyPage': page['physicalPage'], 'answers': answers, 'missingNumbers': missing})
    return groups, issues


def discover(native, bars_by_page):
    keys = defaultdict(list); bodies = defaultdict(list); issues = []; introductions = []
    for page in native['pages']:
        groups, problems = key_rows(page, bars_by_page.get(page['physicalPage'], []))
        issues.extend({'page': page['physicalPage'], **p} for p in problems)
        for group in groups:
            for answer in group['answers']:
                keys[(group['step'], group['mock'], group['sectionId'], answer['printedNumber'])].append((group, answer))
        identity = body_identity(page)
        if not identity or groups:
            continue
        width, height = page['rect'][2:]; anchors = []
        intro = [l for l in page['lines'] if 76 < l['bbox'][1] < 120 and 'bu testte' in normalize(l['text'])]
        if intro:
            introductions.append({'identity': list(identity), 'page': page['physicalPage'],
                                  'lines': [l for l in page['lines'] if 76 < l['bbox'][1] < 120]})
        for line in page['lines']:
            match = BODY.match(line['text']); x, y = line['bbox'][:2]
            if match and 80 < y < height-60 and (48 < x < 56 or width/2+3 < x < width/2+12):
                anchors.append({'printedNumber': int(match[1]), 'bbox': line['bbox'], 'text': line['text'],
                                'page': page['physicalPage'], 'column': int(x > width/2)})
        for anchor in anchors:
            next_y = [a['bbox'][1] for a in anchors if a['column'] == anchor['column'] and a['bbox'][1] > anchor['bbox'][1]+1]
            body = {**anchor, 'columnEndY': min(next_y)-3 if next_y else height-65}
            bodies[(*identity, anchor['printedNumber'])].append(body)
    bound = []; unmatched = []
    for identity in sorted(set(keys)|set(bodies)):
        k = keys.get(identity, []); b = bodies.get(identity, [])
        if len(k) == len(b) == 1:
            group, answer = k[0]
            bound.append({'step': identity[0], 'mock': identity[1], 'sectionId': identity[2],
                          'printedNumber': identity[3], 'answer': answer['answer'], 'body': b[0],
                          'keyPage': group['keyPage'], 'keyEvidence': group})
        else:
            unmatched.append({'identity': list(identity), 'keyOccurrences': len(k), 'bodyOccurrences': len(b),
                              'reason': 'PRINTED_MOCK_BODY_KEY_NOT_ONE_TO_ONE', 'studentVisible': False})
    return {'candidates': bound, 'unboundIdentities': unmatched, 'layoutIssues': issues,
            'printedSectionIntroductions': introductions, 'boundBodies': len(bound),
            'answerCells': sum(len(v) for v in keys.values()), 'bodyAnchors': sum(len(v) for v in bodies.values()),
            'status': 'PRINTED_STEP_MOCK_SECTION_BODY_KEY_BOUND_NOT_ADMITTED',
            'questionWrites': 0, 'teacherApprovalsCreated': 0, 'allPrintedQuestionsExtracted': False}


def run():
    OUT.mkdir(exist_ok=True); start = time.monotonic(); reports = []
    sources = json.loads((BASE/'full-pdf-coverage.json').read_text(encoding='utf8'))['documents']
    for source in sources:
        if '3 Adım Deneme Sınavları' not in source['relativePath']:
            continue
        target = OUT/(source['sourceSha256']+'.json')
        if target.exists():
            result = json.loads(target.read_text(encoding='utf8'))
        else:
            path = (SOURCE/source['relativePath']).resolve()
            if not path.is_relative_to(SOURCE): raise ValueError('Source leaves archive')
            with path.open('rb') as stream:
                if hashlib.file_digest(stream, 'sha256').hexdigest() != source['sourceSha256']:
                    raise ValueError('Source changed')
            native = json.loads((BASE/source['cache']).read_text(encoding='utf8')); bars = {}
            with pymupdf.open(path) as pdf:
                for page in native['pages']:
                    if any('cevap anahtar' in normalize(l['text']) for l in page['lines'][:10]):
                        bars[page['physicalPage']] = vector_bars(pdf[page['physicalPage']-1])
            result = {**source, **discover(native, bars)}; write_json(target, result)
        reports.append({k: result[k] for k in ('sourceSha256', 'relativePath', 'answerCells', 'bodyAnchors', 'boundBodies')})
        print(json.dumps({'sources': len(reports), 'boundBodies': sum(r['boundBodies'] for r in reports),
                          'elapsedSeconds': round(time.monotonic()-start, 1)}), flush=True)
    write_json(OUT/'report.json', {'sources': reports, 'status': 'MOCK_NATIVE_BINDING_NOT_ADMISSION',
                                 'boundBodies': sum(r['boundBodies'] for r in reports),
                                 'questionWrites': 0, 'allPrintedQuestionsExtracted': False})


if __name__ == '__main__':
    with process_lock(BASE/'.jobs/three-step-mock-discovery.lock'): run()
