"""TAS-09: konu içeriği için aşama hash'li, kaldığı yerden devam eden tek komut.

  python scripts/ivme.py icerik durum [kavram]                  aşama tablosu; neyin yeniden çalışacağı
  python scripts/ivme.py icerik calistir <kavram|--hepsi> [--yeniden AŞAMA]
                                                                eksik veya girdisi değişen aşamaları sırayla çalıştırır
  python scripts/ivme.py icerik kontrol [kavram]                yazmadan: yayımlanan kanıt girdilerle güncel mi
  python scripts/ivme.py icerik karar <kavram> --rol ROL --karar KABUL|DUZELTME --not "..." [--bolumler s1,s2] [--sorular KOD,...]
  python scripts/ivme.py icerik gozlem <kavram> --sorular KOD,... --ilk-deneme DOGRU|YANLIS|BOS --yardim YOK|IPUCU|COZUM --not "..."
                                                                yalnız gerçek insan incelemesi/gözlemi kaydı içindir

Aşamalar: kaynak → kanit → taslak → derle → dogrula → inceleme → paket. Her aşama girdilerinin
hash'ini (inputKey) ve belirleyici çıktısının hash'ini saklar; aynı girdide atlanır, bir aşama aynı
çıktıyı yeniden üretirse sonrakiler de atlanır. Kesinti olursa yalnız tamamlanmamış aşama yeniden çalışır.

Görev tanımı `icerik-hatti/gorevler/<kavram>.json` (elle, sürümlü); insan kararları `icerik-hatti/kararlar/`;
yayın manifesti `icerik-hatti/yayin/`; kontrol noktası ve agent görev paketi `veri/icerik-hatti/<kavram>/`
(Git dışı). Hat model çağırmaz: taslak eksikse görev paketini yazar ve 3 koduyla durur; işi yapan agent
paketi okuyup dersi/çözümü yazar ve komutu yeniden çalıştırır. Teknik geçiş öğretmen onayı değildir.
"""
import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlopen

APP = Path(__file__).resolve().parents[1]
ROOT = Path(os.environ.get('IVME_ICERIK_KOK') or APP)  # testler çıktı/karar/yayın kökünü geçici dizine alır
STATE = Path(os.environ.get('IVME_ICERIK_DURUM') or APP / 'veri/icerik-hatti')
TASKS = ROOT / 'icerik-hatti/gorevler'
DECISIONS = ROOT / 'icerik-hatti/kararlar'
RELEASES = ROOT / 'icerik-hatti/yayin'
REGISTRY = 'frontend/src/learn/content/kanit/index.js'
ARCHIVE = APP.parent / 'veri-hatti/ogm-yks-cikmis/ham/sorular_son.json'
BOOKS = APP.parent / 'Kaynaklar/yks-cikmis-sorular/OGM Kitapciklari'
READER = APP / 'scripts/icerik-hatti-ders.mjs'
GENERIC_TESTS = ('testler/icerik-hatti.test.mjs', 'testler/konu-ogrenme-bicim.test.mjs')
TEST_INPUT_DIRS = ('frontend/src/learn/content', 'frontend/src/learn/engine')
STAGES = ('kaynak', 'kanit', 'taslak', 'derle', 'dogrula', 'inceleme', 'paket')
REACHED = {'kaynak': 'EXTRACTED', 'kanit': 'EVIDENCE_READY', 'taslak': 'DRAFTED', 'derle': 'DRAFTED',
           'dogrula': 'VALIDATED', 'inceleme': 'VALIDATED'}
SCHEMA, DECISION_SCHEMA, RELEASE_SCHEMA = 'ivme.icerik-gorev/v1', 'ivme.icerik-karar/v1', 'ivme.icerik-yayin/v1'
PIPELINE_VERSION = 'icerik-hatti-v1'
TEMPLATES = {'konuyu-ogrenelim/tas08-v1'}
ROLES = ('guided', 'independent')
WAITING = 3
LOCK_STALE_SECONDS = 1800


# ---------------------------------------------------------------- dosya ve hash

