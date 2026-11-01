"""TAS-11: zamanlı metin, seçilmiş kare ve kaynaklı ipucu inceleme paketi.

python scripts/ivme.py video calistir <gorev> [--erisim] [--erisim-yenile]
python scripts/ivme.py video durum|kontrol [gorev]

Varsayılan çevrimdışıdır. --erisim yalnız önbelleği olmayan kaynağı yoklar;
başarısız erişim ancak --erisim-yenile ile tekrarlanır. Medya indirmez.
ASR yalnız izin beyanlı yerel medya + yerel modelle çalışır, model indirmez.
Üretilen ipuçları öğretmen onayı taşımaz; ders dosyası değiştirilmez.
"""
import argparse
from contextlib import contextmanager
import hashlib
import html
import importlib.metadata
import importlib.util
import io
import json
import math
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time

from icerik_hatti import canon, digest, pid_alive, write_json, write_text

APP = Path(__file__).resolve().parents[1]
STATE = APP / 'veri/video-hatti'
TASKS = APP / 'video-hatti/gorevler'
VERSION = 'video-evidence-v1'


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def file_hash(path):
    with Path(path).open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def local_inputs(task):
    paths = [APP / s[field] for s in task['sources'] for field in ('media', 'transcript') if s.get(field)]
    if task.get('hints'):
        paths.append(APP / task['hints'])
    if task.get('lesson'):
        paths.append(APP / task['lesson'])
    paths.extend(APP / name for name in task.get('verificationTests', []))
    if task.get('asrModel'):
        model = APP / task['asrModel']
        if model.is_dir():
            paths.extend(p for p in model.rglob('*') if p.is_file())
    return {str(p.resolve()): file_hash(p) for p in sorted(set(paths))}


def module(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), APP / f'scripts/{name}.py')
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


@contextmanager
def lock():
    """Serileştirir; yaşayan sahibin uzun ASR işini zaman aşımıyla devralmaz."""
    STATE.mkdir(parents=True, exist_ok=True)
    path = STATE / '.kilit'
    for _ in range(2):
        try:
            with path.open('x', encoding='ascii') as stream:
                stream.write(str(os.getpid()))
            break
        except FileExistsError:
            owner = path.read_text(encoding='ascii').strip()
            # Boş dosya yeni sahibin henüz PID yazmadığı kısa aralık olabilir.
            if not owner.isdigit() or pid_alive(int(owner)):
                raise ValueError('Video hattı kilitli; yaşayan/henüz yazılan kilidi devralma')
            path.unlink()
    else:
        raise ValueError('Video hattı kilidi alınamadı')
    try:
        yield
    finally:
        path.unlink(missing_ok=True)


def number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def validate_segments(rows, duration):
    if not rows:
        raise ValueError('Zamanlı metin boş')
    previous = -1
    result = []
    for row in rows:
        start, end, text = row.get('startSeconds'), row.get('endSeconds'), row.get('text')
        if not (number(start) and number(end) and previous <= start < end <= duration and start >= 0
                and isinstance(text, str) and text.strip()):
            raise ValueError('Metin sırası/aralığı/geçerliliği hatalı; bozuk bölüm sessizce atılmaz')
        previous = start
        result.append({'startSeconds': start, 'endSeconds': end, 'text': text.strip()})
    return result


def timestamp(value):
    parts = value.replace(',', '.').split(':')
    if len(parts) not in (2, 3) or not re.fullmatch(r'\d{2}(?:[.,]\d{3})?', parts[-1]):
        raise ValueError('Geçersiz altyazı zamanı')
    if float(parts[-1]) >= 60 or len(parts) == 3 and not 0 <= int(parts[-2]) < 60:
        raise ValueError('Geçersiz altyazı zamanı')
    return sum(float(part) * 60 ** n for n, part in enumerate(reversed(parts)))


