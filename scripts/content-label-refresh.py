"""Source -> controlled labels -> audit -> preview -> optional atomic publish.

--dry-run prints commands only. --check validates existing local outputs without
OCR/generation/publication. --resume reuses unchanged completed stages and source
caches. --limit bounds new physical PDF extraction, never removes source records.
"""
import argparse
from yerel_ortam import default_database
import hashlib
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/content-labels'


def file_hash(path):
    if not path.is_file():
        return None
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def input_signature(root, paths):
    values = []
    for name in paths:
        path = root / name
        if path.is_dir():
            values.append([name, [[p.relative_to(path).as_posix(), p.stat().st_size, p.stat().st_mtime_ns]
                                  for p in sorted(path.rglob('*')) if p.is_file()]])
        else:
            values.append([name, file_hash(path)])
    return hashlib.sha256(json.dumps(values, separators=(',', ':')).encode()).hexdigest()


def can_resume(step, saved, root=APP):
    return not step.get('always') and saved.get('status') == 'COMPLETE' and saved.get('inputSignature') == input_signature(root, step['inputs']) and bool(saved.get('outputs')) and all(
        digest is not None and file_hash(root / path) == digest for path, digest in saved['outputs'].items())


def stages(node, args):
    py = sys.executable
    def step(name, command, inputs=(), outputs=(), always=False):
        return dict(name=name, command=list(command), inputs=list(inputs), outputs=list(outputs), always=always)
    if args.check:
        return [step('taxonomy', [node,'scripts/content-taxonomy-check.mjs','--check']),
            step('structure', [node,'scripts/content-review-catalog.mjs','--check']),
            step('pdf-labels', [node,'scripts/pdf-review-labels.mjs','--check']),
            step('questions', [py,'scripts/content-label-inventory.py','--check']),
            step('labels', [node,'scripts/content-labels.mjs','--check']),
            step('contract', [node,'scripts/learning-resource-check.mjs']),
            step('question-consistency', [py,'scripts/question-label-check.py']),
            step('plan', [py,'scripts/plan-check.py'])]
    shared = ['backend/src/main/resources/content-taxonomy.json','scripts/content-taxonomy.mjs','scripts/physics-topics.mjs']
    result = [
        step('taxonomy', [node,'scripts/content-taxonomy-check.mjs','--project'], [*shared,'scripts/content-taxonomy-check.mjs'], ['frontend/src/data/curriculumIdentities.json']),
        step('headings', [py,'scripts/pdf-review-headings.py'], ['../Kaynaklar','scripts/pdf-review-headings.py'], ['veri/pdf-review-headings.json']),
        step('supplemental', [py,'scripts/supplemental-pdf-inventory.py'], ['../Kaynaklar','scripts/supplemental-pdf-inventory.py','veri/content-labels/supplemental-page-ocr.json'], ['veri/content-labels/supplemental-pdf-inventory.json']),
        step('structure', [node,'scripts/content-review-catalog.mjs'], [*shared,'scripts/content-review-catalog.mjs','frontend/src/curriculum.js','frontend/src/data/curriculumIdentities.json','frontend/src/data/physicsVideos.json','frontend/public/kaynakli-notlar.json','frontend/public/kaynakli-etiketler','../veri-hatti/ogm-indirme/katalog.json'], ['backend/src/main/resources/content-review-catalog.json']),
        step('pdf-labels', [node,'scripts/pdf-review-labels.mjs'], [*shared,'scripts/pdf-review-labels.mjs','scripts/pdf-review-taxonomy.mjs','veri/pdf-review-headings.json','veri/content-labels/supplemental-pdf-inventory.json','backend/src/main/resources/content-review-catalog.json'], ['backend/src/main/resources/pdf-review-labels.json']),
        step('questions', [py,'scripts/content-label-inventory.py'], outputs=['veri/content-labels/source-inventory.json'], always=True),
        step('source-proposals', [py,'scripts/content-source-analysis.py'], ['scripts/content-source-analysis.py','veri/content-labels/ai-review-groups.json','veri/content-labels/source-inventory.json','backend/src/main/resources/pdf-review-labels.json'], ['ornek-veri/content-ai-question-labels.json']),
        step('pdf-pages', [py,'scripts/pdf-topic-locations.py', *(['--limit',str(args.limit)] if args.limit else [])], outputs=['veri/content-labels/pdf-locations.json'], always=True),
        step('pdf-ocr', [py,'scripts/pdf-page-ocr.py', *(['--limit',str(args.ocr_pages)] if getattr(args,'ocr_pages',None) else [])], always=True),
        step('pdf-fallback', [py,'scripts/pdf-readability-fallback.py'], always=True),
        step('pdf-ocr-remap', [py,'scripts/pdf-topic-locations.py'], outputs=['veri/content-labels/pdf-locations.json'], always=True),
        step('video-inventory', [py,'scripts/video-source-inventory.py'], outputs=['veri/content-labels/video-inventory.json'], always=True),
        step('video-content', [py,'scripts/video-content-probe.py','--caption-limit','0'], outputs=['veri/content-labels/video-content-index.json'], always=True),
        step('video-structure-refresh', [node,'scripts/content-review-catalog.mjs'], always=True),
        step('video-inventory-refresh', [py,'scripts/video-source-inventory.py'], outputs=['veri/content-labels/video-inventory.json'], always=True),
        step('labels', [node,'scripts/content-labels.mjs'], [*shared,'scripts/content-labels.mjs','scripts/learning-resource-contract.mjs','frontend/src/resourceMetadata.js','scripts/pdf-review-taxonomy.mjs','backend/src/main/resources/content-review-catalog.json','backend/src/main/resources/pdf-review-labels.json','veri/content-labels/source-inventory.json','veri/content-labels/pdf-locations.json','veri/content-labels/video-inventory.json','veri/content-labels/video-content-index.json','ornek-veri/content-ai-question-labels.json'], ['veri/content-labels/labels.json','veri/content-labels/report.json','backend/src/main/resources/content-label-categories.json']),
        step('question-consistency', [py,'scripts/question-label-check.py'], always=True),
        step('audit', [py,'scripts/content-label-audit.py'], always=True),
        step('contract', [node,'scripts/learning-resource-check.mjs'], always=True),
        step('labels-test', [node,'testler/content-labels.mjs'], always=True),
        step('intake-test', [node,'testler/resource-intake.mjs'], always=True),
        step('pdf-test', [node,'testler/pdf-review-labels.mjs'], always=True),
        step('preview', [py,'scripts/content-label-preview.py'], always=True),
        step('plan', [py,'scripts/plan-check.py'], always=True)]
    if args.publish:
        result += [step('publish', [py,'scripts/content-label-publish.py','--database',args.database], always=True),
            step('published-check', [py,'scripts/content-label-publish.py','--database',args.database,'--check'], always=True)]
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--dry-run', action='store_true')
    mode.add_argument('--check', action='store_true')
    parser.add_argument('--resume', action='store_true')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--ocr-pages', type=int, help='Maximum new local OCR pages; cached pages are reused')
    parser.add_argument('--publish', action='store_true')
    parser.add_argument('--database', choices=['ivme','ivme_test'], default=default_database())
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    if args.ocr_pages is not None and args.ocr_pages < 1:
        parser.error('--ocr-pages must be positive')
    if args.check and args.ocr_pages:
        parser.error('--check cannot extract OCR pages')
    if args.publish and (args.limit is not None or args.ocr_pages is not None or args.check):
        parser.error('Publication requires a complete generation/audit run; no bounded extraction/--check')
    node = shutil.which('node')
    if not node:
        raise SystemExit('Node.js is required')
    workflow = stages(node, args)
    if args.dry_run:
        print(json.dumps({'mode':'DRY_RUN','publishes':args.publish,'stages':workflow}, ensure_ascii=False, indent=2))
        return
    STATE.mkdir(parents=True, exist_ok=True)
    checkpoint = STATE / ('workflow-check.json' if args.check else 'workflow.json')
    state = json.loads(checkpoint.read_text(encoding='utf-8')) if args.resume and checkpoint.exists() else {'version':1,'stages':{}}
    def save():
        temp = checkpoint.with_suffix('.tmp')
        temp.write_text(json.dumps(state, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        temp.replace(checkpoint)
    state.update(status='RUNNING',modelCalls=0)
    for step in workflow:
        name = step['name']
        if args.resume and can_resume(step, state['stages'].get(name, {})):
            print(f'Reused: {name}', flush=True)
            continue
        start = time.monotonic()
        record = {'status':'RUNNING','inputSignature':input_signature(APP,step['inputs'])}
        state['stages'][name] = record
        save()
        print('Running: '+' '.join(step['command'][1:]), flush=True)
        result = subprocess.run(step['command'], cwd=APP)
        record.update(status='COMPLETE' if result.returncode==0 else 'FAILED',exitCode=result.returncode,
            elapsedSeconds=round(time.monotonic()-start,2),outputs={path:file_hash(APP/path) for path in step['outputs']})
        if result.returncode:
            state['status']='FAILED';save();raise SystemExit(result.returncode)
        save()
    state['status']='COMPLETE';save()
    print(json.dumps({'status':'COMPLETE','checkpoint':checkpoint.relative_to(APP).as_posix(),'published':args.publish,'modelCalls':0}))

if __name__ == '__main__':
    main()
