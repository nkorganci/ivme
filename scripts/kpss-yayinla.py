"""Bir KPSS sınavının sınıflandırılmış çıkmış sorularını uygulamaya yayımlar.

Girdi: icerik/data/<sınav>/{konular.json, sorular.json, gorsel/} (veri-hatti/<sınav>/derle.py üretir).
Adımlar: görselleri kopyala -> soruları ve tam sınav sıralarını yaz -> damgaları oku ->
ortak kataloğa ekle (scripts/kpss-catalog.mjs) -> atomik yayın ve denetim (content-label-publish.py) ->
PDF envanteri ve eksik yıl/soru kayıtları (exam_source_documents, exam_coverage_gaps) + klasördeki ISLEME_DURUMU etiketi.
Değişmeyen soruların updated_at değeri korunur; kaynaktan çıkan soru silinmez, pasife alınır.
Öğrenci geçmişi, öğretmen kararları ve YKS soruları değişmez.

  python scripts/kpss-yayinla.py icerik/data/kpss-ortaogretim
  python scripts/kpss-yayinla.py icerik/data/kpss-ortaogretim --katalog   # yalnız kataloğa yeniden ekle (yayın yok)
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query
from yerel_ortam import default_database

sys.stdout.reconfigure(encoding='utf-8')
APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
IMAGES = APP / 'veri/resimler-pilot'
STATE = APP / 'veri/content-labels'


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def image_path(meta, q):
    return f"{meta['gorselKlasoru']}/{q['dersId'].removeprefix('kpss-')}/{q['kod']}.webp"


def copy_images(data, meta, questions):
    copied = 0
    for q in questions:
        source, target = data / q['gorsel'], IMAGES / image_path(meta, q)
        if not source.is_file():
            raise FileNotFoundError(f"{q['kod']}: görsel yok {source}")
        if target.is_file() and target.read_bytes() == source.read_bytes():
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, target)
        copied += 1
    return copied


def rows(meta, questions):
    tests = {d['test']: d['test_ad'] for d in meta['dersler']}
    return [dict(code=q['kod'], exam_type=q['examType'], subject=q['ders'], topic=q['konu'], exam_year=q['yil'],
                 source=f"{meta['kaynakAdi']} {q['yil']} {tests[q['examType']]}", image=image_path(meta, q),
                 correct_answer=q['cevap'], choice_count=q['secenekSayisi'], active=q['durum'] == 'AKTIF')
            for q in questions]


def positions(meta, questions):
    years = meta['arsivYillari']
    return [dict(code=q['kod'], exam_year=q['yil'], exam_type=q['examType'], subject=q['ders'], booklet_position=q['no'])
            for q in questions if q['yil'] in years.get(q['examType'], [])]


def write_questions(connection, meta, question_rows, position_rows):
    prefix = meta['kodOnek'] + '%'
    sql = f"""
BEGIN;
CREATE TEMP TABLE kpss_in ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset({literal(json.dumps(question_rows, ensure_ascii=False))}::jsonb)
  AS x(code text, exam_type text, subject text, topic text, exam_year int, source text, image text,
       correct_answer text, choice_count int, active boolean);
CREATE TEMP TABLE kpss_pos ON COMMIT DROP AS SELECT * FROM jsonb_to_recordset({literal(json.dumps(position_rows, ensure_ascii=False))}::jsonb)
  AS x(code text, exam_year int, exam_type text, subject text, booklet_position int);
