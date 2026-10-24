"""Stage reviewed question candidates from the one Mini Deneme with shifted number anchors.

The PDF and shared extraction pipeline are read only. No bank rows are written.
"""
import gzip
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT.parent / 'Kaynaklar/ogm-materyal'
PIPELINE = ROOT.parent / 'veri-hatti/ogm-sorular'
AUDIT = ROOT / 'backend/src/main/resources/pdf-bank-audit.json.gz'
OUT = ROOT / 'veri/content-labels/pdf-extraction/mini-test-04'
sys.path.insert(0, str(PIPELINE))


def sha(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main():
    import pymupdf
    import isle
    from motor import Kitap

    audit = json.load(gzip.open(AUDIT, 'rt', encoding='utf-8'))
    row = next(item for item in audit['pdfs'] if item['id'] == 335)
    path = ARCHIVE / row['relativePath']
    if sha(path) != row['sha256']:
        raise RuntimeError('Source PDF hash changed')
    original = Kitap.capalar

    def source_anchor_tolerance(self, pages, tol=6, **kwargs):
        if self.yol == row['relativePath']:
            tol = 16  # This edition shifts printed question numbers 12–16 points left.
        return original(self, pages, tol=tol, **kwargs)

    try:
        Kitap.capalar = source_anchor_tolerance
        result = isle.isle(row['relativePath'], 'Mini Deneme')
    finally:
        Kitap.capalar = original

    if (result['soru'], len(result['kayitlar'])) != (60, 60) or result['red'] or result['sorunlar'] or result['anahtar_farki']:
        raise RuntimeError('Extraction invariants failed; no candidates staged')
    if any(len(card['nolar']) != 1 or len(card['cevaplar']) != 1 or
           card['cevaplar'][0] not in 'ABCDE' or card['cevaplar_A'] != card['cevaplar_B']
           for card in result['kayitlar']):
        raise RuntimeError('Question or answer proof is incomplete')

    OUT.mkdir(parents=True, exist_ok=True)
    source = Kitap(row['relativePath'])
    cards = []
    for card in result['kayitlar']:
        number = card['nolar'][0]
        code = f'mn-test-04-01-{number:02d}'
        image = OUT / f'{code}.webp'
        # This edition also prints the number left of the normal crop boundary.
        fragments = [(page, pymupdf.Rect(max(0, rect[0] - 20), rect[1], rect[2], rect[3]))
                     for page, rect in card['_parcalar']]
        source.kirp(fragments, image)
        cards.append({'code': code, 'pdfPage': card['sayfa'], 'printedNumber': number,
                      'answer': card['cevaplar'][0], 'answerMethodA': card['cevaplar_A'][0],
                      'answerMethodB': card['cevaplar_B'][0], 'text': card['metin'],
                      'image': image.name, 'imageSha256': sha(image)})
    cards.sort(key=lambda card: card['printedNumber'])
    if [card['printedNumber'] for card in cards] != list(range(1, 61)):
        raise RuntimeError('Question numbers are not 1–60')
    package = {'status': 'CANDIDATE_NOT_IN_BANK', 'sourceCatalogIds': [335, 349],
               'sourceSha256': row['sha256'], 'sourceRelativePath': row['relativePath'],
               'anchorTolerance': 16, 'questionCount': 60, 'answerCheck': 'TWO_METHODS_AGREE',
               'cards': cards}
    (OUT / 'candidates.json').write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Staged {len(cards)} question candidates in {OUT}")


if __name__ == '__main__':
    main()
