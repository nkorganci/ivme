"""Baseline and real restore verification; never changes source files/production rows."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import zipfile
import time

from yks_birlestirme import digest, write_json
from yks_stages.database import backup_and_restore, RESERVE, connection
from yks_stages.evidence import backup_files
from yks_stages.restore_cluster import PrivateRestoreCluster


def inputs(app, store, state):
    files = ['scripts/yks_stages/stage_01.py', 'scripts/yks_stages/database.py',
             'scripts/yks_stages/evidence.py', 'scripts/yks_stages/restore_cluster.py',
             'backend/src/main/resources/application-dev.yml']
    return {'version': 1, 'fileBase': str(app), 'files': {p: digest(app / p) for p in files},
            'pipelineConfigSha256': digest(app.parent / 'pipeline/.env'), 'runId': state['runId']}


def operation(app, store, state):
    def perform(folder, cursor, checkpoint):
        report_path = folder / 'baseline.json'
        git = subprocess.run(['git', 'status', '--short'], cwd=app, capture_output=True, text=True, check=True)
        processes = subprocess.run(['powershell', '-NoProfile', '-Command',
            "Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('python.exe','pwsh.exe','java.exe','node.exe','postgres.exe') } | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath | ConvertTo-Json -Compress"],
            capture_output=True, encoding='utf-8', errors='replace', timeout=30)
        write_json(folder / 'writers.json', {'processes': json.loads(processes.stdout or '[]'),
                                            'note': 'Process names/paths only; command lines and credentials intentionally omitted.'})
        disks = {str(p): {'freeBytes': shutil.disk_usage(p).free} for p in [app, Path.home()]}
        if min(x['freeBytes'] for x in disks.values()) < RESERVE:
            raise RuntimeError('Disk reserve is not met')
        # Copy irreversible decision/evidence metadata; leave large immutable originals untouched.
        metadata = []
        source_roots = [app / 'veri/content-labels', app / 'veri/source-research',
                        app / 'icerik-hatti', app / 'video-hatti']
        registry = app / 'veri/pdf-source-registry'
        files = [p for root in source_roots if root.is_dir() for p in root.rglob('*') if p.is_file() and p.suffix.lower() in ('.json', '.jsonl', '.md', '.csv', '.tsv')]
        if registry.is_dir():
            files += [p for p in registry.glob('*.json') if p.is_file()]
            for sub in ('acceptance', 'decisions', 'reviews'):
                files += [p for p in (registry / sub).rglob('*.json') if p.is_file()] if (registry / sub).is_dir() else []
        files += [app / line[3:].strip() for line in git.stdout.splitlines() if line.startswith('?? ') and (app / line[3:].strip()).is_file()]
        archive = folder / 'decision-evidence.zip'
        print('Baseline: preserving decision/evidence metadata', flush=True)
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=3) as output:
            for p in sorted(set(files)):
                if not p.resolve().is_relative_to(app) or p.is_symlink():
                    raise ValueError('Evidence source outside application')
                data = p.read_bytes()
                import hashlib
                relative = p.relative_to(app).as_posix()
                output.writestr(relative, data)
                metadata.append({'path': relative, 'sha256': hashlib.sha256(data).hexdigest(), 'bytes': len(data)})
        with zipfile.ZipFile(archive) as verify:
            if verify.testzip() is not None:
                raise ValueError('Evidence archive CRC failed')
        write_json(folder / 'decision-evidence-manifest.json', metadata)
        databases = []
        old = state['stages'].get('YKS-01:full', {})
        old_inputs = old.get('inputs', {})
        yaml_path = 'backend/src/main/resources/application-dev.yml'
        same_sources = old_inputs.get('files', {}).get(yaml_path) == digest(app / yaml_path) and old_inputs.get('pipelineConfigSha256') == digest(app.parent / 'pipeline/.env')
        prior_folders = sorted((p for p in folder.parent.glob('attempt-*') if p != folder), reverse=True) if same_sources else []
        source_cmd, _ = connection(app)
        with PrivateRestoreCluster(Path(source_cmd[0]).parent, folder) as restore:
            for database in ('ivme', 'ogm_ders'):
                reuse_folder = next((p for p in prior_folders if (p / (database + '-restore.json')).is_file()
                                     or (p / (database + '-dump-ready.json')).is_file()), None)
                databases.append(backup_and_restore(app, database, folder, checkpoint,
                                                   restore_connection=restore.connection, reuse_folder=reuse_folder))
        # A concurrently started image backup writes only .part until verified.
        # Reuse its immutable result instead of re-reading hundreds of thousands
        # of already captured image paths.
        stage_root = folder.parent
        deadline = time.monotonic() + 1800
        while True:
            candidates = sorted(stage_root.glob('attempt-*/bank-images-content.json'))
            if candidates:
                candidate = candidates[-1]
                image_report = json.loads(candidate.read_text(encoding='utf-8'))
                image_archive = candidate.with_name('bank-images-content.zip')
                if image_report.get('status') != 'PASS' or not image_archive.is_file() or digest(image_archive) != image_report['archiveSha256']:
                    raise ValueError('Image evidence backup is not verified')
                if candidate.parent != folder:
                    os.link(image_archive, folder / image_archive.name)
                    shutil.copy2(candidate, folder / candidate.name)
                break
            if not list(stage_root.glob('attempt-*/bank-images-content.zip.part')):
                image_report = backup_files(app.parent, [app / 'veri/resimler-pilot', app.parent / 'icerik'], folder)
                break
            if time.monotonic() > deadline:
                raise TimeoutError('Image evidence backup has not completed; inspect its progress')
            time.sleep(2)
        report = {'status': 'PASS', 'databases': databases, 'disksAtStart': disks,
                  'gitStatus': git.stdout.splitlines(), 'evidenceFiles': len(metadata),
                  'evidenceZipSha256': digest(archive), 'sourceFilesChanged': 0, 'productionRowsWritten': 0,
                  'imageContentBackup': {'paths': len(image_report['files']), 'objects': image_report['uniqueObjects'],
                                         'archiveSha256': image_report['archiveSha256'], 'objectHashesVerified': True},
                  'sourceOriginals': 'Preserved in original locations; no deletion/relocation authorized by this stage.',
                  'nextAction': 'YKS-02 four-source inventory and content identities'}
        write_json(report_path, report)
        artifacts = [p for p in folder.iterdir() if p.is_file() and p.suffix in ('.json', '.zip', '.dump', '.log')]
        return {'status': 'PASS', 'artifacts': artifacts,
                'summary': {'databasesRestoreVerified': len(databases), 'evidenceFiles': len(metadata), 'productionWrites': 0},
                'nextAction': report['nextAction']}
    return perform