CREATE TEMP TABLE kpss_result ON COMMIT DROP AS SELECT 0 AS inserted, 0 AS updated, 0 AS retired;
WITH upsert AS (
  INSERT INTO questions(code, bank, exam_type, subject, topic, exam_year, source, image, correct_answer, choice_count, active, created_at, updated_at)
  SELECT code, 'CIKMIS', exam_type, subject, topic, exam_year, source, image, correct_answer, choice_count, active, now(), now() FROM kpss_in
  ON CONFLICT (code) DO UPDATE SET bank = 'CIKMIS', exam_type = EXCLUDED.exam_type, subject = EXCLUDED.subject,
    topic = EXCLUDED.topic, exam_year = EXCLUDED.exam_year, source = EXCLUDED.source, image = EXCLUDED.image,
    correct_answer = EXCLUDED.correct_answer, choice_count = EXCLUDED.choice_count, active = EXCLUDED.active, updated_at = now()
  WHERE (questions.bank, questions.exam_type, questions.subject, questions.topic, questions.exam_year, questions.source,
         questions.image, questions.correct_answer, questions.choice_count, questions.active)
    IS DISTINCT FROM ('CIKMIS', EXCLUDED.exam_type, EXCLUDED.subject, EXCLUDED.topic, EXCLUDED.exam_year, EXCLUDED.source,
         EXCLUDED.image, EXCLUDED.correct_answer, EXCLUDED.choice_count, EXCLUDED.active)
  RETURNING (xmax = 0) AS inserted
), retire AS (
  UPDATE questions SET active = false, updated_at = now()
  WHERE code LIKE {literal(prefix)} AND active AND code NOT IN (SELECT code FROM kpss_in) RETURNING code
)
UPDATE kpss_result SET inserted = (SELECT count(*) FROM upsert WHERE inserted),
  updated = (SELECT count(*) FROM upsert WHERE NOT inserted), retired = (SELECT count(*) FROM retire);
DELETE FROM exam_archive_positions WHERE question_code LIKE {literal(prefix)}
  AND question_code NOT IN (SELECT code FROM kpss_pos);
INSERT INTO exam_archive_positions(question_code, exam_year, exam_type, subject, booklet_position)
SELECT code, exam_year, exam_type, subject, booklet_position FROM kpss_pos
ON CONFLICT (question_code) DO UPDATE SET exam_year = EXCLUDED.exam_year, exam_type = EXCLUDED.exam_type,
  subject = EXCLUDED.subject, booklet_position = EXCLUDED.booklet_position;
