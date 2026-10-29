"""Cache visual fingerprints of live YKS questions and compare staged PDF cards.

Perceptual matches are review candidates, never automatic equivalence decisions.
Original images and question records remain unchanged.
"""
from concurrent.futures import ProcessPoolExecutor, as_completed
import argparse
import csv
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.fft import dctn

from kaynakli_arastirma_db import db_connection, query
from pdf_source_scan import APP, OUT, write_json

VERSION = 'trimmed-phash64-v1'


def fingerprint(job):
    code, filename, stamp = job
    path = Path(filename)
    try:
        content = path.read_bytes()
        with Image.open(path) as image:
            gray = np.asarray(image.convert('L')).copy()
        # Ignore scanner/page border lines only for candidate matching.
        if min(gray.shape) > 30:
            edge = max(2, int(gray.shape[1] * .025))
            for x in list(range(edge)) + list(range(gray.shape[1] - edge, gray.shape[1])):
                if (gray[:, x] < 220).mean() > .45:
                    gray[:, max(0,x-1):x+2] = 255
        ys, xs = np.where(gray < 230)
        if not len(xs):
            raise ValueError('Blank image')
        image = Image.fromarray(gray[ys.min():ys.max()+1, xs.min():xs.max()+1])
        small = np.asarray(image.resize((32,32), Image.Resampling.LANCZOS), dtype=float)
        values = dctn(small, type=2, norm='ortho')[:8,:8].flatten()
        median = np.median(values[1:])
        bits = np.packbits(values > median).tobytes().hex()
        exact = hashlib.sha256(np.asarray(image.resize((96,96), Image.Resampling.LANCZOS)).tobytes()).hexdigest()
        return {'code': code, 'stamp': stamp, 'fileSha256': hashlib.sha256(content).hexdigest(),
                'normalizedSha256': exact, 'phash': bits, 'error': None}
    except Exception as error:
        return {'code': code, 'stamp': stamp, 'error': type(error).__name__}


def publish(connection,images):
    path=OUT/'publish-image-fingerprints.sql'
    with path.open('w',encoding='utf-8',newline='') as stream:
        stream.write('BEGIN;\nCREATE TEMP TABLE incoming_image_fingerprints(code text,stamp text,algorithm text,fingerprint char(64)) ON COMMIT DROP;\nCOPY incoming_image_fingerprints FROM STDIN WITH (FORMAT csv);\n')
        writer=csv.writer(stream,lineterminator='\n')
        for row in images:
            if row['error']:continue
            for algorithm,key in [('EXACT_IMAGE_BYTES_V1','fileSha256'),('NORMALIZED_IMAGE96_V1','normalizedSha256'),('TRIMMED_PHASH64_V1','phash')]:
                writer.writerow([row['code'],row['stamp'].split(':')[0],algorithm,row[key].zfill(64)])
        stream.write("\\.\nINSERT INTO learning_catalog.question_content_fingerprints SELECT i.code,i.algorithm,i.fingerprint FROM incoming_image_fingerprints i JOIN questions q ON q.code=i.code AND extract(epoch FROM q.updated_at)::text=i.stamp WHERE q.exam_type IN ('TYT','AYT') ON CONFLICT DO NOTHING;\nCOMMIT;\n")
    command,env,_=connection
    with path.open(encoding='utf-8') as stream:
        result=subprocess.run([*command,'--quiet'],stdin=stream,env=env,capture_output=True,text=True,encoding='utf-8')
    if result.returncode:raise RuntimeError(result.stderr)
    print('Published YKS image comparison fingerprints.',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--publish',action='store_true');args=parser.parse_args()
    connection = db_connection('ivme')
    rows = json.loads(query(connection, "SELECT json_agg(x) FROM (SELECT code,image,extract(epoch FROM updated_at)::text stamp FROM questions WHERE active AND exam_type IN ('TYT','AYT') ORDER BY code) x"))
    cache_file = OUT / 'bank-image-fingerprints.json'
    previous = json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {'version': VERSION, 'images': []}
    if previous['version'] != VERSION: previous['images'] = []
    cached = {r['code']:r for r in previous['images']}
    jobs, images = [], []
    for row in rows:
        path = APP / 'veri/resimler-pilot' / row['image']
        stat = path.stat() if path.exists() else None
        stamp = f"{row['stamp']}:{stat.st_size if stat else 0}:{stat.st_mtime_ns if stat else 0}"
        if cached.get(row['code'], {}).get('stamp') == stamp:
            images.append(cached[row['code']])
        else:
            jobs.append((row['code'], str(path), stamp))
    processed = 0
    with ProcessPoolExecutor(max_workers=4) as pool:
        for result in pool.map(fingerprint, jobs, chunksize=60):
            images.append(result)
            processed += 1
            if processed % 2000 == 0:
                write_json(cache_file, {'version': VERSION, 'images': images})
                print(f'Visual fingerprints: {processed}/{len(jobs)} new, {len(rows)-len(jobs)} reused', flush=True)
    write_json(cache_file, {'version': VERSION, 'images': images})
    if args.publish:publish(connection,images)
    valid = [r for r in images if not r['error']]
    hashes = [(r, int(r['phash'], 16)) for r in valid]
    package_path = APP / 'veri/content-labels/pdf-extraction/mini-test-04/candidates.json'
    package = json.loads(package_path.read_text(encoding='utf-8'))
    candidates = []
    for card in package['cards']:
        fp = fingerprint((card['code'], str(package_path.parent / card['image']), package['sourceSha256']))
        if fp['error']:
            raise ValueError(f"Unreadable candidate image {card['code']}")
        phash = int(fp['phash'], 16)
        matches = []
        for row, visual in hashes:
            distance = (phash ^ visual).bit_count()
            if distance <= 12 or fp['fileSha256'] == row['fileSha256'] or fp['normalizedSha256'] == row['normalizedSha256']:
                matches.append({'code': row['code'], 'distance': distance,
                                'exactFile': fp['fileSha256'] == row['fileSha256'],
                                'exactNormalized': fp['normalizedSha256'] == row['normalizedSha256']})
        matches.sort(key=lambda r:r['distance'])
        candidates.append({'code': card['code'], 'fingerprint': fp, 'matches': matches[:20],
                           'status': 'REVIEW_POSSIBLE_DUPLICATES' if matches else 'NO_VISUAL_MATCH_FOUND'})
    write_json(OUT / 'mini-test-04-visual-duplicates.json', {'sourceSha256': package['sourceSha256'],
        'bankImages': len(images), 'imageErrors': [r for r in images if r['error']], 'candidates': candidates})
    print(json.dumps({'bankImages':len(images), 'imageErrors':sum(bool(r['error']) for r in images),
                      'candidates':len(candidates), 'withVisualMatches':sum(bool(c['matches']) for c in candidates)}), flush=True)


if __name__ == '__main__': main()
