"""Check the live plan without deciding whether human/content work is complete."""
import json
from pathlib import Path
import re

APP = Path(__file__).resolve().parents[1]


def check(root=APP):
    docs = root / 'docs'
    plan = docs / 'plan'
    errors = []
    context = (plan / '00_CALISMA_BAGLAMI.md').read_text(encoding='utf-8-sig')
    handoff_file = plan / '00_DEVAM.md'
    handoff = handoff_file.read_text(encoding='utf-8-sig') if handoff_file.exists() else ''
    roadmap = (plan / '00_YOL_HARITASI.md').read_text(encoding='utf-8-sig')
    steps = sorted(p for p in plan.glob('[0-9][0-9]_*.md') if not p.name.startswith('00_'))
    tasks = {}
    for file in steps:
        text = file.read_text(encoding='utf-8-sig')
        step = file.name[:2]
        if not re.search(rf'^# {int(step)}\. Adım', text):
            errors.append(f'{file.name}: step heading/filename differs')
        for task in re.findall(r'^## (\d\d\.\d\d)\b', text, re.M):
            if task in tasks:
                errors.append(f'Duplicate task: {task}')
            if not task.startswith(step + '.'):
                errors.append(f'{file.name}: task prefix differs: {task}')
            tasks[task] = file.name
        for required in ['## Kopyalanacak prompt', '00_CALISMA_BAGLAMI.md', 'sözlük', 'dosyasını sil']:
            if required not in text:
                errors.append(f'{file.name}: missing prompt rule {required}')
        if f']({file.name})' not in roadmap:
            errors.append(f'{file.name}: missing roadmap link')
    for field in ['Sıradaki görev', 'Etkin görev']:
        match = re.search(rf'\| {field} \| `([0-9]{{2}}\.[0-9]{{2}})`', handoff + context)
        if match and match[1] not in tasks:
            errors.append(f'Closed/nonexistent {field}: {match[1]}')
    for file in docs.rglob('*.md'):
        text = file.read_text(encoding='utf-8-sig')
        for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)', text):
            target = target.strip('<>').split('#')[0].split('?')[0]
            if not target or re.match(r'^(?:https?|mailto|app):', target):
                continue
            target = re.sub(r':\d+$', '', target)
            path = file.parent / target
            if not path.exists():
                errors.append(f'{file.relative_to(root).as_posix()}: missing local link {target}')
    if (root / 'backend/src/main/resources/content-taxonomy.json').exists():
        registry = json.loads((root / 'backend/src/main/resources/content-taxonomy.json').read_text(encoding='utf-8-sig'))
        if not registry.get('categories'):
            errors.append('Empty controlled taxonomy')
    for path in re.findall(r'`([^`]*\.(?:json|jsonl|schema\.json))`', context):
        if '<' in path or path.startswith(('http', 'GET ')):
            continue
        # Match concrete referenced artifact paths; prose column values are ignored.
        if '/' in path and not (root / path).exists():
            errors.append(f'Context artifact missing: {path}')
    return {'status': 'FAIL' if errors else 'PASS', 'openSteps': [int(p.name[:2]) for p in steps],
            'openTasks': len(tasks), 'errors': errors}


if __name__ == '__main__':
    result = check()
    output = APP / 'veri/content-labels/plan-check.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=True))
    raise SystemExit(bool(result['errors']))