SELECT row_to_json(r) FROM kpss_result r;
COMMIT;
"""
    lines = [line for line in query(connection, sql).splitlines() if line.startswith('{')]
    return json.loads(lines[-1])


def stamps(connection, meta):
    return json.loads(query(connection, f"""SELECT coalesce(json_object_agg(code, extract(epoch from updated_at)::text), '{{}}')
        FROM questions WHERE code LIKE {literal(meta['kodOnek'] + '%')}"""))


def verify(connection, meta, question_rows, position_rows):
    prefix = literal(meta['kodOnek'] + '%')
    exams = sorted({r['exam_type'] for r in question_rows})
    sources = json.dumps([f'CIKMIS_{e}' for e in exams])
    actual = json.loads(query(connection, f"""SELECT json_build_object(
      'questions', (SELECT count(*) FROM questions WHERE code LIKE {prefix}),
      'activeQuestions', (SELECT count(*) FROM questions WHERE code LIKE {prefix} AND active),
      'catalogItems', (SELECT count(*) FROM learning_catalog.current_items WHERE item_key LIKE 'question:' || {prefix}),
      'catalogCategories', (SELECT count(*) FROM learning_catalog.current_categories WHERE category_id LIKE {literal(meta['kategoriOnek'] + '%')}),
      'stampMismatch', (SELECT count(*) FROM questions q JOIN learning_catalog.current_items i ON i.item_key = 'question:' || q.code
                        WHERE q.code LIKE {prefix} AND i.source_stamp IS DISTINCT FROM extract(epoch from q.updated_at)::text),
      'archivePositions', (SELECT count(*) FROM exam_archive_positions WHERE question_code LIKE {prefix}),
      'selectable', (SELECT count(*) FROM learning_catalog.question_ids_for_labels(
          json_build_object('bank','','exam','','sources',{literal(sources)}::jsonb,'subjectId','','categoryIds','[]'::jsonb,
            'match','ANY','includeCandidates',true,'overrides','[]'::jsonb)::text)))"""))
    expected = dict(questions=len(question_rows), activeQuestions=sum(r['active'] for r in question_rows),
                    catalogItems=len(question_rows), catalogCategories=len(meta['konular']), stampMismatch=0,
                    archivePositions=len(position_rows), selectable=sum(r['active'] for r in question_rows))
    if actual != expected:
        raise RuntimeError(f'Yayın denetimi tutmadı: beklenen {expected}, bulunan {actual}')
    return actual


def pdf_roles(data, meta, questions):
    """Sınav klasöründeki her PDF'in rolü: soru kitapçığı, cevap anahtarı, yardımcı belge, başka sınavın oturumu ya da kayıtsız."""
    folder = ROOT / meta['klasor']
    catalog = json.loads((folder / 'kaynak_katalogu.json').read_text(encoding='utf-8'))
    keys = {r['cevap_anahtari_dosyasi']: r['dosya'] for r in catalog if r.get('cevap_anahtari_dosyasi')} if isinstance(catalog, list) else {}
    keys.update(meta.get('anahtarPdfler', {}))
    by_source, waiting = {}, {}
    for q in questions:
        by_source.setdefault(q['kaynak'].removeprefix(meta['klasor'] + '/'), []).append(q)
    if (data / 'bekleyen.json').is_file():
        for w in json.loads((data / 'bekleyen.json').read_text(encoding='utf-8'))['sorular']:
            waiting.setdefault(w['kaynak'].removeprefix(meta['klasor'] + '/'), []).append(w)
    rows = []
    for pdf in sorted(p.relative_to(folder).as_posix() for p in folder.rglob('*.pdf')):
        found = by_source.get(pdf, [])
        years = {q['yil'] for q in found + waiting.get(pdf, [])}
        outside = next((note for pattern, note in meta.get('kapsamDisiPdfler', []) if re.search(pattern, '/' + pdf.lower())), None)
        if found or pdf in waiting:
            role, status = 'SORU_KITAPCIGI', 'ISLENDI'
            note = f"{len(found)} soru çıkarıldı, ders/ünite/konuya bağlandı ve yayımlandı."
            if pdf in waiting:
                note = (f"{len(found) + len(waiting[pdf])} soru çıkarıldı ve ders/ünite/konuya bağlandı; "
                        f"{len(waiting[pdf])} soru cevap anahtarı bulunana kadar yayımlanmaz.")
        elif pdf in keys:
            role, status, note = 'CEVAP_ANAHTARI', 'ISLENDI', f"{keys[pdf]} sorularının cevapları okundu."
            years = {q['yil'] for q in by_source.get(keys[pdf], [])}
        elif pdf in meta.get('yardimciPdfler', {}):
            role, status, note = 'YARDIMCI', 'ISLENDI', meta['yardimciPdfler'][pdf]
        elif outside:
            role, status, note = 'KAPSAM_DISI', 'KAPSAM_DISI', outside
        else:
            role, status, note = 'BILINMIYOR', 'ISLENMEDI', 'Bu PDF için işleme kaydı yok.'
        rows.append(dict(dosya=pdf, sha256=hashlib.sha256((folder / pdf).read_bytes()).hexdigest(), rol=role, durum=status,
                         yillar=sorted(years), soru=len(found), aktif=sum(q['durum'] == 'AKTIF' for q in found), not_=note))
    return rows