def canon(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def digest(value):
    return hashlib.sha256(canon(value).encode()).hexdigest()


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    try:
        return json.loads(Path(path).read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def write_text(path, text):
    """Atomik: yarım yazılmış dosya tamamlanmış aşama gibi görünmez."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f'{path.name}.tmp.{os.getpid()}')
    with open(temporary, 'w', encoding='utf-8', newline='\n') as stream:
        stream.write(text)
    os.replace(temporary, path)


def write_json(path, value):
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')


class HashCache:
    """Büyük dosyaların hash'i (yol, boyut, mtime) değişmedikçe yeniden hesaplanmaz."""

    def __init__(self):
        self.path = STATE / '_hash-onbellek.json'
        self.items = read_json(self.path) or {}
        self.dirty = False

    def __call__(self, path):
        path = Path(path)
        stat = path.stat()
        key = str(path.resolve())
        stamp = [stat.st_size, stat.st_mtime_ns]
        cached = self.items.get(key)
        if cached and cached[:2] == stamp:
            return cached[2]
        value = hashlib.sha256()
        with open(path, 'rb') as stream:
            for chunk in iter(lambda: stream.read(1 << 20), b''):
                value.update(chunk)
        self.items[key] = [*stamp, value.hexdigest()]
        self.dirty = True
        return value.hexdigest()

    def save(self):
        if self.dirty:
            write_json(self.path, self.items)
            self.dirty = False


def pid_alive(pid):
    if os.name == 'nt':
        import ctypes
        handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
        if not handle:
            return False
        code = ctypes.c_ulong()
        ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(handle)
        return code.value == 259
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


class Busy(Exception):
    pass


class TaskLock:
    """Aynı konu için tek çalıştırıcı. Sahibi ölmüş veya uzun süre dokunulmamış kilit devralınır."""

    def __init__(self, concept):
        self.path = STATE / concept / '.kilit'
        self.held = False

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        for _ in range(2):
            try:
                handle = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(handle, str(os.getpid()).encode())
                os.close(handle)
                self.held = True
                return self
            except FileExistsError:
                owner = self.path.read_text(encoding='ascii', errors='ignore').strip()
                stale = time.time() - self.path.stat().st_mtime > LOCK_STALE_SECONDS
                if stale or not owner.isdigit() or not pid_alive(int(owner)):
                    self.path.unlink(missing_ok=True)
                    continue
                raise Busy(f'{self.path.parent.name} başka bir süreçte (PID {owner}) çalışıyor')
        raise Busy('Kilit alınamadı')

    def touch(self):
        os.utime(self.path)

    def __exit__(self, *exc):
        if self.held:
            self.path.unlink(missing_ok=True)


# ---------------------------------------------------------------- görev tanımı

def spec_path(concept):
    return TASKS / f'{concept}.json'


def all_concepts():
    return sorted(p.stem for p in TASKS.glob('*.json'))


def load_spec(concept):
    spec = read_json(spec_path(concept))
    if not spec:
        raise ValueError(f'Görev tanımı yok veya okunamıyor: {spec_path(concept).relative_to(ROOT)}')
    problems = []
    if spec.get('schema') != SCHEMA:
        problems.append(f'schema {SCHEMA} olmalı')
    if spec.get('conceptId') != concept:
        problems.append('conceptId dosya adıyla aynı olmalı')
    if spec.get('templateVersion') not in TEMPLATES:
        problems.append(f'templateVersion bilinmiyor; desteklenen: {sorted(TEMPLATES)}')
    source = spec.get('primarySource') or {}
    for key in ('title', 'url', 'sha256', 'local', 'pages'):
        if not source.get(key):
            problems.append(f'primarySource.{key} eksik')
    for key in ('lesson', 'output', 'testScope'):
        if not spec.get(key):
            problems.append(f'{key} eksik')
    for code, question in (spec.get('questions') or {}).items():
        if question.get('role') not in ROLES:
            problems.append(f'{code}: role {ROLES} olmalı')
    if problems:
        raise ValueError(f'{concept} görev tanımı geçersiz: ' + '; '.join(problems))
    spec.setdefault('claims', {})
    spec.setdefault('sections', {})
    spec.setdefault('questions', {})
    spec.setdefault('tests', [])
    return spec


def load_decisions(concept):
    record = read_json(DECISIONS / f'{concept}.json') or {}
    return {'decisions': record.get('decisions', []), 'observations': record.get('observations', [])}


# ---------------------------------------------------------------- aşama altyapısı

class Stop(Exception):
    """Aşama sonuç üretemedi. WAITING: agent/insan girdisi gerekiyor; FAILED: girdi veya kanıt hatası."""

    def __init__(self, state, message, next_action):
        super().__init__(message)
        self.state, self.message, self.next_action = state, message, next_action


class Context:
    def __init__(self, concept, dry=False):
        self.concept = concept
        self.spec = load_spec(concept)
        self.dry = dry
        self.hash = HashCache()
        self.directory = STATE / concept
        self.state = read_json(self.directory / 'durum.json') or {}
        self.outputs = {}
        self._facts = None
        self._pack = None

    @property
    def pack(self):
        if self._pack is None:
            import pdf_kanit_paketi
            self._pack = pdf_kanit_paketi
        return self._pack

    def path(self, relative):
        return ROOT / relative if relative in (self.spec['output'], REGISTRY) or relative.startswith('icerik-hatti/') else APP / relative

    def stage_record(self, name):
        return (self.state.get('stages') or {}).get(name) or {}

    def stored_output(self, name):
        record = self.stage_record(name)
        output = read_json(self.directory / f'{name}.json')
        if record.get('state') == 'OK' and output is not None and digest(output) == record.get('outputSha256'):
            return output
        return None

    def facts(self):
        """Dersin tarayıcıdaki ayrıştırıcıyla okunmuş gerçekleri (bölümler, çıkmış soru bağları, çözümler)."""
        if self._facts is None:
            lesson = APP / self.spec['lesson']
            if not lesson.is_file():
                raise Stop('WAITING', f'Ders dosyası yok: {self.spec["lesson"]}',
                           f'Ders taslağını yaz: {self.spec["lesson"]}')
            result = subprocess.run(['node', str(READER), self.concept, str(lesson)], cwd=APP, capture_output=True,
                                    encoding='utf-8', errors='replace')
            if result.returncode:
                raise Stop('FAILED', 'Ders ayrıştırılamadı:\n' + result.stderr[-1500:], 'Ders biçim hatasını düzelt')
            self._facts = json.loads(result.stdout)
        return self._facts


def save_state(ctx):
    ctx.state.update(schema='ivme.icerik-durum/v1', conceptId=ctx.concept, specSha256=digest(ctx.spec),
                     updatedAt=datetime.now(timezone.utc).isoformat(timespec='seconds'))
    write_json(ctx.directory / 'durum.json', ctx.state)


def test_hook(stage, moment):
    """Kesinti testi: IVME_ICERIK_TEST_KES=<aşama>:once|sonra süreci tam o anda öldürür."""
    if os.environ.get('IVME_ICERIK_TEST_KES') == f'{stage}:{moment}':
        os._exit(75)


# ---------------------------------------------------------------- 1. kaynak

def kaynak_inputs(ctx):
    source = ctx.spec['primarySource']
    return {'sourceSha256': source['sha256'], 'pages': source['pages'], 'pack': ctx.pack.current_versions(),
            'pipeline': PIPELINE_VERSION}


def kaynak_intact(ctx, output):
    pdf = APP / ctx.spec['primarySource']['local']
    if not pdf.is_file() or ctx.hash(pdf) != output['sourceSha256']:
        return False
    directory = ctx.pack.pack_dir(output['sourceSha256'])
    for page, layout_sha in output['pages'].items():
        record = read_json(directory / 'sayfalar' / f'{int(page):04d}.json')
        if not record or record['stages']['layout']['outputSha256'] != layout_sha:
            return False
    return True


def kaynak_run(ctx):
    source = ctx.spec['primarySource']
    pdf = APP / source['local']
    if not pdf.is_file():
        if ctx.dry:
            raise Stop('FAILED', f'Ana kaynak yerelde yok: {source["local"]}',
                       f'python scripts/ivme.py icerik calistir {ctx.concept}')
        with urlopen(source['url'], timeout=120) as response:
            data = response.read()
        if sha_bytes(data) != source['sha256']:
            raise Stop('FAILED', 'İndirilen ana kaynağın hash’i görev tanımından farklı; kaynak sürümü değişmiş olabilir',
                       'Yeni kaynağı ve bütün iddiaları yeniden incele; sha256 ve blok kimliklerini güncelle')
        pdf.parent.mkdir(parents=True, exist_ok=True)
        temporary = pdf.with_name(pdf.name + '.tmp')
        temporary.write_bytes(data)
        os.replace(temporary, pdf)
    if ctx.hash(pdf) != source['sha256']:
        raise Stop('FAILED', f'{source["local"]} hash’i görev tanımından farklı', 'Doğru kaynak sürümünü yerleştir')
    directory = ctx.pack.pack_dir(source['sha256'])
    info = {}
    if not ctx.dry:
        summary, stats = ctx.pack.build_pack(pdf, source['pages'], sha=source['sha256'])
        if summary.get('failures'):
            raise Stop('FAILED', f'PDF kanıt paketinde sayfa hatası: {summary["failures"][:3]}', 'TAS-07 paket hatasını düzelt')
        info = {'packStats': dict(stats)}
    verified = ctx.pack.verify_pack(directory, pdf)
    if not verified['ok']:
        raise Stop('FAILED', f'PDF kanıt paketi bozuk: {verified["problems"][:3]}',
                   f'python scripts/ivme.py pdf kanit dogrula {source["local"]}')
    with ctx.pack.open_pdf(pdf) as doc:
        numbers = ctx.pack.page_range(source['pages'], doc.page_count)
    pages = {}
    for number in numbers:
        record = read_json(directory / 'sayfalar' / f'{number:04d}.json')
        if not record:
            raise Stop('FAILED', f'Sayfa {number} pakette yok', f'python scripts/ivme.py icerik calistir {ctx.concept} --yeniden kaynak')
        pages[str(number)] = record['stages']['layout']['outputSha256']
    return {'sourceSha256': source['sha256'], 'pages': pages}, info


# ---------------------------------------------------------------- 2. kanit

def question_records(codes):
    records = {q['id']: q for q in json.loads(ARCHIVE.read_text(encoding='utf-8'))['sorular']}
    return {code: records.get(code) for code in codes}


def question_image(record):
    return APP / f'veri/resimler-pilot/kirpilmis/{record["sinav"]}/matematik/{record["id"]}.webp'


def kanit_inputs(ctx):
    spec = ctx.spec
    files = {}
    for code, record in question_records(spec['questions']).items():
        if record:
            image = question_image(record)
            book = BOOKS / f'{record["kopyalar"][0]["kitap"]}.pdf'
            files[code] = {'record': digest(record), 'image': ctx.hash(image) if image.is_file() else None,
                           'book': ctx.hash(book) if book.is_file() else None}
    return {'kaynak': ctx.outputs['kaynak'] and digest(ctx.outputs['kaynak']), 'claims': spec['claims'],
            'sections': spec['sections'], 'questions': spec['questions'], 'files': files, 'pipeline': PIPELINE_VERSION}


def kanit_run(ctx):
    spec, source = ctx.spec, ctx.spec['primarySource']
    directory = ctx.pack.pack_dir(source['sha256'])
    problems = []
    claims, texts = {}, {}
    for key, claim in spec['claims'].items():
        if str(claim['page']) not in ctx.outputs['kaynak']['pages']:
            problems.append(f'iddia {key}: sayfa {claim["page"]} primarySource.pages içinde değil')
            continue
        record = read_json(directory / 'sayfalar' / f'{claim["page"]:04d}.json')
        blocks = {b['id']: b for b in record['layout']['blocks']}
        missing = [block for block in claim['blocks'] if block not in blocks]
        if missing or not claim['blocks']:
            problems.append(f'iddia {key}: sayfa {claim["page"]} içinde blok yok {missing or "(boş liste)"}')
            continue
        claims[key] = {'title': claim['title'], 'page': claim['page'], 'url': f'{source["url"]}#page={claim["page"]}',
                       'blocks': [{'id': block, 'bbox': blocks[block]['bbox'],
                                   'textSha256': sha_bytes(blocks[block]['text'].encode())} for block in claim['blocks']],
                       'layoutSha256': record['stages']['layout']['outputSha256']}
        texts[key] = [blocks[block]['text'] for block in claim['blocks']]
    for section, value in spec['sections'].items():
        if not value.get('claims'):
            problems.append(f'bölüm {section}: kaynak iddiası yok (ana kaynakta karşılığı yoksa açık eksik olarak kalır)')
        problems += [f'bölüm {section}: tanımsız iddia {ref}' for ref in value.get('claims', []) if ref not in spec['claims']]
    questions = {}
    for code, record in question_records(spec['questions']).items():
        item = spec['questions'][code]
        if not record:
            problems.append(f'{code}: çıkmış soru arşivinde yok')
            continue
        if item.get('sectionId') not in spec['sections']:
            problems.append(f'{code}: sectionId {item.get("sectionId")} tanımsız')
        problems += [f'{code}: tanımsız iddia {ref}' for ref in item.get('claims', []) if ref not in spec['claims']]
        image = question_image(record)
        if not image.is_file():
            problems.append(f'{code}: özgün soru görseli yok ({image.relative_to(APP).as_posix()})')
            continue
        image_sha = ctx.hash(image)
        if not item.get('imageSha256'):
            raise Stop('WAITING', f'{code}: soru görseli incelenmedi (görev tanımında imageSha256 yok)',
                       f'{image.relative_to(APP).as_posix()} görselini aç, soruyu oku; incelediğin görselin sha256 değerini yaz')
        if item['imageSha256'] != image_sha:
            problems.append(f'{code}: incelenen soru görseli değişti; görseli yeniden incele')
        book = record['kopyalar'][0]['kitap']
        book_path = BOOKS / f'{book}.pdf'
        if not book_path.is_file():
            problems.append(f'{code}: kaynak kitapçık yok ({book}.pdf)')
            continue
        questions[code] = {**item, 'imageSha256': image_sha, 'sourceSha256': ctx.hash(book_path),
                           'imagePath': image.relative_to(APP).as_posix(), 'exam': record['sinav'], 'year': record['yil'],
                           'archiveId': record['eski_id'], 'sourceBook': book, 'sourcePage': record['sayfa'],
                           'bookQuestion': record['kitap_nolar'][0], 'answerKey': record['cevaplar'][0]}
    if problems:
        raise Stop('FAILED', 'Kanıt paketi kurulamadı:\n  - ' + '\n  - '.join(problems),
                   f'Görev tanımını düzelt: {spec_path(ctx.concept).relative_to(ROOT).as_posix()}')
    return {'claims': claims, 'claimTexts': texts, 'questions': questions}, {}


# ---------------------------------------------------------------- 3. taslak (agent işi)

def draft_problems(ctx):
    spec, facts, evidence = ctx.spec, ctx.facts(), ctx.outputs['kanit']
    problems = []
    if facts['id'] != ctx.concept:
        problems.append(f'@ders kimliği {facts["id"]}; {ctx.concept} olmalı')
    lesson_sections = [s['id'] for s in facts['sections']]
    for section in lesson_sections:
        if section not in spec['sections']:
            problems.append(f'bölüm {section}: görev tanımında kaynak iddiası yok (önce ana kaynakta karşılığını bul)')
    for section in spec['sections']:
        if section not in lesson_sections:
            problems.append(f'bölüm {section}: görev tanımında var, derste yok')
    if lesson_sections != [s for s in spec['sections'] if s in lesson_sections]:
        problems.append('bölüm sırası derste ve görev tanımında aynı olmalı')
    for section in facts['sections']:
        if 3 not in section['leveled']:
            problems.append(f'bölüm {section["id"]}: üç düzeyi dolu ::duzey yok')
        if not section['inquiries']:
            problems.append(f'bölüm {section["id"]}: ::sorgula yok')
        if sum(1 for ok in section['worked'] if ok) < 2:
            problems.append(f'bölüm {section["id"]}: her adımı gerekçeli en az iki ::ornek yok')
        for code in section['pastCodes']:
            if code not in spec['questions']:
                problems.append(f'bölüm {section["id"]}: ::cikmis {code} kaynaklı soru listesinde yok')
    past = {code: section['id'] for section in facts['sections'] for code in section['pastCodes']}
    for code, item in spec['questions'].items():
        if item['role'] == 'guided' and past.get(code) != item['sectionId']:
            problems.append(f'{code}: rehberli soru {item["sectionId"]} bölümünde ::cikmis olarak yok')
        if item['role'] == 'independent' and code in facts['practiceIds']:
            problems.append(f'{code}: bağımsız aktarım sorusu derste çözülmemeli')
        raw = facts['worked'].get(code)
        if not raw:
            problems.append(f'{code}: WORKED_EXAMS çözümü yok')
            continue
        solution = json.loads(raw)
        if solution.get('answer') != evidence['questions'][code]['answerKey']:
            problems.append(f'{code}: çözüm cevabı {solution.get("answer")}, cevap anahtarı {evidence["questions"][code]["answerKey"]}')
        steps = solution.get('steps') or []
        if not steps or not all(str(s.get('text', '')).strip() and str(s.get('why', '')).strip() for s in steps):
            problems.append(f'{code}: her adımda ne (text) ve neden (why) gerekli')
        for field in ('title', 'cue', 'result', 'check', 'tip', 'mistake'):
            if not str(solution.get(field, '')).strip():
                problems.append(f'{code}: {field} alanı eksik')
        role = solution.get('teachingRole', 'guided')
        if role != item['role']:
            problems.append(f'{code}: teachingRole {role}; görev tanımı {item["role"]}')
    return problems


def draft_packet(ctx, problems):
    spec, evidence = ctx.spec, ctx.outputs['kanit']
    lines = [f'# Görev paketi: {ctx.concept} taslağı', '',
             f'Görev: `content:{ctx.concept}:{spec["contentVersion"]}` · şablon `{spec["templateVersion"]}` · aşama `taslak`.',
             f'Model önerisi: {json.dumps(spec.get("modelPlan", {}).get("draft", {}), ensure_ascii=False)}. Mevcut model farklıysa belirt.',
             '', 'Kurallar: `AGENTS.md` “Konuyu Öğrenelim”, `docs/icerik/konuyu-ogrenelim.md`, inceleme belgesi §10.2–10.3.',
             'Kanıtsız iddia yazma; kaynakta olmayan genişletmeyi bölüm notunda “özgün türetim” olarak belirt.',
             'Soru çözümünü özgün görseli görmeden yazma; sonucu bağımsız hesapla sına (konu testi dosyası).', '',
             '## Eksikler', '', *[f'- {p}' for p in problems], '', '## Bölümler ve kaynak iddiaları', '']
    for section, value in spec['sections'].items():
        lines.append(f'### {section} — {value.get("note", "")}')
        for ref in value.get('claims', []):
            claim = spec['claims'][ref]
            lines.append(f'- **{ref}** · {claim["title"]} · s.{claim["page"]} · {spec["primarySource"]["url"]}#page={claim["page"]}')
            lines += [f'  > {text.strip()[:600]}'.replace('\n', ' ') for text in evidence['claimTexts'].get(ref, [])]
        lines.append('')
    lines += ['## Kaynaklı sorular', '']
    for code, item in evidence['questions'].items():
        lines.append(f'- `{code}` · {item["role"]} · bölüm {item["sectionId"]} · {item["year"]} {item["exam"]} · '
                     f'anahtar {item["answerKey"]} · görsel `{item["imagePath"]}`')
    lines += ['', f'Bitince: `python scripts/ivme.py icerik calistir {ctx.concept}` — değişmeyen aşamalar atlanır.', '']
    path = ctx.directory / 'gorev-taslak.md'
    write_text(path, '\n'.join(lines))
    return path


def taslak_inputs(ctx):
    return {'kanit': digest(ctx.outputs['kanit']), 'template': ctx.spec['templateVersion'],
            'lessonSha256': sha_bytes((APP / ctx.spec['lesson']).read_bytes()) if (APP / ctx.spec['lesson']).is_file() else None,
            'facts': digest(ctx.facts()), 'pipeline': PIPELINE_VERSION,
            'scope': {'sections': list(ctx.spec['sections']),
                      'questions': {code: [q['sectionId'], q['role']] for code, q in ctx.spec['questions'].items()}}}


def taslak_run(ctx):
    problems = draft_problems(ctx)
    if problems:
        packet = None if ctx.dry else draft_packet(ctx, problems)
        where = f'; görev paketi {packet.relative_to(APP).as_posix() if packet.is_relative_to(APP) else packet}' if packet else ''
        raise Stop('WAITING', f'Taslak şablonu karşılamıyor ({len(problems)} eksik){where}:\n  - ' + '\n  - '.join(problems[:12]),
                   'Agent görev paketindeki eksikleri tamamlar; ardından aynı komut yeniden çalıştırılır')
    facts = ctx.facts()
    return {'lessonSha256': sha_bytes((APP / ctx.spec['lesson']).read_bytes()),
            'solutions': {code: sha_bytes(facts['worked'][code].encode()) for code in ctx.spec['questions']},
            'sections': {s['id']: s['exams'] for s in facts['sections']}, 'practiceIds': facts['practiceIds']}, {}


# ---------------------------------------------------------------- 4. derle

def content_sha(ctx):
    """İnsan kararının bağlandığı içerik: ders, çözümler, iddialar ve bölüm bağları. Değişirse onay düşer."""
    draft = ctx.outputs['taslak']
    return digest({'lessonSha256': draft['lessonSha256'], 'solutions': draft['solutions'],
                   'claims': ctx.outputs['kanit']['claims'], 'sections': ctx.spec['sections'],
                   'questions': {code: {k: q[k] for k in ('sectionId', 'role', 'claims')} for code, q in ctx.spec['questions'].items()}})


def review_state(ctx, current):
    record = load_decisions(ctx.concept)
    sections, questions = set(ctx.spec['sections']), set(ctx.spec['questions'])
    accepted_sections, accepted_questions, matching = set(), set(), []
    for decision in record['decisions']:
        if decision.get('contentSha256') != current:
            continue
        matching.append(decision)
        if decision.get('role') == 'ogretmen' and decision.get('decision') == 'KABUL':
            accepted_sections |= set(decision.get('sections') or sections)
            accepted_questions |= set(decision.get('questions') or questions)
    changes = [d for d in matching if d.get('decision') != 'KABUL']
    independent = {code for code, q in ctx.spec['questions'].items() if q['role'] == 'independent'}
    observed = set()
    for observation in record['observations']:
        if observation.get('contentSha256') == current:
            observed |= set(observation.get('questions') or [])
    return {'teacherApproved': not changes and sections <= accepted_sections and questions <= accepted_questions,
            'acceptedQuestions': sorted(accepted_questions & questions),
            'studentTransferObserved': bool(independent) and independent <= observed,
            'pendingSections': sorted(sections - accepted_sections), 'pendingQuestions': sorted(questions - accepted_questions),
            'changeRequests': len(changes), 'staleDecisions': len(record['decisions']) - len(matching)}


def compose(ctx):
    spec, evidence, draft = ctx.spec, ctx.outputs['kanit'], ctx.outputs['taslak']
    review = review_state(ctx, content_sha(ctx))
    questions = {}
    for code, item in evidence['questions'].items():
        declared = {k: v for k, v in spec['questions'][code].items() if k not in ('questionVersion', 'solutionVersion')}
        questions[code] = {**declared, 'imageSha256': item['imageSha256'], 'sourceSha256': item['sourceSha256'],
                           'solutionSha256': draft['solutions'][code], 'imagePath': item['imagePath'], 'exam': item['exam'], 'year': item['year'],
                           'archiveId': item['archiveId'], 'sourceBook': item['sourceBook'], 'sourcePage': item['sourcePage'],
                           'bookQuestion': item['bookQuestion'], 'questionVersion': item.get('questionVersion', 1),
                           'solutionVersion': item.get('solutionVersion', 1), 'review': 'SOURCE_AND_CALCULATION_CHECKED',
                           'teacherApproved': code in review['acceptedQuestions'] and not review['changeRequests'],
                           'solutionOrigin': 'IVME_DERIVATION', 'answerOrigin': 'EXISTING_OSYM_KEY', 'answerKey': item['answerKey']}
    source = spec['primarySource']
    return {'schemaVersion': 1, 'conceptId': ctx.concept, 'contentVersion': spec['contentVersion'],
            'lessonSha256': draft['lessonSha256'],
            'primarySource': {'title': source['title'], 'url': source['url'], 'sha256': source['sha256']},
            'review': {'teacherApproved': review['teacherApproved'], 'studentTransferObserved': review['studentTransferObserved']},
            'claims': evidence['claims'],
            'sections': {key: {'claims': value['claims'], 'note': value.get('note', ''), 'exams': draft['sections'][key]}
                         for key, value in spec['sections'].items()},
            'questions': questions,
            'independentCodes': [code for code, q in spec['questions'].items() if q['role'] == 'independent'],
            'testScope': spec['testScope']}


def evidence_text(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def registry_text():
    """Kanıtı derlenmiş bütün konuların tek kayıt modülü (tarayıcı ve Node aynı dosyayı içe aktarır)."""
    entries = []
    for concept in all_concepts():
        spec = read_json(spec_path(concept)) or {}
        output = ROOT / spec.get('output', '')
        if spec.get('output') and output.is_file():
            relative = os.path.relpath(output, (ROOT / REGISTRY).parent).replace(os.sep, '/')
            name = re.sub(r'-(\w)', lambda m: m.group(1).upper(), concept)
            entries.append((concept, name, relative if relative.startswith('.') else './' + relative))
    lines = ['// Üretildi: python scripts/ivme.py icerik calistir <kavram> (TAS-09). Elle düzenleme.',
             '// Kaynaklı öğretim kanıtı olan konular; teacherApproved yalnız icerik-hatti/kararlar kaydından gelir.',
             *[f"import {name} from '{path}' with {{ type: 'json' }};" for _, name, path in entries], '',
             'export const EVIDENCE = {', *[f"  '{concept}': {name}," for concept, name, _ in entries], '};', '']
    return '\n'.join(lines)


def derle_inputs(ctx):
    return {'kanit': digest(ctx.outputs['kanit']), 'taslak': digest(ctx.outputs['taslak']),
            'decisions': digest(load_decisions(ctx.concept)), 'spec': digest(ctx.spec), 'pipeline': PIPELINE_VERSION}


def derle_intact(ctx, output):
    path = ctx.path(ctx.spec['output'])
    return path.is_file() and sha_bytes(path.read_bytes()) == output['evidenceSha256']


def derle_run(ctx):
    text = evidence_text(compose(ctx))
    path = ctx.path(ctx.spec['output'])
    current = path.read_text(encoding='utf-8') if path.is_file() else None
    if ctx.dry:
        if current != text:
            raise Stop('FAILED', f'{ctx.spec["output"]} girdilerle güncel değil',
                       f'python scripts/ivme.py icerik calistir {ctx.concept}; ardından farkı incele')
    elif current != text:
        write_text(path, text)
    registry = ctx.path(REGISTRY)
    expected = registry_text()
    if (registry.read_text(encoding='utf-8') if registry.is_file() else None) != expected:
        if ctx.dry:
            raise Stop('FAILED', f'{REGISTRY} güncel değil', f'python scripts/ivme.py icerik calistir {ctx.concept}')
        write_text(registry, expected)
    return {'evidenceSha256': sha_bytes(text.encode()), 'contentSha256': content_sha(ctx)}, {'written': current != text}


# ---------------------------------------------------------------- 5. dogrula

def test_files(ctx):
    return [*GENERIC_TESTS, *ctx.spec['tests']]


def dogrula_inputs(ctx):
    files = {}
    for relative in test_files(ctx):
        path = APP / relative
        files[relative] = sha_bytes(path.read_bytes()) if path.is_file() else None
    for folder in TEST_INPUT_DIRS:
        for path in sorted((APP / folder).rglob('*')):
            if path.is_file() and path.suffix in ('.js', '.json', '.mjs'):
                files[path.relative_to(APP).as_posix()] = ctx.hash(path)
    for name in (f'{ctx.concept}.json', '_gorsel.json'):
        path = APP / 'frontend/src/learn/bank' / name
        files[f'bank/{name}'] = ctx.hash(path) if path.is_file() else None
    return {'derle': digest(ctx.outputs['derle']), 'files': files, 'pipeline': PIPELINE_VERSION}


def dogrula_run(ctx):
    missing = [f for f in test_files(ctx) if not (APP / f).is_file()]
    if missing:
        raise Stop('FAILED', f'Test dosyası yok: {missing}', 'Görev tanımındaki tests listesini düzelt')
    if ROOT != APP:
        raise Stop('FAILED', 'Node testleri depodaki çıktıyı okur; IVME_ICERIK_KOK ile doğrulama yapılamaz', '-')
    result = subprocess.run(['node', '--test', *test_files(ctx)], cwd=APP, capture_output=True, encoding='utf-8',
                            errors='replace', env={**os.environ, 'IVME_ICERIK_KAVRAM': ctx.concept})
    text = result.stdout + result.stderr
    count = lambda key: int((re.findall(rf'^(?:#|ℹ) {key} (\d+)', text, re.M) or ['0'])[-1])
    if result.returncode or count('fail') or not count('pass'):
        failing = [l.strip() for l in text.splitlines() if l.lstrip().startswith('not ok')][:8]
        raise Stop('FAILED', f'Doğrulama başarısız ({count("fail")} test):\n  ' + '\n  '.join(failing or text.splitlines()[-15:]),
                   f'node --test {" ".join(test_files(ctx))}')
    return {'tests': test_files(ctx), 'pass': count('pass'), 'fail': 0}, {}


# ---------------------------------------------------------------- 6. inceleme ve 7. paket

def inceleme_inputs(ctx):
    return {'derle': digest(ctx.outputs['derle']), 'decisions': digest(load_decisions(ctx.concept))}


def inceleme_run(ctx):
    review = review_state(ctx, ctx.outputs['derle']['contentSha256'])
    return {key: review[key] for key in ('teacherApproved', 'studentTransferObserved', 'pendingSections',
                                         'pendingQuestions', 'changeRequests', 'staleDecisions')}, {}


def git_previous(relative):
    result = subprocess.run(['git', 'show', f'HEAD:{relative}'], cwd=APP, capture_output=True)
    rev = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=APP, capture_output=True, text=True).stdout.strip()
    return (rev, result.stdout) if result.returncode == 0 else (rev, None)


def paket_inputs(ctx):
    return {stage: digest(ctx.outputs[stage]) for stage in ('derle', 'dogrula', 'inceleme')}


def paket_intact(ctx, output):
    manifest = read_json(RELEASES / f'{ctx.concept}.json')
    return bool(manifest) and manifest.get('output', {}).get('sha256') == ctx.outputs['derle']['evidenceSha256']


def paket_run(ctx):
    review, derle = ctx.outputs['inceleme'], ctx.outputs['derle']
    status = 'APPROVED' if review['teacherApproved'] else 'REVIEW_REQUIRED'
    path = RELEASES / f'{ctx.concept}.json'
    existing = read_json(path)
    stages = {name: {'inputKey': ctx.pending_keys.get(name),
                     'outputSha256': digest(ctx.outputs[name])} for name in STAGES[:-1]}
    if (existing and existing.get('output', {}).get('sha256') == derle['evidenceSha256'] and existing.get('status') == status
            and existing.get('validation') == ctx.outputs['dogrula'] and existing.get('review') == review):
        return {'manifestSha256': digest(existing), 'status': status}, {'written': False}
    if ctx.dry:
        raise Stop('FAILED', f'{path.relative_to(ROOT).as_posix()} çıktıyla güncel değil', f'python scripts/ivme.py icerik calistir {ctx.concept}')
    rev, previous = git_previous(ctx.spec['output'])
    old = json.loads(previous) if previous else None
    current = compose(ctx)
    changes = {}
    if old:
        for key in ('sections', 'questions', 'claims'):
            before, after = set(old.get(key, {})), set(current[key])
            changes[key] = {'added': sorted(after - before), 'removed': sorted(before - after),
                            'changed': sorted(k for k in after & before if old[key][k] != current[key][k])}
        changes['lessonChanged'] = old.get('lessonSha256') != current['lessonSha256']
    manifest = {'schema': RELEASE_SCHEMA, 'taskId': f'content:{ctx.concept}:{ctx.spec["contentVersion"]}',
                'conceptId': ctx.concept, 'status': status,
                'preparedAt': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                'templateVersion': ctx.spec['templateVersion'], 'specSha256': digest(ctx.spec),
                'lesson': {'path': ctx.spec['lesson'], 'sha256': current['lessonSha256']},
                'output': {'path': ctx.spec['output'], 'sha256': derle['evidenceSha256']},
                'contentSha256': derle['contentSha256'],
                'validation': ctx.outputs['dogrula'], 'review': review, 'stages': stages,
                'previous': {'gitRevision': rev, 'sha256': sha_bytes(previous) if previous else None,
                             'restore': f'git checkout {rev} -- {ctx.spec["output"]} {ctx.spec["lesson"]}' if previous else None},
                'changes': changes,
                'externalPublish': 'Dış yayın/push ayrı kullanıcı talimatıyla; APPROVED olmadan pedagojik kabul sayılmaz.'}
    write_json(path, manifest)
    return {'manifestSha256': digest(manifest), 'status': status}, {'written': True}


STAGE_IMPL = {
    'kaynak': (kaynak_inputs, kaynak_run, kaynak_intact),
    'kanit': (kanit_inputs, kanit_run, None),
    'taslak': (taslak_inputs, taslak_run, None),
    'derle': (derle_inputs, derle_run, derle_intact),
    'dogrula': (dogrula_inputs, dogrula_run, None),
    'inceleme': (inceleme_inputs, inceleme_run, None),
    'paket': (paket_inputs, paket_run, paket_intact),
}


# ---------------------------------------------------------------- yürütücü

def run_task(concept, force=(), dry=False, only_plan=False):
    """Aşamaları sırayla değerlendirir. Dönüş: (çıkış kodu, özet, bağlam).

    dry: hiçbir dosya/kontrol noktası yazmaz; derle ve paket her zaman yeniden hesaplanıp diskteki çıktıyla
    karşılaştırılır, Node testleri atlanır (commit denetimi onları ayrıca çalıştırır).
    only_plan: yalnız hangi aşamanın güncel olduğunu söyler; ilk güncel olmayan aşamada durur.
    """
    ctx = Context(concept, dry=dry)
    ctx.pending_keys = {}
    ctx.state.setdefault('stages', {})
    force = set(force) | ({'derle'} if dry else set())
    report = []
    stages = [s for s in STAGES if not (dry and s in ('dogrula', 'paket'))]
    code, status, next_action = 0, 'DISCOVERED', None
    try:
        for name in stages:
            inputs_of, run_of, intact_of = STAGE_IMPL[name]
            key = None
            try:
                key = digest(inputs_of(ctx))
                ctx.pending_keys[name] = key
                record = ctx.stage_record(name)
                stored = ctx.stored_output(name)
                if (name not in force and stored is not None and record.get('inputKey') == key
                        and (intact_of is None or intact_of(ctx, stored))):
                    ctx.outputs[name] = stored
                    report.append((name, 'GUNCEL', ''))
                    status = REACHED.get(name, status)
                    continue
                if only_plan:
                    report.append((name, 'CALISACAK', 'yeni' if not record else ('zorla' if name in force else 'girdi veya çıktı değişti')))
                    code = code or WAITING
                    break
                started = time.monotonic()
                output, info = run_of(ctx)
            except Stop as stop:
                if not only_plan:
                    ctx.state['stages'][name] = {'state': stop.state, 'inputKey': key, 'message': stop.message,
                                                 'finishedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
                report.append((name, stop.state, stop.message))
                status, next_action = ('FAILED' if stop.state == 'FAILED' else status), stop.next_action
                code = 1 if stop.state == 'FAILED' else WAITING
                break
            ctx.outputs[name] = output
            if not dry:
                write_json(ctx.directory / f'{name}.json', output)
                test_hook(name, 'once')
                ctx.state['stages'][name] = {'state': 'OK', 'inputKey': key, 'outputSha256': digest(output), 'info': info,
                                             'durationSeconds': round(time.monotonic() - started, 2),
                                             'finishedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
                save_state(ctx)
                ctx.hash.save()
                test_hook(name, 'sonra')
            report.append((name, 'CALISTI', ''))
            status = REACHED.get(name, status)
        else:
            if 'paket' in ctx.outputs:
                status = ctx.outputs['paket']['status']
                review = ctx.outputs['inceleme']
                next_action = None if status == 'APPROVED' else (
                    f'Öğretmen incelemesi: bekleyen {len(review["pendingSections"])} bölüm, {len(review["pendingQuestions"])} soru; '
                    f'karar insan tarafından `python scripts/ivme.py icerik karar {concept} ...` ile kaydedilir')
            elif dry:
                manifest = read_json(RELEASES / f'{concept}.json') or {}
                if manifest.get('output', {}).get('sha256') != ctx.outputs['derle']['evidenceSha256']:
                    report.append(('paket', 'FAILED', f'icerik-hatti/yayin/{concept}.json yayımlanan kanıtla eşleşmiyor'))
                    status, code = 'FAILED', 1
                    next_action = f'python scripts/ivme.py icerik calistir {concept}'
                else:
                    status = 'VALIDATED_INPUTS'
    finally:
        if not dry and not only_plan:
            ctx.state.update(status=status, nextAction=next_action)
            save_state(ctx)
            ctx.hash.save()
    return code, {'concept': concept, 'status': status, 'stages': report, 'nextAction': next_action}, ctx


def print_report(summary, log=print):
    log(f'{summary["concept"]}: {summary["status"]}')
    for name, state, message in summary['stages']:
        log(f'  {name:<9} {state:<10} {message.splitlines()[0] if message else ""}')
        for line in message.splitlines()[1:]:
            log(f'  {"":<20}{line}')
    if summary['nextAction']:
        log(f'  Sıradaki: {summary["nextAction"]}')


def cmd_run(args):
    concepts = all_concepts() if args.hepsi else [args.kavram]
    worst = 0
    for concept in concepts:
        try:
            with TaskLock(concept):
                code, summary, _ = run_task(concept, force=set(args.yeniden or []))
        except Busy as error:
            print(f'{concept}: {error}')
            worst = max(worst, 1)
            continue
        print_report(summary)
        worst = max(worst, code)
    return worst


def cmd_status(args):
    concepts = [args.kavram] if args.kavram else all_concepts()
    for concept in concepts:
        state = read_json(STATE / concept / 'durum.json') or {}
        _, summary, _ = run_task(concept, only_plan=True)
        summary['status'] = state.get('status', 'DISCOVERED') + (' (girdi değişti)' if any(s[1] == 'CALISACAK' for s in summary['stages']) else '')
        summary['nextAction'] = summary['nextAction'] or state.get('nextAction')
        print_report(summary)
    return 0


def cmd_check(args):
    concepts = [args.kavram] if args.kavram else all_concepts()
    worst = 0
    for concept in concepts:
        if not args.kavram and not (ROOT / load_spec(concept)['output']).is_file():
            print(f'{concept}: henüz derlenmedi (yayımlanmış kanıt yok); denetim dışı')
            continue
        code, summary, _ = run_task(concept, dry=True)
        if code:
            print_report(summary)
            worst = 1
        else:
            print(f'{concept}: yayımlanan kanıt girdilerle güncel')
    return worst


def append_record(concept, kind, record):
    path = DECISIONS / f'{concept}.json'
    data = read_json(path) or {'schema': DECISION_SCHEMA, 'conceptId': concept, 'decisions': [], 'observations': []}
    data.setdefault(kind, []).append(record)
    write_json(path, data)
    return path


def current_content(concept):
    """Kararın bağlanacağı içerik hash'i. Kaynak, kanıt ve taslak güncel olmalı; önceki kararlar derlemeyi bekletmez."""
    _, summary, ctx = run_task(concept, only_plan=True)
    states = dict((name, state) for name, state, _ in summary['stages'])
    if any(states.get(name) != 'GUNCEL' for name in ('kaynak', 'kanit', 'taslak')):
        raise ValueError(f'{concept} içeriği son çalıştırmadan sonra değişti veya taslak tamamlanmadı; '
                         f'önce python scripts/ivme.py icerik calistir {concept} ve farkı incele')
    return content_sha(ctx)


def cmd_decide(args):
    spec = load_spec(args.kavram)
    sections = args.bolumler.split(',') if args.bolumler else list(spec['sections'])
    questions = args.sorular.split(',') if args.sorular else list(spec['questions'])
    unknown = [s for s in sections if s not in spec['sections']] + [q for q in questions if q not in spec['questions']]
    if unknown:
        raise ValueError(f'Tanımsız bölüm/soru: {unknown}')
    record = {'at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'role': args.rol, 'reviewer': args.inceleyen,
              'decision': args.karar, 'sections': sections, 'questions': questions,
              'contentSha256': current_content(args.kavram), 'note': args.not_}
    path = append_record(args.kavram, 'decisions', record)
    print(f'Karar kaydedildi: {path.relative_to(ROOT).as_posix()}. Kanıtı yenilemek için: python scripts/ivme.py icerik calistir {args.kavram}')
    return 0


def cmd_observe(args):
    spec = load_spec(args.kavram)
    questions = args.sorular.split(',')
    unknown = [q for q in questions if spec['questions'].get(q, {}).get('role') != 'independent']
    if unknown:
        raise ValueError(f'Gözlem yalnız bağımsız aktarım soruları için: {unknown}')
    record = {'at': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'observer': args.gozlemci, 'questions': questions,
              'firstAttempt': args.ilk_deneme, 'help': args.yardim, 'contentSha256': current_content(args.kavram), 'note': args.not_}
    path = append_record(args.kavram, 'observations', record)
    print(f'Gözlem kaydedildi: {path.relative_to(ROOT).as_posix()}. Kanıtı yenilemek için: python scripts/ivme.py icerik calistir {args.kavram}')
    return 0


def parser():
    main_parser = argparse.ArgumentParser(prog='ivme.py icerik', description=__doc__,
                                          formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = main_parser.add_subparsers(dest='komut', required=True)
    status = sub.add_parser('durum')
    status.add_argument('kavram', nargs='?')
    run = sub.add_parser('calistir')
    run.add_argument('kavram', nargs='?')
    run.add_argument('--hepsi', action='store_true')
    run.add_argument('--yeniden', action='append', choices=STAGES)
    check = sub.add_parser('kontrol')
    check.add_argument('kavram', nargs='?')
    decide = sub.add_parser('karar')
    decide.add_argument('kavram')
    decide.add_argument('--rol', required=True, choices=('ogretmen', 'alan-uzmani'))
    decide.add_argument('--inceleyen', required=True, help='kimlik gerektirmeyen ad/rol açıklaması')
    decide.add_argument('--karar', required=True, choices=('KABUL', 'DUZELTME'))
    decide.add_argument('--bolumler')
    decide.add_argument('--sorular')
    decide.add_argument('--not', dest='not_', required=True)
    observe = sub.add_parser('gozlem')
    observe.add_argument('kavram')
    observe.add_argument('--gozlemci', required=True)
    observe.add_argument('--sorular', required=True)
    observe.add_argument('--ilk-deneme', required=True, choices=('DOGRU', 'YANLIS', 'BOS'))
    observe.add_argument('--yardim', required=True, choices=('YOK', 'IPUCU', 'COZUM'))
    observe.add_argument('--not', dest='not_', required=True)
    return main_parser


def main(argv=None):
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding='utf-8')
    args = parser().parse_args(argv)
    if args.komut == 'calistir' and not (args.kavram or args.hepsi):
        print('Kavram ver veya --hepsi kullan; görevler: ' + ', '.join(all_concepts()))
        return 2
    try:
        return {'durum': cmd_status, 'calistir': cmd_run, 'kontrol': cmd_check, 'karar': cmd_decide,
                'gozlem': cmd_observe}[args.komut](args)
    except ValueError as error:
        print(f'✗ {error}')
        return 2


if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.exit(main())