def subtitles(path, duration, normalization=None):
    path = Path(path)
    raw = path.read_text(encoding='utf-8-sig')
    if path.suffix.lower() in ('.json', '.json3'):
        data = json.loads(raw)
        if isinstance(data, list):
            rows = data
        elif 'segments' in data:
            rows = data['segments']
        else:
            rows = []
            controls, clipped = 0, 0
            for event in data.get('events', []):
                if event.get('segs') and 'tStartMs' in event and 'dDurationMs' in event:
                    text = ''.join(s.get('utf8', '') for s in event['segs']).strip()
                    if not text:
                        controls += 1
                        continue
                    start, end = event['tStartMs'] / 1000, (event['tStartMs'] + event['dDurationMs']) / 1000
                    # JSON3 son görüntüleme süresi video sonunu az miktarda aşabilir.
                    # Ham dosya korunur; yalnız <=3 saniyelik son taşma açıkça kaydedilir.
                    if start < duration < end <= duration + 3:
                        clipped += 1
                        end = duration
                    rows.append({'startSeconds': start, 'endSeconds': end, 'text': text})
            if normalization is not None:
                normalization.update(captionControlEvents=controls, endClippedCues=clipped,
                                     policy='JSON3_CONTROL_EVENTS_AND_FINAL_OVERRUN_MAX_3_SECONDS')
    elif path.suffix.lower() in ('.srt', '.vtt'):
        rows = []
        for block in re.split(r'\n\s*\n', raw.replace('\r\n', '\n')):
            lines = block.splitlines()
            if not lines or lines[0].startswith(('WEBVTT', 'NOTE', 'STYLE', 'REGION')):
                continue
            timing = next((i for i, line in enumerate(lines) if '-->' in line), None)
            if timing is None:
                raise ValueError('Zamanı olmayan altyazı bloğu')
            start, end = lines[timing].split('-->', 1)
            text = html.unescape(re.sub(r'<[^>]+>', '', '\n'.join(lines[timing + 1:]))).strip()
            rows.append({'startSeconds': timestamp(start.strip()),
                         'endSeconds': timestamp(end.strip().split()[0]), 'text': text})
    else:
        raise ValueError('Altyazı yalnız .srt, .vtt veya zamanlı .json olabilir')
    return validate_segments(rows, duration)


def validate_task(task):
    if task.get('schema') != VERSION or not re.fullmatch('[a-z0-9-]+', task.get('id', '')):
        raise ValueError('Görev schema/id geçersiz')
    categories = {c['id'] for c in load(APP / 'backend/src/main/resources/content-taxonomy.json')['categories']}
    if task.get('topicId') not in categories:
        raise ValueError('Konu ortak kontrollü sözlükte yok')
    sources = task.get('sources', [])
    if not 1 <= len(sources) <= 3:
        raise ValueError('Pilot 1–3 video içermeli')
    identities = set()
    for source in sources:
        identity = source.get('providerId', '')
        if not re.fullmatch('youtube:[A-Za-z0-9_-]{11}', identity) or identity in identities:
            raise ValueError('Sağlayıcı kimliği geçersiz veya tekrarlı')
        identities.add(identity)
        usage = source.get('usage', {})
        if usage.get('status') not in ('REFERENCE_ONLY', 'USER_SUPPLIED', 'PROCESSING_ALLOWED') or not usage.get('note'):
            raise ValueError('Kaynak kullanım beyanı eksik')
        if source.get('media') and usage['status'] != 'PROCESSING_ALLOWED':
            raise ValueError('Yerel medya için PROCESSING_ALLOWED beyanı gerekli')
        if source.get('transcript') and usage['status'] == 'REFERENCE_ONLY':
            raise ValueError('Yerel altyazı için kullanım beyanı gerekli')
        duration = source.get('durationSeconds')
        if duration is not None and (not number(duration) or duration <= 0):
            raise ValueError('Video süresi geçersiz')
        times = source.get('frameSeconds', [])
        if len(times) > 24 or any(not number(t) or t < 0 for t in times):
            raise ValueError('Kare zamanları geçersiz veya 24 sınırını aşıyor')