def coverage_gaps(data, meta, questions):
    """Beklenen her yıl ve testte yayımlanmayan sorular: kitapçığı olmayan yıl, %10 yılı, okunamayan, cevap bekleyen, iptal."""
    tests = {q['test']: q['examType'] for q in questions}
    per_test = {exam: sum(d['soru'] for d in meta['dersler'] if d['test'] == exam) for exam in tests.values()}
    waiting = json.loads((data / 'bekleyen.json').read_text(encoding='utf-8')) if (data / 'bekleyen.json').is_file() else {}
    pending, cancelled = {}, {}
    for w in waiting.get('sorular', []):
        pending.setdefault((w['yil'], w['test']), []).append(w['no'])
    for c in waiting.get('iptal', []):
        year, test, number = c['kod'].removeprefix(meta['kodOnek']).split('-')
        cancelled.setdefault((int(year), test), []).append(int(number))
    folder, partial, gaps = f"{meta['klasor']}/Cikmis Sorular", set(meta.get('kismiYillar', [])), []

    def gap(year, test, kind, expected, numbers, note):
        numbers = sorted(numbers)
        missing = kind in ('EKSIK_YIL', 'KISMI_YIL', 'EKSIK_SORU')
        gaps.append(dict(track_id=meta['track'], exam_year=year, exam_type=tests[test], gap_type=kind, expected_count=expected,
                         available_count=expected - len(numbers) if missing else expected, question_numbers=numbers,
                         note=note, target_folder=f'{folder}/{year}'))

    for year in meta.get('beklenenYillar', meta['yillar']):
        for test, exam in tests.items():
            expected = per_test[exam]
            if year not in meta['yillar']:
                gap(year, test, 'EKSIK_YIL', expected, range(1, expected + 1),
                    'Bu yılın kitapçığı arşivde yok; tam ÖSYM kitapçığı (veya doğrulanmış tam kopya) ve cevap anahtarı gerekli.')
                continue
            raw = json.loads((data / 'ham' / f'{year}.json').read_text(encoding='utf-8'))
            present = {r['no'] for r in raw if r['test'] == test}
            if year in partial:
                gap(year, test, 'KISMI_YIL', expected, set(range(1, expected + 1)) - present,
                    f'Yalnız ÖSYM %10 örnek kitapçığı var ({len(present)} soru); tam kitapçık gelince eksik sorular eklenir.')
            else:
                expected = max(present | {expected})
                missing = set(range(1, expected + 1)) - present
                # Kaynak kopyada şıkları veya kökü eksik görünen soru yayımlanır ama öğrenciye kapalıdır (EKSIK_SIK/EKSIK_KOK).
                incomplete = {q['no'] for q in questions if (q['yil'], q['test']) == (year, test) and q['durum'] in ('EKSIK_SIK', 'EKSIK_KOK')}
                if missing or incomplete:
                    notes = (['Tam kitapçıkta bu numaralar okunamadı.'] if missing else []) + \
                            (['Kaynak kopyada şık veya soru kökü görüntüsü eksik; soru pasif tutuldu, tam kopya gerekli.'] if incomplete else [])
                    gap(year, test, 'EKSIK_SORU', expected, missing | incomplete, ' '.join(notes))
            if pending.get((year, test)):
                gap(year, test, 'CEVAP_BEKLIYOR', expected, pending[(year, test)],
                    'Sorular sınıflandırıldı; cevap anahtarı bulunmadığı için yayımlanmadı (bekleyen.json).')
            if cancelled.get((year, test)):
                gap(year, test, 'IPTAL', expected, cancelled[(year, test)], 'ÖSYM bu soruları iptal etti; yayımlanmaz.')
    return gaps


def write_inventory(connection, meta, pdf_rows, gaps, run_key):
    """Envanter ve eksik kayıtlarını sınav bazında tek işlemde baştan yazar."""
    documents = [dict(track_id=meta['track'], path=r['dosya'], sha256=r['sha256'],
                      role=r['rol'] if r['rol'] != 'BILINMIYOR' else 'YARDIMCI', status=r['durum'], exam_years=r['yillar'],
                      question_count=r['soru'], active_count=r['aktif'], note=r['not_'], catalog_run_key=run_key) for r in pdf_rows]
    track = literal(meta['track'])
    query(connection, f"""
BEGIN;
DELETE FROM exam_source_documents WHERE track_id = {track};
INSERT INTO exam_source_documents(track_id, path, sha256, role, status, exam_years, question_count, active_count, note, catalog_run_key)
SELECT track_id, path, sha256, role, status, exam_years, question_count, active_count, note, catalog_run_key
FROM jsonb_to_recordset({literal(json.dumps(documents, ensure_ascii=False))}::jsonb)
  AS x(track_id text, path text, sha256 text, role text, status text, exam_years int[], question_count int, active_count int,
       note text, catalog_run_key text);
DELETE FROM exam_coverage_gaps WHERE track_id = {track};
INSERT INTO exam_coverage_gaps(track_id, exam_year, exam_type, gap_type, expected_count, available_count, question_numbers, note, target_folder)
SELECT track_id, exam_year, exam_type, gap_type, expected_count, available_count, question_numbers, note, target_folder
FROM jsonb_to_recordset({literal(json.dumps(gaps, ensure_ascii=False))}::jsonb)
  AS x(track_id text, exam_year int, exam_type text, gap_type text, expected_count int, available_count int,
       question_numbers int[], note text, target_folder text);
COMMIT;
""")
    actual = json.loads(query(connection, f"""SELECT json_build_object(
      'documents', (SELECT count(*) FROM exam_source_documents WHERE track_id = {track}),
      'gaps', (SELECT count(*) FROM exam_coverage_gaps WHERE track_id = {track}))"""))
    if actual != dict(documents=len(documents), gaps=len(gaps)):
        raise RuntimeError(f'Envanter yazılamadı: {actual}')
    return actual


