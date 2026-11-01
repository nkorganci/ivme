"""Kaynaklı video ipuçlarının öğrenciye açık protip izdüşümü.

python scripts/ivme.py video protips [--kontrol]
Üretimde mevcut kanıtı doğrular; video/ağ/model çağırmaz. --kontrol Git'teki
girdilerle salt okunur denetimdir. İç inceleme, transkript, yerel yollar veya
öğretmen onayı öğrenci paketine taşınmaz.
"""
import argparse
import json
from pathlib import Path
import re
import sys

from video_hatti import APP, check, digest, file_hash, load, write_json

CONFIG = APP / 'video-hatti/protips.json'
OUTPUT = APP / 'frontend/src/learn/content/video-protips.json'
FIELDS = ('rule', 'condition', 'example', 'counterexample', 'rationale')


def project(verify=False):
    config = load(CONFIG)
    if config.get('schema') != 'video-protips-v1':
        raise ValueError('Protip yerleşim şeması geçersiz')
    taxonomy = {c['id']: c for c in load(APP / 'backend/src/main/resources/content-taxonomy.json')['categories']}
    tips, identities, inputs = [], set(), {'config': file_hash(CONFIG)}
    for placement in config['placements']:
        task_id, concept = placement['taskId'], placement['conceptId']
        if not all(re.fullmatch('[a-z0-9-]+', s) for s in (task_id, concept)):
            raise ValueError('Görev/kavram kimliği geçersiz')
        task_file = APP / f'video-hatti/gorevler/{task_id}.json'
        release_file = APP / f'video-hatti/yayin/{task_id}.json'
        task, release = load(task_file), load(release_file)
        if verify:
            check(task)
            manifest = load(APP / release['evidenceDirectory'] / 'manifest.json')
            if manifest['evidenceHash'] != release['evidenceHash']:
                raise ValueError('Küçük video manifesti güncel değil; video paket çalıştır')
        if release['taskHash'] != digest(task) or release['verification']['status'] != 'SCRIPT_CHECKED':
            raise ValueError('Protip için güncel görev ve matematik denetimi gerekli')
        lesson_path = APP / task['lesson']
        lesson = lesson_path.read_text(encoding='utf-8')
        if not re.search(rf'^@ders {re.escape(concept)}\s*$', lesson, re.M):
            raise ValueError('Protip hedef dersi kaynak görevle aynı olmalı')
        categories = re.search(r'^kategori:\s*(.+)$', lesson, re.M).group(1).split()
        source_topic = taxonomy[task['topicId']]
        targets = source_topic.get('canonicalTopicIds') or [source_topic['id']]
        if not set(targets).intersection(categories):
            raise ValueError('Protip konusu dersin ortak katalog kimliklerine bağlı değil')
        sections = set(re.findall(r'^@bolum (\S+)', lesson, re.M))
        hints = {h['id']: h for h in load(APP / task['hints'])}
        reviewed = {h['id']: h for h in release['hints']}
        inputs[task_id] = dict(task=file_hash(task_file), release=file_hash(release_file),
                               hints=file_hash(APP / task['hints']), lesson=file_hash(lesson_path))
        for spec in placement['hints']:
            key = task_id + ':' + spec['id']
            if key in identities:
                raise ValueError('Protip kimliği tekrarlı')
            identities.add(key)
            if not spec.get('sectionIds') or not set(spec['sectionIds']).issubset(sections):
                raise ValueError('Protip bölüm kimlikleri derste bulunamadı')
            candidate, review = hints[spec['id']], reviewed[spec['id']]
            if review['reviewStatus'] != 'PENDING':
                raise ValueError('Bu görünüm PENDING protipler içindir; onay akışı ayrıca uygulanmalı')
            if not re.fullmatch('youtube:[A-Za-z0-9_-]{11}', candidate['providerId']):
                raise ValueError('Protip video kimliği geçersiz')
            if not spec.get('title') or any(not candidate.get(field) for field in FIELDS):
                raise ValueError('Protip açıklaması/koşulu/örnekleri eksik')
            tips.append(dict(id=key, conceptId=concept, topicId=task['topicId'], sectionIds=spec['sectionIds'],
                             title=spec['title'], **{field: candidate[field] for field in FIELDS},
                             source=dict(providerId=candidate['providerId'], startSeconds=candidate['startSeconds'],
                                         endSeconds=candidate['endSeconds']),
                             evidenceHash=release['evidenceHash'], contentHash=review['contentHash'],
                             reviewStatus='PENDING', teacherApproved=False))
    return dict(schema='video-protips-v1', generatedBy='scripts/video-protips.py', inputsHash=digest(inputs), tips=tips)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kontrol', action='store_true')
    args = parser.parse_args()
    try:
        result = project(verify=not args.kontrol)
        if args.kontrol:
            if not OUTPUT.exists() or load(OUTPUT) != result:
                raise ValueError('Protip izdüşümü güncel değil: python scripts/ivme.py video protips')
        else:
            if not OUTPUT.exists() or load(OUTPUT) != result:
                write_json(OUTPUT, result)
        print(json.dumps(dict(status='PASS', tips=len(result['tips']), teacherApproved=False)))
        return 0
    except (OSError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