class Pipeline:
    def __init__(self, task, network=False, refresh=False):
        validate_task(task)
        self.task, self.network, self.refresh = task, network or refresh, refresh
        self.directory = STATE / task['id']
        self.metrics = dict(networkRequests=0, asrCalls=0, frameDecodes=0, stagesBuilt=0, stagesReused=0, modelCalls=0)
        self.artifacts = {}
        self.code = digest({name: file_hash(APP / 'scripts' / name) for name in
                            ('video_hatti.py', 'icerik_hatti.py', 'video-content-probe.py', 'video-source-inventory.py')})

    def stage(self, name, inputs, build):
        key = digest([VERSION, self.code, inputs])
        path = self.directory / 'asamalar' / name / f'{key}.json'
        if path.exists():
            saved = load(path)
            if saved.get('outputHash') == digest(saved.get('output')) and all(
                    (self.directory / p).is_file() and file_hash(self.directory / p) == h
                    for p, h in saved.get('artifacts', {}).items()):
                self.metrics['stagesReused'] += 1
                self.artifacts[str(path.relative_to(self.directory))] = file_hash(path)
                self.artifacts.update(saved.get('artifacts', {}))
                return saved['output']
        output, files = build()
        artifacts = {str(p.relative_to(self.directory)): file_hash(p) for p in files}
        write_json(path, dict(inputKey=key, outputHash=digest(output), output=output, artifacts=artifacts))
        self.artifacts[str(path.relative_to(self.directory))] = file_hash(path)
        self.artifacts.update(artifacts)
        self.metrics['stagesBuilt'] += 1
        return output

    def access(self, identity):
        probe = module('video-content-probe')
        inventory = module('video-source-inventory')
        shared = APP / 'veri/content-labels'
        cache = shared / 'video-content-cache' / f"{identity.replace(':', '-')}-{probe.cache_version(identity)}.json"
        # Hem eski başarısız erişim hem başarılı segmentler tekrar istekten önce okunur.
        if not self.refresh:
            if cache.exists():
                return load(cache)
            index = shared / 'video-content-index.json'
            if index.exists() and identity in load(index).get('sources', {}):
                return load(index)['sources'][identity]
            legacy = shared / 'video-content-cache' / f"{identity.replace(':', '-')}-public-caption-playlist-v2.json"
            if legacy.exists():
                return load(legacy)
        if not self.network:
            return {'providerId': identity, 'status': 'ACCESS_NOT_REQUESTED', 'reason': 'OFFLINE_DEFAULT'}
        metadata_path = shared / 'video-cache' / f"{identity.replace(':', '-')}-{inventory.VERSION}.json"
        if metadata_path.exists() and not self.refresh:
            metadata = load(metadata_path)
        else:
            self.metrics['networkRequests'] += 1
            metadata = inventory.fetch_metadata(identity)
            write_json(metadata_path, metadata)
        original_get = probe.get

        def counted_get(url):
            self.metrics['networkRequests'] += 1
            return original_get(url)

        probe.get = counted_get
        result = probe.probe(identity, metadata)
        result['durationSeconds'] = metadata.get('durationSeconds')
        result['metadata'] = {k: metadata.get(k) for k in ('originalTitle', 'channel', 'availability', 'chapters')}
        write_json(cache, result)
        return result

    def text(self, source, access):
        duration = source.get('durationSeconds') or access.get('durationSeconds')
        media = APP / source['media'] if source.get('media') else None
        transcript = APP / source['transcript'] if source.get('transcript') else None
        model = APP / self.task['asrModel'] if self.task.get('asrModel') else None
        model_hash = {str(p.relative_to(model)): file_hash(p) for p in sorted(model.rglob('*')) if p.is_file()} if model and model.is_dir() else None
        try:
            asr_version = importlib.metadata.version('faster-whisper')
        except importlib.metadata.PackageNotFoundError:
            asr_version = None
        text_source = {k: v for k, v in source.items() if k not in ('frameSeconds', 'boardCrop')}
        inputs = dict(source=text_source, access=access, transcript=file_hash(transcript) if transcript else None,
                      media=file_hash(media) if media else None, model=model_hash, asrVersion=asr_version)

        def build():
            if not number(duration) or duration <= 0:
                return dict(status='WAITING_DURATION', segments=[]), []
            if transcript:
                normalization = {}
                segments = subtitles(transcript, duration, normalization)
                origin = source.get('transcriptOrigin', 'USER_TIMED_TEXT')
            elif access.get('segments'):
                segments = validate_segments(access['segments'], duration)
                origin = 'PUBLIC_TIMED_TEXT'
            elif media and model_hash and asr_version:
                from faster_whisper import WhisperModel
                self.metrics['asrCalls'] += 1
                self.metrics['modelCalls'] += 1
                started = time.perf_counter()
                engine = WhisperModel(str(model.resolve()), device='cpu', compute_type='int8', local_files_only=True)
                found, info = engine.transcribe(str(media.resolve()), language='tr', beam_size=5, vad_filter=True)
                segments = validate_segments([dict(startSeconds=s.start, endSeconds=s.end, text=s.text) for s in found], duration)
                origin = 'LOCAL_ASR_UNREVIEWED'
                return dict(status='TIMED_TEXT_READY', origin=origin, durationSeconds=duration, segments=segments,
                            asrSeconds=round(time.perf_counter() - started, 3), modelHashes=model_hash,
                            language=info.language, teacherApproved=False), []
            else:
                reason = 'LOCAL_ASR_MODEL_OR_PACKAGE_MISSING' if media else access.get('reason', access['status'])
                return dict(status='WAITING_SOURCE', reason=reason, durationSeconds=duration, segments=[]), []
            return dict(status='TIMED_TEXT_READY', origin=origin, durationSeconds=duration,
                        segments=segments, normalization=normalization if transcript else {}, teacherApproved=False), []

        return self.stage(source['providerId'].replace(':', '-') + '-metin', inputs, build)

    def frames(self, source, text):
        media = APP / source['media'] if source.get('media') else None
        ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
        inputs = dict(media=file_hash(media) if media else None, text=text, times=source.get('frameSeconds', []),
                      ffmpeg=file_hash(ffmpeg) if ffmpeg else None, ffprobe=file_hash(ffprobe) if ffprobe else None)

        def build():
            if not media:
                return dict(status='WAITING_MEDIA', frames=[]), []
            if not ffmpeg or not ffprobe:
                return dict(status='WAITING_FFMPEG', frames=[]), []
            from PIL import Image
            duration = text.get('durationSeconds') or source.get('durationSeconds')
            if not number(duration):
                return dict(status='WAITING_DURATION', frames=[]), []
            result = subprocess.run([ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', str(media.resolve())],
                                    capture_output=True, check=True, timeout=60)
            actual = float(json.loads(result.stdout)['format']['duration'])
            if not number(actual) or abs(actual - duration) > 1:
                raise ValueError('Yerel medya süresi kaynak süresiyle uyuşmuyor; kırpılmış videoya tam video zamanı bağlanamaz')
            times = sorted(set(source.get('frameSeconds') or [
                (s['startSeconds'] + s['endSeconds']) / 2 for s in text.get('segments', [])][:24]))
            if any(t >= min(actual, duration) for t in times):
                raise ValueError('Kare zamanı video dışında')
            rows, files = [], set()
            for seconds in times:
                result = subprocess.run([ffmpeg, '-v', 'error', '-ss', str(seconds), '-i', str(media.resolve()),
                                         '-frames:v', '1', '-vf', 'scale=1280:-2', '-f', 'image2pipe', '-vcodec', 'png', '-'],
                                        capture_output=True, check=True, timeout=90)
                self.metrics['frameDecodes'] += 1
                # Pixel hash: aynı tahtayı farklı zamanlarda tek dosyada tutar; küçük değişikliği silmez.
                image = Image.open(io.BytesIO(result.stdout)).convert('RGB')
                sha = digest([image.size, hashlib.sha256(image.tobytes()).hexdigest()])
                path = self.directory / 'kareler' / f'{sha}.png'
                if not path.exists() or file_hash(path) != hashlib.sha256(result.stdout).hexdigest():
                    path.parent.mkdir(parents=True, exist_ok=True)
                    temp = path.with_suffix('.tmp.png')
                    temp.write_bytes(result.stdout)
                    os.replace(temp, path)
                files.add(path)
                rows.append(dict(seconds=seconds, file=str(path.relative_to(self.directory)), sha256=file_hash(path),
                                 pixelHash=sha, questionCompleteness='UNREVIEWED'))
            return dict(status='FRAMES_READY' if rows else 'WAITING_FRAME_SELECTION', frames=rows,
                        uniqueFiles=len(files), selection='EXPLICIT' if source.get('frameSeconds') else 'SEGMENT_MIDPOINT_CANDIDATES'), sorted(files)

        return self.stage(source['providerId'].replace(':', '-') + '-kareler', inputs, build)

    def hints(self, sources):
        path = APP / self.task['hints'] if self.task.get('hints') else None
        candidates = load(path) if path else []
        if not isinstance(candidates, list):
            raise ValueError('İpuçları liste olmalı')
        rows, ids = [], set()
        for candidate in candidates:
            for field in ('id', 'providerId', 'quote', 'rule', 'condition', 'example', 'counterexample', 'rationale'):
                if not isinstance(candidate.get(field), str) or not candidate[field].strip():
                    raise ValueError(f'İpucu {field} eksik')
            if candidate['id'] in ids:
                raise ValueError('Tekrarlı ipucu kimliği')
            ids.add(candidate['id'])
            source = next((s for s in sources if s['providerId'] == candidate['providerId']), None)
            if source is None or source['text']['status'] != 'TIMED_TEXT_READY':
                raise ValueError('İpucunun zamanlı kaynak metni yok')
            start, end = candidate.get('startSeconds'), candidate.get('endSeconds')
            if not (number(start) and number(end) and 0 <= start < end <= source['text']['durationSeconds']):
                raise ValueError('İpucu aralığı geçersiz')
            segments = [s for s in source['text']['segments'] if s['startSeconds'] < end and s['endSeconds'] > start]
            if not segments or candidate['quote'] not in ' '.join(s['text'] for s in segments):
                raise ValueError('Alıntı belirtilen zaman aralığında yok')
            frame_times = candidate.get('frameSeconds', [])
            frames = [f for f in source['frames']['frames'] if f['seconds'] in frame_times and start <= f['seconds'] < end]
            if not frames or len(frames) != len(set(frame_times)):
                raise ValueError('İpucunun bu aralıkta seçilmiş kare kanıtı yok')
            # Girdide yazılmış approved/verified alanları asla onay olarak kullanılmaz.
            content = {k: candidate[k] for k in ('id', 'providerId', 'quote', 'rule', 'condition', 'example', 'counterexample',
                                                'rationale', 'startSeconds', 'endSeconds')}
            content.update(topicId=self.task['topicId'], frames=frames, segments=segments,
                           sourceUsage=source['usage'], sourceEvidenceHash=digest(source))
            content['agentSourceReview'] = candidate.get('agentSourceReview')
            content['agentQuestionAssessment'] = candidate.get('questionCompleteness', 'UNREVIEWED')
            rows.append(dict(**content, contentHash=digest(content), reviewStatus='PENDING',
                             teacherApproved=False, questionCompleteness='UNREVIEWED'))
        return rows

    def verify(self, hints):
        tests = self.task.get('verificationTests', [])
        if not tests:
            return dict(status='NOT_CHECKED', teacherApproved=False)
        for name in tests:
            if not re.fullmatch(r'testler/[a-z0-9-]+\.py', name):
                raise ValueError('Matematik denetimi testler/ altında bir Python betiği olmalı')
        inputs = dict(hints=hints, tests={name: file_hash(APP / name) for name in tests})

        def build():
            results = []
            for name in tests:
                result = subprocess.run([sys.executable, '-X', 'utf8', str(APP / name)], cwd=APP,
                                        capture_output=True, text=True, encoding='utf-8', timeout=120)
                if result.returncode:
                    raise ValueError(f'Matematik denetimi başarısız: {name}\n{result.stdout[-1000:]}\n{result.stderr[-1000:]}')
                results.append(dict(script=name, sha256=inputs['tests'][name], exitCode=0,
                                    output=(result.stdout + result.stderr)[-1500:]))
            return dict(status='SCRIPT_CHECKED', results=results, teacherApproved=False,
                        scope='Yalnız test betiğinin açık iddiaları; bütün otomatik altyazı veya öğretmen onayı değildir.'), []

        return self.stage('matematik-denetimi', inputs, build)

    def run(self):
        started = time.perf_counter()
        sources = []
        for source in self.task['sources']:
            access = self.access(source['providerId'])
            text = self.text(source, access)
            frames = self.frames(source, text)
            sources.append(dict(providerId=source['providerId'], usage=source['usage'], access=access, text=text, frames=frames))
        hints = self.hints(sources)
        verification = self.verify(hints)
        status = 'REVIEW_REQUIRED' if hints else ('WAITING_HINTS' if all(s['text']['status'] == 'TIMED_TEXT_READY'
                                                                   and s['frames']['status'] == 'FRAMES_READY' for s in sources)
                                                else 'WAITING_SOURCE')
        evidence = dict(schema=VERSION, taskId=self.task['id'], topicId=self.task['topicId'], taskHash=digest(self.task),
                        codeHash=self.code, localInputs=local_inputs(self.task), sources=sources, hints=hints,
                        verification=verification, status=status, teacherApproved=False)
        sha = digest(evidence)
        path = self.directory / 'surumler' / f'{sha}.json'
        if not path.exists():
            write_json(path, evidence)
        self.artifacts[str(path.relative_to(self.directory))] = file_hash(path)
        proposal = self.directory / 'surumler' / f'{sha}.oneriler.md'
        lines = ['# Kaynaklı ders değişiklik önerisi', '', f'Kanıt sürümü: {sha}',
                 f"Hedef ders: {self.task.get('lesson', 'Henüz seçilmedi')}",
                 f"Matematik kontrolü: {verification['status']}",
                 'Öğretmen incelemesi bekler; bu dosya dersi değiştirmez.', '']
        for hint in hints:
            code = hint['providerId'].split(':')[1]
            lines += [f"## {hint['id']}", hint['rule'], '', f"Koşul: {hint['condition']}",
                      f"Neden: {hint['rationale']}", f"Örnek: {hint['example']}",
                      f"Karşı örnek: {hint['counterexample']}",
                      f"Kaynak: https://www.youtube.com/watch?v={code}&t={int(hint['startSeconds'])} ({hint['startSeconds']}–{hint['endSeconds']} sn)",
                      f"İpucu içerik hash'i: {hint['contentHash']}", '']
        if not proposal.exists():
            write_text(proposal, '\n'.join(lines) + '\n')
        self.artifacts[str(proposal.relative_to(self.directory))] = file_hash(proposal)
        manifest = dict(schema=VERSION, taskHash=digest(self.task), codeHash=self.code, status=status,
                        evidenceHash=sha, evidence=str(path.relative_to(self.directory)), artifacts=self.artifacts)
        write_json(self.directory / 'manifest.json', manifest)
        self.metrics['elapsedSeconds'] = round(time.perf_counter() - started, 3)
        report = dict(taskId=self.task['id'], status=status, evidenceHash=sha, metrics=self.metrics,
                      videos=[dict(providerId=s['providerId'], text=s['text']['status'], frames=s['frames']['status']) for s in sources],
                      hints=len(hints), teacherApproved=False)
        write_json(self.directory / 'rapor.json', report)
        lines = ['# Video inceleme paketi', '', f"Konu: {self.task['topicId']}", f'Durum: {status}',
                 f'Kanıt sürümü: {sha}', '', 'Bu paket ders yayını veya öğretmen onayı değildir.', '']
        for source in sources:
            lines += [f"## {source['providerId']}", f"Metin: {source['text']['status']}; kare: {source['frames']['status']}",
                      f"Kaynak: https://www.youtube.com/watch?v={source['providerId'].split(':')[1]}",
                      'İpucu yazmadan önce zamanlı metni ve ilgili kareleri birlikte incele.', '']
        lines += ['İpucu girdisi: id, providerId, startSeconds, endSeconds, quote, frameSeconds,',
                  'rule, condition, example, counterexample, rationale. Başlık/thumbnail kanıt değildir.',
                  'Eksik soru tamamlanmış kabul edilmez. Öğretmen, kaynak ve matematik incelemesini ayrıca yapar.',
                  'İncelenmiş ipucu ana derse ancak TAS-09 üzerinden sürümlü değişiklik önerisi olur.']
        write_text(self.directory / 'inceleme.md', '\n'.join(lines) + '\n')
        return report


def task_file(name):
    if not re.fullmatch('[a-z0-9-]+', name):
        raise ValueError('Görev adı geçersiz')
    return TASKS / f'{name}.json'


def check(task):
    """Salt okunur; kaynak ve sürümlü çıktının bütünlüğü. Ağ/ASR/decode yok."""
    runner = Pipeline(task)
    manifest = load(runner.directory / 'manifest.json')
    if manifest['taskHash'] != digest(task) or manifest['codeHash'] != runner.code:
        raise ValueError('Görev/kod değişti; video calistir ile kanıtı güncelle')
    for name, sha in manifest['artifacts'].items():
        path = runner.directory / name
        if not path.is_file() or file_hash(path) != sha:
            raise ValueError(f'Kanıt kayıp/değişmiş: {name}')
    evidence = load(runner.directory / manifest['evidence'])
    if digest(evidence) != manifest['evidenceHash']:
        raise ValueError('Kanıt hash hatası')
    if evidence['localInputs'] != local_inputs(task):
        raise ValueError('Yerel medya/altyazı/ipucu/model değişti; video calistir gerekli')
    return dict(taskId=task['id'], status=manifest['status'], integrity='PASS')


def listing(reference, network=False, refresh=False):
    inventory, probe = module('video-source-inventory'), module('video-content-probe')
    identity = inventory.provider_id(reference)
    if not identity or not identity.startswith('youtube-playlist:'):
        raise ValueError('YouTube oynatma listesi bağlantısı gerekli')
    path = APP / 'veri/content-labels/video-content-cache' / f"{identity.replace(':', '-')}-{probe.VERSION}.json"
    requests = 0
    if path.exists() and not refresh:
        row = load(path)
    elif network or refresh:
        original = probe.get

        def counted(url):
            nonlocal requests
            requests += 1
            return original(url)

        probe.get = counted
        row = probe.probe(identity, {'url': 'https://www.youtube.com/playlist?list=' + identity.split(':')[1]})
        write_json(path, row)
    else:
        raise ValueError('Liste önbellekte yok; ilk erişim için --erisim kullan')
    # FIRST_PUBLIC_RESPONSE_ONLY ve RSS_RECENT_ENTRIES_ONLY tam liste iddiası değildir.
    report = dict(providerId=identity, status=row['status'], coverage=row.get('coverage'), entries=row.get('entries', []),
                  evidenceHash=digest(row), networkRequests=requests)
    write_json(STATE / 'listeler' / f"{identity.split(':')[1]}.json", report)
    return report


def acquire(task, refresh=False):
    """Kullanıcının seçtiği pilotu yerelde hazırlar; tekrar denemeyi açık bayrağa bağlar.

    yt-dlp isteği sayısı ölçülmez; yalnız süreç sayısı raporlanır. Özel hesap,
    çerez, proxy veya erişim kısıtını aşan seçenek kullanılmaz.
    """
    validate_task(task)
    executable = shutil.which('yt-dlp')
    downloader = [sys.executable, '-m', 'yt_dlp'] if importlib.util.find_spec('yt_dlp') else [executable] if executable else None
    if not downloader:
        raise ValueError('yt-dlp kurulu değil; yerel medya/altyazı yollarını elle sağlayabilirsin')
    results = []
    for source in task['sources']:
        if source['usage']['status'] != 'PROCESSING_ALLOWED' or not source.get('media') or not source.get('transcript'):
            raise ValueError('edin için kullanım beyanı, media ve transcript yolları gerekli')
        identity = source['providerId']
        marker = STATE / 'edinim' / (identity.replace(':', '-') + '.json')
        if marker.exists() and not refresh:
            saved = load(marker)
            expected_paths = {str((APP / source[k]).resolve()) for k in ('media', 'transcript')}
            if saved['status'] == 'UNAVAILABLE' or (set(saved['files']) == expected_paths and all(
                    Path(p).is_file() and file_hash(p) == h for p, h in saved['files'].items())):
                results.append(dict(providerId=identity, status=saved['status'], reused=True, downloadProcesses=0))
                continue
        media, transcript = (APP / source[k] for k in ('media', 'transcript'))
        media.parent.mkdir(parents=True, exist_ok=True)
        if transcript != media.with_suffix('.tr.json3'):
            raise ValueError('edin transcript yolu media adının .tr.json3 uzantısı olmalı')
        command = [*downloader, '--ignore-config', '--js-runtimes', 'node', '--no-playlist', '--no-progress', '--quiet', '--no-warnings', '--socket-timeout', '15',
                   '--retries', '0', '--extractor-retries', '0', '--write-auto-subs', '--write-subs', '--sub-langs', 'tr',
                   '--sub-format', 'json3', '--format', 'bestvideo[height<=720][ext=mp4]/best[height<=720][ext=mp4]',
                   '--dump-single-json', '--no-simulate', '-o', str(media.resolve()),
                   'https://www.youtube.com/watch?v=' + identity.split(':')[1]]
        started = time.perf_counter()
        result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=900)
        if result.returncode or not media.is_file() or not transcript.is_file():
            saved = dict(providerId=identity, status='UNAVAILABLE', files={}, reason='PUBLIC_MEDIA_OR_CAPTIONS_UNAVAILABLE',
                         exitCode=result.returncode, diagnostic=re.sub(r'https?://\S+', '[url]', result.stderr[-1000:]))
        else:
            metadata = json.loads(result.stdout)
            saved = dict(providerId=identity, status='ACQUIRED',
                         files={str(p.resolve()): file_hash(p) for p in (media, transcript)},
                         metadata={k: metadata.get(k) for k in ('id', 'title', 'duration', 'availability', 'license')},
                         durationSeconds=metadata['duration'], elapsedSeconds=round(time.perf_counter() - started, 3),
                         downloaderVersion=subprocess.run([*downloader, '--version'], capture_output=True, text=True, check=True).stdout.strip())
        write_json(marker, saved)
        results.append(dict(providerId=identity, status=saved['status'], reused=False, downloadProcesses=1))
    return dict(taskId=task['id'], sources=results)


