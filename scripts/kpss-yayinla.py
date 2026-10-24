"""Bir KPSS sınavının sınıflandırılmış çıkmış sorularını uygulamaya yayımlar.

Girdi: icerik/data/<sınav>/{konular.json, sorular.json, gorsel/} (veri-hatti/<sınav>/derle.py üretir).
Adımlar: görselleri kopyala -> soruları ve tam sınav sıralarını yaz -> damgaları oku ->
ortak kataloğa ekle (scripts/kpss-catalog.mjs) -> atomik yayın ve denetim (content-label-publish.py).
Değişmeyen soruların updated_at değeri korunur; kaynaktan çıkan soru silinmez, pasife alınır.
Öğrenci geçmişi, öğretmen kararları ve YKS soruları değişmez.

  python scripts/kpss-yayinla.py icerik/data/kpss-ortaogretim
  python scripts/kpss-yayinla.py icerik/data/kpss-ortaogretim --katalog   # yalnız kataloğa yeniden ekle (yayın yok)
"""
import argparse
import hashlib
import json
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


def processing_label(meta, questions, verified, run_key):
    """Sınav klasörüne PDF işleme etiketi: her PDF'in rolü ve yayımlanan soru sayısı (ISLEME_DURUMU.json/.md)."""
    folder = ROOT / meta['klasor']
    catalog = json.loads((folder / 'kaynak_katalogu.json').read_text(encoding='utf-8'))
    keys = {r['cevap_anahtari_dosyasi']: r['dosya'] for r in catalog if r.get('cevap_anahtari_dosyasi')}
    by_source = {}
    for q in questions:
        by_source.setdefault(q['kaynak'].removeprefix(meta['klasor'] + '/'), []).append(q)
    rows = []
    for pdf in sorted(p.relative_to(folder).as_posix() for p in folder.rglob('*.pdf')):
        found = by_source.get(pdf, [])
        if found:
            role, status = 'SORU_KITAPCIGI', 'ISLENDI'
            note = f"{len(found)} soru çıkarıldı, ders/ünite/konuya bağlandı ve yayımlandı."
        elif pdf in keys:
            role, status, note = 'CEVAP_ANAHTARI', 'ISLENDI', f"{keys[pdf]} sorularının cevapları okundu."
        elif pdf in meta.get('yardimciPdfler', {}):
            role, status, note = 'YARDIMCI', 'ISLENDI', meta['yardimciPdfler'][pdf]
        else:
            role, status, note = 'BILINMIYOR', 'ISLENMEDI', 'Bu PDF için işleme kaydı yok.'
        rows.append(dict(dosya=pdf, sha256=hashlib.sha256((folder / pdf).read_bytes()).hexdigest(), rol=role, durum=status,
                         yillar=sorted({q['yil'] for q in found}), soru=len(found),
                         aktif=sum(q['durum'] == 'AKTIF' for q in found), not_=note))
    unprocessed = [r['dosya'] for r in rows if r['durum'] != 'ISLENDI']
    label = dict(sinav=meta['sinav'], track=meta['track'], etiket='TUM_PDFLER_ISLENDI' if not unprocessed else 'EKSIK_ISLEME',
                 tarih=date.today().isoformat(), katalogRun=run_key, referans=meta['referans'], referansSha256=meta['agacSha256'],
                 soru=len(questions), aktifSoru=verified['activeQuestions'], konu=verified['catalogCategories'],
                 islenmeyen=unprocessed, pdfler=rows)
    (folder / 'ISLEME_DURUMU.json').write_text(json.dumps(label, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    lines = [f"# {meta['sinav'].split(' (')[0]} — PDF işleme durumu", '',
             f"**Etiket: {label['etiket']}** · {label['tarih']} · uygulama kataloğu `{run_key}`", '',
             f"{label['soru']} soru çıkarıldı; {label['aktifSoru']} soru öğrencilere açık, {label['konu']} konu yayımlandı. "
             f"Ders/ünite/konu referansı: `{meta['referans']}`. Bu dosya `uygulama/scripts/kpss-yayinla.py` tarafından üretilir; elle düzenlemeyin.", '',
             '| PDF | Rol | Durum | Yıl | Soru | Aktif | Not |', '|---|---|---|---|---:|---:|---|']
    lines += [f"| {r['dosya']} | {r['rol']} | {r['durum']} | {', '.join(map(str, r['yillar'])) or '—'} | {r['soru']} | {r['aktif']} | {r['not_']} |"
              for r in rows]
    (folder / 'ISLEME_DURUMU.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    return dict(etiket=label['etiket'], pdf=len(rows), islenmeyen=unprocessed)


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
        report['label'] = processing_label(meta, questions, report['verified'], report['catalog']['runKey'])
        if report['label']['islenmeyen']:
            raise RuntimeError(f"İşlenmeyen PDF var: {report['label']['islenmeyen']}")
    (out / 'rapor.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
