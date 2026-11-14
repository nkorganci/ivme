"""Export original native text for unassigned saved crops with proved bodies.

Read-only source/DB behavior: no model requests, recropping, bank comparison
or topic decisions. A frozen review export can be read again without work.
"""
import argparse
import hashlib
import json
import time
from collections import Counter
from pathlib import Path
import pymupdf
from mebi_pratik2_tam_pdf_tarama import APP, BASE, SOURCE
from mebi_pratik2_incelenen_konu_paketi import verified_body
from mebi_pratik2_tek_tarama_konu import source_subject_for_row
from mebi_pratik2_pdf_tekrar_kapisi import current_decisions, skip_pdf
from yks_birlestirme import write_json, process_lock


def run(package_name, subjects, output_name):
    out = BASE / output_name
    target = out / 'input-review.json'
    if target.exists():
        print(json.dumps({'status': 'EXISTING_FROZEN_REVIEW_EXPORT', 'path': str(target)}))
        return
    folder = BASE / package_name
    package = json.loads((folder / 'chapter-packages.json').read_text(encoding='utf8'))
    categories = json.loads((APP / 'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf8'))['categories']
    reserved = set()
    for path in BASE.glob('*expansion/chapter-packages.json'):
        reserved.update(r['code'] for r in json.loads(path.read_text(encoding='utf8'))['items'])
    held = {r['code'] for r in json.loads((APP / 'scripts/mebi-pratik2-native-content-holds.json').read_text(encoding='utf8'))['heldReviews']}
    policy = current_decisions(r['sourceSha256'] for r in package['items'])
    rows = []
    for row in package['items']:
        if row['code'] in reserved or row['code'] in held or skip_pdf(row['sourceSha256'], policy):
            continue
        subject = source_subject_for_row(row, categories)
        if subject not in subjects:
            continue
        receipt = folder / 'body-readings' / (row['code'] + '.json')
        if receipt.exists() and verified_body(json.loads(receipt.read_text(encoding='utf8')), row, allow_visual=True):
            rows.append({**row, 'subject': subject, 'bodyReceipt': str(receipt.relative_to(BASE)),
                         'bodyReceiptSha256': hashlib.sha256(receipt.read_bytes()).hexdigest()})
    rows.sort(key=lambda r: (r['relativePath'], r['bodyPage'], r['printedNumber']))
    pdf = None
    source_sha = None
    output = []
    counts = Counter()
    started = last = time.monotonic()
    bucket = -1
    try:
        for index, row in enumerate(rows, 1):
            if source_sha != row['sourceSha256']:
                if pdf is not None:
                    pdf.close()
                path = (SOURCE / row['relativePath']).resolve()
                if not path.is_relative_to(SOURCE):
                    raise ValueError('Review source leaves original archive')
                with path.open('rb') as stream:
                    if hashlib.file_digest(stream, 'sha256').hexdigest() != row['sourceSha256']:
                        raise ValueError('Original review PDF changed')
                source_sha = row['sourceSha256']
                pdf = pymupdf.open(path)
            text = ' '.join(w[4] for w in pdf[row['bodyPage'] - 1].get_text('words', clip=pymupdf.Rect(row['bodyClip']), sort=True))
            output.append({**row, 'originalNativeText': text, 'teacherApproved': False})
            counts[row['subject']] += 1
            now = time.monotonic()
            current = 10 * index // max(1, len(rows))
            if current > bucket or now - last >= 300 or index == len(rows):
                progress = {'stage': 'SAVED_CROP_NATIVE_REVIEW_EXPORT', 'completed': index, 'total': len(rows),
                            'elapsedSeconds': round(now - started, 1), 'estimatedRemainingSeconds': None,
                            'questionWrites': 0, 'imageWrites': 0, 'modelCalls': 0}
                print(json.dumps(progress), flush=True)
                bucket, last = current, now
        out.mkdir(exist_ok=True)
        write_json(target, {'status': 'ORIGINAL_NATIVE_TEXT_FOR_TOPIC_REVIEW_NOT_TOPIC_ACCEPTANCE',
                            'evidencePackage': package_name, 'records': output, 'counts': dict(counts),
                            'questionWrites': 0, 'imageWrites': 0, 'modelCalls': 0, 'teacherApprovalsCreated': 0})
    finally:
        if pdf is not None:
            pdf.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--evidence-package', default='single-test-pending-evidence')
    parser.add_argument('--subjects', nargs='+', required=True)
    parser.add_argument('--output-package', required=True)
    args = parser.parse_args()
    if any(Path(name).name != name for name in [args.evidence_package, args.output_package]):
        raise ValueError('Unsafe review export package name')
    with process_lock(BASE / '.jobs' / (args.output_package + '-native-review.lock')):
        run(args.evidence_package, set(args.subjects), args.output_package)
