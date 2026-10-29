"""Reconstruct generated OGM PDF positions from preserved provider question IDs.

No network, new IDs, rendering or answer changes. File naming/partitioning follows
the original sb_pdf generator and is checked against printed question numbers.
"""
from collections import Counter
import json
from pathlib import Path
import re
import sys

import pymupdf

APP = Path(__file__).resolve().parents[1]
DOWNLOAD = APP.parent / 'veri-hatti/ogm-indirme'


def source_parts(raw_by_code):
    sys.path.insert(0, str(DOWNLOAD))
    import sb_pdf
    from ortak import DERS, SINAV_KLASOR, ascii_ad
    structure = json.loads((DOWNLOAD / 'sb_yapi.json').read_text(encoding='utf-8'))
    for group, order, unit, questions in sb_pdf.uniteler(structure, ''):
        # Empty source cards were excluded by both original renderers.
        questions = [q for q in questions if f"sb-{q['id']}" in raw_by_code]
        if not questions:
            continue
        parts, current = [], []
        for question in questions:
            if len(current) >= sb_pdf.PARCA and question['kazanim'] != current[-1]['kazanim']:
                parts.append(current)
                current = []
            current.append(question)
        if current:
            parts.append(current)
        if len(parts) > 1 and len(parts[-1]) < 40:
            parts[-2].extend(parts.pop())
        subject, exam = sb_pdf.ders_sinav(group['urlKod'], group['sinif'])
        folder = f"OGM Soru Bankasi{' Fen Lisesi' if group['urlKod'].startswith('fl-') else ''} {group['sinif']}. Sinif"
        for index, part in enumerate(parts, 1):
            suffix = f' (Bolum {index})' if len(parts) > 1 else ''
            filename = ascii_ad(f"{order:02d} - {unit['ad']}") + suffix + '.pdf'
            relative = f'{DERS[subject][1]}/{SINAV_KLASOR[exam]}/{folder}/{filename}'
            yield relative, part


def printed_positions(observations):
    positions = {}
    duplicates = []
    for page in observations['pages']:
        for marker in page['examples']:
            if not re.fullmatch(r'Soru\s+\d+', marker['text'], re.I):
                continue
            number = marker['number']
            if number in positions:
                duplicates.append(number)
            positions[number] = page['page']
    return positions, duplicates


def printed_answers(path, observations):
    answers, conflicts = {}, []
    start = next((p['page'] for p in observations['pages'] if 'cevap anahtarı' in p['text'].casefold()), None)
    if start is None:
        return answers, ['NO_PRINTED_ANSWER_KEY']
    with pymupdf.open(path) as document:
        for page in list(document)[start - 1:]:
            page_answers = {}
            # Wrapped grid cells keep number/letter together in extraction order.
            for number_text, letter in re.findall(r'\b(\d{1,4})\.\s*([A-E])\b', page.get_text()):
                page_answers[int(number_text)] = letter
            words = page.get_text('words')
            rows = {}
            for word in words:
                if 30 < word[1] < page.rect.height - 30:
                    rows.setdefault(round(word[1] * 2) / 2, []).append(word)
            for row in rows.values():
                numbers = sorted((w for w in row if re.fullmatch(r'\d{1,4}\.', w[4])), key=lambda w: w[0])
                letters = sorted((w for w in row if re.fullmatch('[A-E]', w[4])), key=lambda w: w[0])
                # Chrome's grid output sometimes places the row's numbers in one
                # horizontal band and its letters in the next. Pair by rank only
                # when the complete row has exactly matching cardinalities.
                if not numbers or len(numbers) != len(letters):
                    continue
                inline=[];used=set();remaining=[]
                for number in numbers:
                    nearby=[letter for letter in letters if 0<=letter[0]-number[2]<5]
                    if len(nearby)==1 and tuple(nearby[0]) not in used:
                        inline.append((number,nearby[0]));used.add(tuple(nearby[0]))
                    else:remaining.append(number)
                free_letters=[letter for letter in letters if tuple(letter) not in used]
                separated_bands=bool(remaining) and len(remaining)==len(free_letters) and remaining[-1][2]<free_letters[0][0]
                pairs=inline+list(zip(remaining,free_letters)) if separated_bands else inline
                for word, letter_word in pairs:
                    number, letter = int(word[4][:-1]), letter_word[4]
                    if number in page_answers and page_answers[number] != letter and (word,letter_word) in inline:
                        conflicts.append(number)
                    else:
                        page_answers[number] = letter
            for number, letter in page_answers.items():
                if number in answers and answers[number] != letter:
                    conflicts.append(number)
                answers[number] = letter
    return answers, conflicts


def text_coverage(text, page_text):
    tokens = set(re.findall(r'\w{2,}', text.casefold()))
    observed = set(re.findall(r'\w{2,}', page_text.casefold()))
    return len(tokens & observed) / len(tokens) if tokens else 0
