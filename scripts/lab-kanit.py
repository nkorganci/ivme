"""Konu laboratuvarı teknik kabul manifesti (MAT-LAB-02).

    python scripts/lab-kanit.py <konu>            # UI raporu + girdiler → testler/kanit/lab/<konu>.json
    python scripts/lab-kanit.py <konu> --kontrol  # manifest girdileri hâlâ aynı mı?

Önce: node --test testler/matematik-lab-yapi.test.mjs ve
IVME_TEST_DIST=... node testler/konu-ogrenme-ui.mjs --laboratuvar <konu>. Öğretmen onayı ve öğrenci aktarımı
yalnız insan girdisidir; bu betik onları hiçbir zaman true yapmaz.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
UI = APP / 'veri/ui-denetim/konu-ogrenme'
ENGINE = ['frontend/src/learn/lab/GoalWorkbench.jsx', 'frontend/src/learn/lab/TopicLab.jsx', 'frontend/src/learn/lab/topic-lab.css',
          'frontend/src/learn/lab/sayi.js', 'frontend/src/learn/lab/konular/index.js', 'frontend/src/learn/engine/sharedSet.js',
          'testler/matematik-lab-yapi.test.mjs', 'testler/matematik-laboratuvari-ui.mjs']
PILOT = ['frontend/src/learn/lab/ParityLab.jsx', 'frontend/src/learn/lab/parity.js', 'frontend/src/learn/lab/parity-lab.css',
         'testler/matematik-laboratuvari.test.mjs']


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summary(concept: str) -> dict:
    code = ("import(process.argv[1]).then(m => console.log(JSON.stringify(m.default.goals.map(g => "
            "({ id: g.id, label: g.label, custom: g.custom ?? null, transfer: g.transfer?.length ?? null, "
            "real: (g.real ?? []).map(r => r.code), realNote: g.realNote ? true : false })))))")
    url = (APP / f'frontend/src/learn/lab/konular/{concept}.js').as_uri()
    return json.loads(subprocess.run(['node', '-e', code, url], capture_output=True, text=True, check=True, encoding='utf-8').stdout)


def inputs(concept: str, goals: list) -> dict:
    files = [f'frontend/src/learn/lab/konular/{concept}.js', f'frontend/src/learn/lab/cizim/{concept}.jsx', f'testler/lab-{concept}.test.mjs', *ENGINE]
    if any(g['custom'] == 'parity' for g in goals):
        files += PILOT
    return {f: sha(APP / f) for f in files}


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    concept = sys.argv[1]
    out = APP / f'testler/kanit/lab/{concept}.json'
    goals = summary(concept)
    if '--kontrol' in sys.argv:
        if not out.exists():
            print(f'{concept}: manifest yok')
            return 1
        old = json.loads(out.read_text(encoding='utf-8'))
        stale = [f for f, h in inputs(concept, goals).items() if old['inputs'].get(f) != h]
        print(f'{concept}: ' + ('GÜNCEL' if not stale else 'ESKİ — değişen: ' + ', '.join(stale)))
        return 1 if stale else 0
    report_path = UI / f'laboratuvar-{concept}-rapor.json'
    report = json.loads(report_path.read_text(encoding='utf-8'))
    if report.get('problems') or len(report.get('runs', [])) != 2 or any(r.get('failure') for r in report['runs']):
        print(f'UI raporu temiz değil: {report_path}')
        return 1
    shots = sorted(p for p in UI.glob('*.png') if f'-laboratuvar-{concept}-' in p.name and not p.name.endswith('-hata.png'))
    if any(g['custom'] == 'parity' for g in goals):
        shots += sorted(p for p in UI.glob('*-laboratuvar-*.png') if p.name.split('-laboratuvar-')[1].split('-')[0] in {'baslangic', 'deney', 'tamamlandi'})
    manifest = {
        'task': 'MAT-LAB-02', 'concept': concept, 'automaticAcceptance': 'PASS',
        'teacherApproved': False, 'studentTransferObserved': False,
        'goals': goals,
        'inputs': inputs(concept, goals),
        'artifacts': {str(p.relative_to(APP)).replace('\\', '/'): sha(p) for p in [report_path, *shots]},
        'ui': {'runs': len(report['runs']), 'stepsPerRun': [len(r['steps']) for r in report['runs']], 'problems': []},
    }
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{out.relative_to(APP)}: {len(goals)} hedef, {len(manifest["artifacts"])} kanıt dosyası')
    return 0


if __name__ == '__main__':
    sys.exit(main())