def package(task):
    check(task)
    directory = STATE / task['id']
    manifest = load(directory / 'manifest.json')
    evidence = load(directory / manifest['evidence'])
    result = dict(schema=VERSION, taskId=task['id'], topicId=task['topicId'], status=manifest['status'],
                  evidenceHash=manifest['evidenceHash'], taskHash=manifest['taskHash'], codeHash=manifest['codeHash'],
                  evidenceDirectory=str(directory.relative_to(APP)), artifacts=manifest['artifacts'],
                  verification=evidence['verification'], teacherApproved=False,
                  lastRun=load(directory / 'rapor.json'),
                  sources=[dict(providerId=s['providerId'], usage=s['usage'], segments=len(s['text']['segments']),
                                normalization=s['text'].get('normalization'), frames=s['frames']['frames']) for s in evidence['sources']],
                  hints=[dict(id=c['id'], contentHash=c['contentHash'], reviewStatus=c['reviewStatus']) for c in evidence['hints']])
    path = TASKS.parent / 'yayin' / f"{task['id']}.json"
    write_json(path, result)
    return dict(taskId=task['id'], package=str(path.relative_to(APP)), status=manifest['status'])


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['calistir', 'durum', 'kontrol', 'liste', 'edin', 'paket'])
    parser.add_argument('task', nargs='?')
    parser.add_argument('--erisim', action='store_true')
    parser.add_argument('--erisim-yenile', action='store_true')
    args = parser.parse_args(argv)
    names = [args.task] if args.task else sorted(p.stem for p in TASKS.glob('*.json'))
    if args.command == 'calistir' and not args.task:
        parser.error('calistir için görev gerekli')
    try:
        if args.command == 'liste':
            with lock():
                result = listing(args.task or '', args.erisim, args.erisim_yenile)
            print(json.dumps(result, ensure_ascii=False))
            return 0 if result['entries'] else 3
        code = 0
        for name in names:
            task = load(task_file(name))
            if task['id'] != name:
                raise ValueError('Görev kimliği dosya adıyla uyuşmuyor')
            if args.command == 'edin':
                if not args.erisim and not args.erisim_yenile:
                    raise ValueError('edin için --erisim gerekli')
                with lock():
                    result = acquire(task, args.erisim_yenile)
                code = 3 if any(s['status'] == 'UNAVAILABLE' for s in result['sources']) else 0
            elif args.command == 'calistir':
                with lock():
                    result = Pipeline(task, args.erisim, args.erisim_yenile).run()
                code = 3 if result['status'].startswith('WAITING_') else 0
            elif args.command == 'paket':
                with lock():
                    result = package(task)
            else:
                result = check(task)
            print(json.dumps(result, ensure_ascii=False))
        return code
    except (ValueError, OSError, KeyError, subprocess.SubprocessError) as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
