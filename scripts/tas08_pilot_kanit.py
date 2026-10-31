"""TAS-08: kaynak paketini kur, iddia/blok ve soru/görsel bağlarını doğrula.

python scripts/tas08_pilot_kanit.py --hazirla  # eksik PDF'yi indir, TAS-07 paketini kur
python scripts/tas08_pilot_kanit.py --yaz     # yerel girdilerden sürümlü çıktıyı üret
python scripts/tas08_pilot_kanit.py           # ağ/DB yazması olmadan güncelliği kontrol et
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys
import subprocess
from urllib.request import urlopen

import pdf_kanit_paketi as pack
from tas08_pilot_spec import BOOK_URL, BOOK_SHA, BOOK_TITLE, CLAIMS, SECTIONS, QUESTIONS

APP = Path(__file__).resolve().parents[1]
PDF = APP / 'veri/tas08/kaynak/matematik-9.pdf'
OUTPUT = APP / 'frontend/src/learn/content/bolme-pilot-evidence.json'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    if not PDF.exists():
        PDF.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(BOOK_URL, timeout=90) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != BOOK_SHA:
            raise ValueError('Ana kaynak sürümü değişti; kaynak ve iddiaları yeniden incele.')
        temp = PDF.with_suffix('.tmp')
        temp.write_bytes(data)
        temp.replace(PDF)
    if sha(PDF) != BOOK_SHA:
        raise ValueError('Ana kaynak hash uyuşmazlığı')
    _, stats = pack.build_pack(PDF, '88-96,106-107', sha=BOOK_SHA)
    return stats


def generate():
    if sha(PDF) != BOOK_SHA:
        raise ValueError('Ana kaynak hash uyuşmazlığı')
    directory = pack.pack_dir(BOOK_SHA)
    verified = pack.verify_pack(directory, PDF)
    if not verified['ok']:
        raise ValueError(f'PDF kanıt paketi bozuk: {verified}')
    claims = {}
    for key, (page, ids, title) in CLAIMS.items():
        record = pack.read_json(directory / 'sayfalar' / f'{page:04d}.json')
        blocks = {b['id']: b for b in record['layout']['blocks']}
        claims[key] = {'title': title, 'page': page, 'url': f'{BOOK_URL}#page={page}',
                       'blocks': [{'id': block, 'bbox': blocks[block]['bbox'],
                                   'textSha256': hashlib.sha256(blocks[block]['text'].encode()).hexdigest()} for block in ids],
                       'layoutSha256': record['stages']['layout']['outputSha256']}
    sections = {key: {'claims': refs, 'note': note, 'exams': ['TYT', 'AYT']} for key, (refs, note) in SECTIONS.items()}
    records = json.loads((APP.parent / 'veri-hatti/ogm-yks-cikmis/ham/sorular_son.json').read_text(encoding='utf-8'))['sorular']
    by_code = {q['id']: q for q in records}
    questions = {}
    solved = json.loads(subprocess.run(['node', '--input-type=module', '-e',
        "import {WORKED_EXAMS} from './frontend/src/learn/content/worked-exams.js'; console.log(JSON.stringify(Object.fromEntries(Object.entries(WORKED_EXAMS).filter(([,q])=>q.conceptId==='bolme-bolunebilme').map(([k,v])=>[k,JSON.stringify(v)]))))"],
        cwd=APP, check=True, capture_output=True, encoding='utf-8').stdout)
    for code, spec in QUESTIONS.items():
        q = by_code[code]
        image = APP / f'veri/resimler-pilot/kirpilmis/{q["sinav"]}/matematik/{code}.webp'
        image_sha = sha(image)
        if spec.get('imageSha256') and spec['imageSha256'] != image_sha:
            raise ValueError(f'{code}: incelenen soru görseli değişti')
        book = q['kopyalar'][0]['kitap']
        source = APP.parent / f'Kaynaklar/yks-cikmis-sorular/OGM Kitapciklari/{book}.pdf'
        questions[code] = {**spec, 'imageSha256': image_sha, 'sourceSha256': sha(source),
                           'solutionSha256': hashlib.sha256(solved[code].encode()).hexdigest(),
                           'imagePath': image.relative_to(APP).as_posix(), 'exam': q['sinav'], 'year': q['yil'],
                           'archiveId': q['eski_id'], 'sourceBook': book, 'sourcePage': q['sayfa'],
                           'bookQuestion': q['kitap_nolar'][0], 'questionVersion': 1, 'solutionVersion': 1,
                           'review': 'SOURCE_AND_CALCULATION_CHECKED', 'teacherApproved': False,
                           'solutionOrigin': 'IVME_DERIVATION', 'answerOrigin': 'EXISTING_OSYM_KEY',
                           'answerKey': q['cevaplar'][0]}
    return {'schemaVersion': 1, 'conceptId': 'bolme-bolunebilme', 'contentVersion': 1,
            'lessonSha256': sha(APP / 'frontend/src/learn/content/dersler/bolme-bolunebilme.ders'),
            'primarySource': {'title': BOOK_TITLE, 'url': BOOK_URL, 'sha256': BOOK_SHA},
            'review': {'teacherApproved': False, 'studentTransferObserved': False},
            'claims': claims, 'sections': sections, 'questions': questions,
            'independentCodes': [code for code, q in QUESTIONS.items() if q['role'] == 'independent']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--hazirla', action='store_true')
    parser.add_argument('--yaz', action='store_true')
    args = parser.parse_args()
    if args.hazirla:
        print(json.dumps(prepare(), ensure_ascii=False))
    text = json.dumps(generate(), ensure_ascii=False, indent=2) + '\n'
    if args.yaz:
        OUTPUT.write_text(text, encoding='utf-8', newline='\n')
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8') != text:
        raise ValueError('Pilot kanıt çıktısı güncel değil; --yaz ardından farkı incele.')
    print('TAS-08: 8 bölüm, 11 iddia ve 4 kaynaklı soru doğrulandı; öğretmen/öğrenci kabulü ayrı.')


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()