GAP_TITLES = {'EKSIK_YIL': 'Kitapçığı olmayan yıl', 'KISMI_YIL': 'Yalnız %10 örneği', 'EKSIK_SORU': 'Okunamayan soru',
              'CEVAP_BEKLIYOR': 'Cevap anahtarı bekliyor', 'IPTAL': 'ÖSYM iptali'}


def compact(numbers):
    """[1, 2, 3, 5] -> '1–3, 5'"""
    parts, start = [], None
    for i, n in enumerate(numbers):
        start = n if start is None else start
        if i + 1 == len(numbers) or numbers[i + 1] != n + 1:
            parts.append(str(start) if start == n else f'{start}–{n}')
            start = None
    return ', '.join(parts) or '—'


def processing_label(meta, questions, verified, run_key, pdf_rows, gaps):
    """Sınav klasörüne PDF işleme etiketi ve eksik listesi (ISLEME_DURUMU.json/.md); aynı kayıtlar veritabanında da tutulur."""
    folder = ROOT / meta['klasor']
    unprocessed = [r['dosya'] for r in pdf_rows if r['durum'] == 'ISLENMEDI']
    roles = {}
    for r in pdf_rows:
        roles[r['rol']] = roles.get(r['rol'], 0) + 1
    label = dict(sinav=meta['sinav'], track=meta['track'], etiket='TUM_PDFLER_ISLENDI' if not unprocessed else 'EKSIK_ISLEME',
                 tarih=date.today().isoformat(), katalogRun=run_key, referans=meta['referans'], referansSha256=meta['agacSha256'],
                 soru=len(questions), aktifSoru=verified['activeQuestions'], konu=verified['catalogCategories'],
                 islenmeyen=unprocessed, roller=roles, eksikler=gaps, pdfler=pdf_rows)
    (folder / 'ISLEME_DURUMU.json').write_text(json.dumps(label, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    lines = [f"# {meta['sinav'].split(' (')[0]} — PDF işleme durumu", '',
             f"**Etiket: {label['etiket']}** · {label['tarih']} · uygulama kataloğu `{run_key}`", '',
             f"{label['soru']} soru çıkarıldı; {label['aktifSoru']} soru öğrencilere açık, {label['konu']} konu yayımlandı. "
             f"Ders/ünite/konu referansı: `{meta['referans']}`. Bu dosya `uygulama/scripts/kpss-yayinla.py` tarafından üretilir; elle düzenlemeyin. "
             'Aynı kayıtlar veritabanında `exam_source_documents` ve `exam_coverage_gaps` tablolarındadır.', '',
             'PDF rolleri: ' + ', '.join(f'{k} {v}' for k, v in sorted(roles.items())) + '.', '',
             '## Eksikler', '',
             'Kaynak bulununca PDF "Hedef klasör" sütunundaki yere konur; çıkarma, sınıflandırma ve yayın yeniden çalıştırılır.', '']
    if gaps:
        lines += ['| Yıl | Test | Tür | Beklenen | Mevcut | Soru no | Hedef klasör | Not |', '|---:|---|---|---:|---:|---|---|---|']
        lines += [f"| {g['exam_year']} | {g['exam_type']} | {GAP_TITLES[g['gap_type']]} | {g['expected_count']} | {g['available_count']} | "
                  f"{compact(g['question_numbers'])} | {g['target_folder']} | {g['note']} |" for g in gaps]
    else:
        lines.append('Eksik yok.')
    lines += ['', '## PDF dosyaları', '', '| PDF | Rol | Durum | Yıl | Soru | Aktif | Not |', '|---|---|---|---|---:|---:|---|']
    lines += [f"| {r['dosya']} | {r['rol']} | {r['durum']} | {', '.join(map(str, r['yillar'])) or '—'} | {r['soru']} | {r['aktif']} | {r['not_']} |"
              for r in pdf_rows]
    (folder / 'ISLEME_DURUMU.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return dict(etiket=label['etiket'], pdf=len(pdf_rows), roller=roles, eksik=len(gaps), islenmeyen=unprocessed)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('veri', help='icerik/data/<sınav> klasörü (depo köküne göre)')
    parser.add_argument('--database', choices=['ivme', 'ivme_test'], default=default_database())
    parser.add_argument('--katalog', action='store_true', help='Soruları yazmadan yalnız kataloğa yeniden ekle')
    args = parser.parse_args()
    data = (ROOT / args.veri).resolve()
    meta = json.loads((data / 'konular.json').read_text(encoding='utf-8'))
    questions = json.loads((data / 'sorular.json').read_text(encoding='utf-8'))['sorular']
    if hashlib.sha256((ROOT / meta['referans']).read_bytes()).hexdigest() != meta['agacSha256']:
        raise ValueError('Konu ağacı değişmiş; önce derle.py çalıştırın')
    connection = db_connection(args.database)
    slug = data.name
    out = STATE / 'integration' / f'{slug}-{date.today():%Y%m%d}'
    out.mkdir(parents=True, exist_ok=True)
    question_rows, position_rows = rows(meta, questions), positions(meta, questions)
    report = dict(track=meta['track'], database=args.database, source=args.veri, questions=len(question_rows),
                  archivePositions=len(position_rows))
    if not args.katalog:
        report['copiedImages'] = copy_images(data, meta, questions)
        report['write'] = write_questions(connection, meta, question_rows, position_rows)
    published = query(connection, 'SELECT run_key FROM learning_catalog.current_run').strip()
    if not args.katalog:
        # labels.json must be the published run, or an unpublished KPSS addition built on it (e.g. a failed attempt).
        local = 'labels-v1-' + hashlib.sha256((STATE / 'labels.json').read_bytes()).hexdigest()[:24]
        audit = json.loads((STATE / 'audit.json').read_text(encoding='utf-8'))
        pending = audit.get('type') == 'TRACK_CURRICULUM_ADDITION' and audit.get('runKey') == local and audit.get('previousRunKey') == published
        if local != published and not pending:
            raise ValueError(f'labels.json ({local}) yayımlanmış katalog ({published}) değil; önce etiket hattını tamamlayın')
    stamp_file = out / 'stamps.json'
    stamp_file.write_text(json.dumps(stamps(connection, meta), ensure_ascii=False), encoding='utf-8')
    catalog = subprocess.run(['node', '--max-old-space-size=6144', 'scripts/kpss-catalog.mjs', str(data), str(stamp_file), published],
                             cwd=APP, check=True, capture_output=True, text=True, encoding='utf-8')
    report['catalog'] = json.loads(catalog.stdout.strip().splitlines()[-1])
    if not args.katalog:
        python = sys.executable
        subprocess.run([python, 'scripts/content-label-publish.py', '--database', args.database], cwd=APP, check=True)
        subprocess.run([python, 'scripts/content-label-publish.py', '--database', args.database, '--check'], cwd=APP, check=True)
        report['verified'] = verify(connection, meta, question_rows, position_rows)
        pdf_rows, gaps = pdf_roles(data, meta, questions), coverage_gaps(data, meta, questions)
        report['inventory'] = write_inventory(connection, meta, pdf_rows, gaps, report['catalog']['runKey'])
        report['label'] = processing_label(meta, questions, report['verified'], report['catalog']['runKey'], pdf_rows, gaps)
        if report['label']['islenmeyen']:
            raise RuntimeError(f"İşlenmeyen PDF var: {report['label']['islenmeyen']}")
    (out / 'rapor.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
