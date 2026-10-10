"""Exercise the guarded import against ivme_test using temporary human-approved fixtures."""

import csv
import importlib.util
import json
import os
import subprocess
import tempfile
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ipucu_guvenli_aktar", APP / "scripts/ipucu-guvenli-aktar.py")
IMPORT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORT)
PSQL = r"C:\Program Files\PostgreSQL\18\bin\psql.exe"


def query(sql, env):
    result = subprocess.run([PSQL, "-X", "-w", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
                            env=env, capture_output=True, text=True, encoding="utf-8", check=False)
    if result.returncode:
        raise ValueError(result.stderr.strip())
    return result.stdout.strip()


def main():
    env = dict(os.environ, PGDATABASE="ivme_test", PGUSER="root", PGPASSWORD="root")
    assert query("SELECT current_database()", env) == "ivme_test"
    with tempfile.TemporaryDirectory() as folder:
        hint_path, queue_path, notes_path = [Path(folder) / name for name in ("hint.json", "queue.csv", "notes.json")]
        hint = json.loads((APP / "docs/plan/sema/kaynakli-ipucu-v1.ornek.json").read_text(encoding="utf-8"))
        with (APP / "ornek-veri/altin-ornek-inceleme-200.csv").open(encoding="utf-8", newline="") as stream:
            reader = csv.DictReader(stream)
            fields, rows = reader.fieldnames, list(reader)
        note = json.loads((APP / "veri/pilot-13-02.json").read_text(encoding="utf-8"))["samples"][0]["note"]
        row = next(item for item in rows if item["question_code"] == hint["question"]["code"])
        row.update(review_status="approved", reviewer_id="ogretmen-sentetik",
                   review_evidence="Noktalama becerisi soruluyor.",
                   reviewed_question_type_code=hint["question"]["question_type_code"])
        note["review"]["status"] = "approved"
        note["topic"]["status"] = "verified"
        hint["review"].update(status="approved", reviewer_id="editor-sentetik",
                              reviewed_at_utc="2026-10-09T12:00:00Z", answer_leak_checked=True)
        hint["content"].update(pre_answer_hint="Noktalama işaretinin görevini düşün.",
                               post_submission_explanation="Kuralı notun ilk sayfasında karşılaştır.")

        def write():
            hint_path.write_text(json.dumps(hint, ensure_ascii=False), encoding="utf-8")
            notes_path.write_text(json.dumps([note], ensure_ascii=False), encoding="utf-8")
            with queue_path.open("w", encoding="utf-8", newline="") as stream:
                writer = csv.DictWriter(stream, fieldnames=fields)
                writer.writeheader()
                writer.writerows(rows)

        write()
        assert query("SELECT count(*) FROM questions WHERE code = 'TYT-0318'", env) == "0", "Test soru kodu dolu"
        query("""
            INSERT INTO questions(code, exam_type, subject, image, correct_answer)
            VALUES ('TYT-0318', 'TYT', 'Turkce', 'TYT/turkce/TYT-0318.webp', 'A');
            INSERT INTO taxonomy_nodes(kind, code, name)
            VALUES ('QUESTION_TYPE', 'tyt.turkce.tip.noktalama', 'Noktalama') ON CONFLICT DO NOTHING;
            INSERT INTO question_taxonomy(question_id, node_id, source, approval_status, taxonomy_version)
            SELECT q.id, n.id, 'HUMAN', 'PROPOSED', 'tyt-turkce-v1'
            FROM questions q, taxonomy_nodes n
            WHERE q.code = 'TYT-0318' AND n.code = 'tyt.turkce.tip.noktalama';
            """, env)
        try:
            try:
                IMPORT.import_hint(hint_path, queue_path, notes_path, apply=True, psql=PSQL, env=env)
            except ValueError as error:
                assert "insan onayl" in str(error)
            else:
                raise AssertionError("DB soru tipi onaysızken ipucu kabul edildi")
            query("UPDATE question_taxonomy SET approval_status = 'APPROVED' "
                  "WHERE question_id = (SELECT id FROM questions WHERE code = 'TYT-0318')", env)
            for _ in range(2):
                result = IMPORT.import_hint(hint_path, queue_path, notes_path,
                                            apply=True, psql=PSQL, env=env)
                assert result["status"] == "imported"
            assert query("SELECT count(*) FROM question_hints WHERE review_status = 'APPROVED'"
                         " AND question_id = (SELECT id FROM questions WHERE code = 'TYT-0318')", env) == "1"
            hint["content"]["pre_answer_hint"] = "Başka metin"
            write()
            try:
                IMPORT.import_hint(hint_path, queue_path, notes_path, apply=True, psql=PSQL, env=env)
            except ValueError as error:
                assert "farklı ipucu" in str(error)
            else:
                raise AssertionError("Aynı sürümde farklı metin kabul edildi")
            row["review_status"] = "pending"
            write()
            try:
                IMPORT.import_hint(hint_path, queue_path, notes_path, apply=True, psql=PSQL, env=env)
            except ValueError as error:
                assert "insan onaylı değil" in str(error)
            else:
                raise AssertionError("İnsan onaysız kaynak kabul edildi")
        finally:
            query("DELETE FROM questions WHERE code = 'TYT-0318'", env)
    print("PASS: synthetic import, replay, version conflict and human approval rejection")


if __name__ == "__main__":
    main()
