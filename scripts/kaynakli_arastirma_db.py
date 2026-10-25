"""Kaynak araştırmasını yerel PostgreSQL'de sürümlü ve tekrar kullanılabilir tutar.

--write yalnız source_research şemasına ekler; questions/öğrenci tablolarına yazmaz.
--status son kaydı okur. --export son kaydın öğrenci JSON'unu geri yükler.
Parola yalnız alt sürecin ortamına aktarılır, komuta veya çıktı dosyasına yazılmaz.
"""

import argparse
import base64
import csv
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse
from yerel_ortam import default_database

import pymupdf

from yayinla_kaynakli_etiketler import source_rows
from yayinla_kaynakli_notlar import OBSERVATIONS, load_observations, normalized, question_sources

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
STATE = APP / "veri/source-research"
DDL = APP / "backend/src/main/resources/db/migration/V35__kaynakli_arastirma_arsivi.sql"
PIPELINE = "source-research-v1"


def sha(value):
    return hashlib.sha256(value).hexdigest()


def json_text(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def encode_source_text(text):
    # PostgreSQL text/jsonb NUL kabul etmez. Özgün bytes ve checksum korunur;
    # okunabilir sütundaki bozuk karakter, tahmin edilen bir sembolle doldurulmaz.
    if "\0" not in text:
        return text, {}
    return text.replace("\0", "\ufffd"), {
        "originalSourceTextUtf8Base64": base64.b64encode(text.encode("utf-8")).decode("ascii"),
        "archiveTextEncoding": "NUL_REPLACED_WITH_REPLACEMENT_CHARACTER",
        "requiresVisualReview": True,
    }


def restore_source_text(row):
    encoded = row.get("evidence", {}).get("originalSourceTextUtf8Base64")
    if not encoded:
        return row["source_text"]
    original = base64.b64decode(encoded, validate=True).decode("utf-8")
    if sha(original.encode("utf-8")) != row["text_sha256"]:
        raise ValueError("Arşivde özgün soru metni checksum'u uyuşmuyor")
    return original


def db_connection(database=None):
    config = (APP / "backend/src/main/resources/application-dev.yml").read_text(encoding="utf-8")

    def setting(name):
        raw = re.search(rf"(?m)^\s{{4}}{name}:\s*(.+)$", config).group(1).strip()
        expression = re.fullmatch(r"\$\{([A-Z0-9_]+)(?::(.*))?\}", raw)
        return os.environ.get(expression[1], expression[2] or "") if expression else raw.strip("\"'")

    uri = urlparse(setting("url").removeprefix("jdbc:"))
    host = os.environ.get("PGHOST", uri.hostname or "localhost")
    if host not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Bu aktarım yalnız yerel PostgreSQL için tasarlandı.")
    name = database or default_database()
    if name not in {"ivme", "ivme_test"}:
        raise ValueError("Beklenmeyen hedef veritabanı")
    psql = shutil.which("psql") or next((str(path) for version in ("18", "17", "16", "15", "14", "13")
        for path in [Path(f"C:/Program Files/PostgreSQL/{version}/bin/psql.exe")] if path.exists()), None)
    if not psql:
        raise ValueError("psql bulunamadı")
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ.get("PGPASSWORD", setting("password"))
    env["PGCLIENTENCODING"] = "UTF8"
    env["PGCONNECT_TIMEOUT"] = "5"
    env["PGOPTIONS"] = (env.get("PGOPTIONS", "") + " -c standard_conforming_strings=on").strip()
    command = [psql, "-X", "--no-password", "--set=ON_ERROR_STOP=1", "--host", host,
               "--port", os.environ.get("PGPORT", str(uri.port or 5432)), "--username",
               os.environ.get("PGUSER", setting("username")), "--dbname", name]
    return command, env, name


def query(connection, sql):
    command, env, _ = connection
    # Windows psql -c, Türkçe argümanları sistem kod sayfasıyla aktarabilir.
    # SQL'i UTF-8 standart girdiden ilet; parolayı yine yalnız ortamda tut.
    result = subprocess.run([*command, "--tuples-only", "--no-align", "--quiet"], env=env,
                            input=sql + ";\n", capture_output=True, text=True, encoding="utf-8")
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return result.stdout.strip()


def status(connection):
    if query(connection, "SELECT to_regclass('source_research.runs') IS NOT NULL") != "t":
        return {"database": connection[2], "runs": 0}
    value = query(connection, """
        SELECT json_build_object('runKey', r.run_key, 'createdAt', r.created_at,
          'summary', r.summary, 'reviewStatus', r.review_status,
          'questions', (SELECT count(*) FROM source_research.question_evidence q WHERE q.run_key=r.run_key),
          'guides', (SELECT count(*) FROM source_research.topic_guides g WHERE g.run_key=r.run_key),
          'topics', (SELECT count(*) FROM source_research.topic_inventory t WHERE t.run_key=r.run_key))
        FROM source_research.runs r ORDER BY r.created_at DESC, r.run_key LIMIT 1
    """)
    return {"database": connection[2], **(json.loads(value) if value else {"runs": 0})}


def validate_observations(observations, questions, pages):
    question_map = {f"{row['bank']}:{row['code']}": row for row in questions}
    page_map = {(row["catalog_id"], row["page_number"]): row for row in pages}
    for item in observations.values():
        proof = item["evidence"]
        if item["key"].startswith("PDF:"):
            row = page_map.get((proof.get("catalogId"), proof.get("page")))
            if (not row or item["key"] != f"PDF:{row['catalog_id']}:{row['page_number']}"
                    or proof.get("documentSha256") != row["document_sha256"]
                    or proof.get("pageTextSha256") != row["text_sha256"]):
                raise ValueError(f"PDF gözleminin kaynağı değişmiş/eksik: {item['key']}")
            if proof["inspection"] == "assistant_image_review":
                row["visual_review_status"] = "ASSISTANT_REVIEWED"
        else:
            row = question_map.get(item["key"])
            if (not row or proof.get("sourceTextSha256") != row["text_sha256"]
                    or proof.get("imageSha256") != row["image_sha256"]
                    or (proof.get("sourceAnswer") is not None
                        and proof["sourceAnswer"] != row.get("evidence", {}).get("correct_answer"))
                    or (proof["inspection"] == "assistant_image_review" and not row["image_sha256"])):
                raise ValueError(f"Soru gözleminin kaynağı değişmiş/eksik: {item['key']}")
            row["inspection_status"] = ("ASSISTANT_IMAGE_REVIEWED" if proof["inspection"] == "assistant_image_review"
                                        else "ASSISTANT_TEXT_REVIEWED")


def prepare():
    STATE.mkdir(parents=True, exist_ok=True)
    pdf_cache = STATE / "pdf-cache"
    pdf_cache.mkdir(exist_ok=True)
    labels = {}
    paths = sorted((APP / "ornek-veri/etiketler").glob("*.csv"))
    for path in paths:
        with path.open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.DictReader(stream):
                key = (row["bank"], row["code"])
                if key in labels:
                    raise ValueError(f"Yinelenen etiket: {key}")
                labels[key] = row
    active = source_rows()
    if active.keys() != labels.keys():
        raise ValueError("Etiket ve etkin kaynak kapsamı değişmiş; önce yayın denetimlerini çalıştırın.")
    notes_path = APP / "frontend/public/kaynakli-notlar.json"
    notes = json.loads(notes_path.read_text(encoding="utf-8"))
    analysis_path = APP / "ornek-veri/kaynakli-analiz-ozet.json"
    analysis = json.loads(analysis_path.read_text(encoding="utf-8"))
    catalog = {row["id"]: row for row in json.loads((ROOT / "veri-hatti/ogm-indirme/katalog.json").read_text(encoding="utf-8"))}
    documents, pages = [], []
    extractor = f"pymupdf-{pymupdf.VersionBind}"
    cited_pages = {(ref["catalogId"], ref["page"]) for group in notes["groups"]
                   for lesson in group["lessons"] for ref in lesson["sources"]}
    print("Araştırma arşivi: PDF sayfaları ve kaynak özetleri hazırlanıyor.", flush=True)
    # Temel anlatım PDF'lerine ek olarak rehberlerin atıf yaptığı her PDF arşivlenir; aksi halde
    # atıf sayfası (metin, çizim kontrolü) arşivde bulunmaz.
    primary_ids = {item["catalogId"] for item in analysis["primaryLessonPdfs"]}
    cited_extra = [{"catalogId": cid, "title": f"{catalog[cid]['sinav']} {catalog[cid]['ders_ad']} — {catalog[cid]['baslik']}",
                    "url": catalog[cid]["url"], "pages": None, "sha256": None}
                   for cid in sorted({cid for cid, _ in cited_pages} - primary_ids)]
    for item in [*analysis["primaryLessonPdfs"], *cited_extra]:
        source = catalog[item["catalogId"]]
        path = ROOT / "Kaynaklar/ogm-materyal" / source["dosya"]
        fingerprint = sha(path.read_bytes())
        if item["sha256"] and fingerprint != item["sha256"]:
            raise ValueError(f"PDF değişti; analiz raporu yenilenmeli: {item['catalogId']}")
        if item["pages"] is None:
            with pymupdf.open(path) as pdf:
                item["pages"] = pdf.page_count
        documents.append({"catalog_id": item["catalogId"], "sha256": fingerprint,
                          "title": item["title"], "local_path": str(path.resolve()),
                          "official_url": item["url"], "page_count": item["pages"]})
        cached_pdf = pdf_cache / f"{item['catalogId']}-{fingerprint}-{extractor}.json"
        if cached_pdf.exists():
            extracted_pages = json.loads(cached_pdf.read_text(encoding="utf-8"))
            unchecked = [page for page in extracted_pages if page["has_vector_graphics"] is None
                         and (item["catalogId"], page["page_number"]) in cited_pages]
            if unchecked:
                with pymupdf.open(path) as pdf:
                    for page in unchecked:
                        page["has_vector_graphics"] = bool(pdf[page["page_number"] - 1].get_drawings())
                cached_pdf.write_text(json_text(extracted_pages) + "\n", encoding="utf-8")
            pages.extend(extracted_pages)
            continue
        extracted_pages = []
        with pymupdf.open(path) as pdf:
            for page in pdf:
                text = page.get_text()
                extracted_pages.append({"catalog_id": item["catalogId"], "document_sha256": fingerprint,
                              "page_number": page.number + 1, "extractor_version": extractor,
                              "text_content": text, "text_sha256": sha(text.encode("utf-8")),
                              "has_images": bool(page.get_images()),
                              "has_vector_graphics": bool(page.get_drawings()) if (item["catalogId"], page.number + 1) in cited_pages else None,
                              "extraction_status": "TEXT_AVAILABLE" if len(normalized(text)) >= 30 else "NEEDS_VISUAL_REVIEW"})
        cached_pdf.write_text(json_text(extracted_pages) + "\n", encoding="utf-8")
        pages.extend(extracted_pages)

    examples = {(example["bank"], example["code"]) for group in notes["groups"]
                for lesson in group["lessons"] for example in lesson["examples"]}
    observations = load_observations()
    questions = question_sources(set(labels))
    if questions.keys() != labels.keys():
        raise ValueError("Kaynak soru eşleşmesi eksik")
    print(f"Araştırma arşivi: {len(pages)} PDF sayfası hazır; soru/görsel referansları hazırlanıyor.", flush=True)
    cache_path = STATE / "image-cache.json"
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {}
    evidence = []
    image_fingerprints = []
    for key, row in sorted(labels.items()):
        source = questions[key]
        text = source.get("metin") or ""
        stored_text, text_encoding = encode_source_text(text)
        plain = normalized(text)
        path = APP / "veri/resimler-pilot" / active[key]["image"]
        image_hash = None
        if path.is_file():
            stat = path.stat()
            cache_key = str(path.resolve())
            signature = [stat.st_size, stat.st_mtime_ns]
            saved = cache.get(cache_key)
            if saved and saved["signature"] == signature:
                image_hash = saved["sha256"]
            else:
                image_hash = sha(path.read_bytes())
                cache[cache_key] = {"signature": signature, "sha256": image_hash}
        image_fingerprints.append([*key, image_hash])
        evidence.append({"bank": key[0], "code": key[1], "exam_type": row["exam_type"], "subject": row["subject"],
                         "proposed_label": row["label"], "source_text": stored_text, "text_sha256": sha(text.encode("utf-8")),
                         "image_path": str(path.resolve()) if path.is_file() else None, "image_sha256": image_hash,
                         "extraction_status": "VISUAL_ONLY" if not plain else "SHORT_TEXT" if len(plain) < 40 else "TEXT_AVAILABLE",
                         "inspection_status": "ASSISTANT_TEXT_REVIEWED" if key in examples else "SOURCE_LINKED",
                         "evidence": {**row, "correct_answer": active[key]["correct_answer"],
                                      "source_image": source.get("gorsel"), "source_page": source.get("sayfa"),
                                      "teacher_approved": False, **text_encoding}})
    validate_observations(observations, evidence, pages)
    cache_path.write_text(json_text(cache) + "\n", encoding="utf-8")
    inputs = [*paths, notes_path, analysis_path, DDL, OBSERVATIONS,
              *sorted((APP / "ornek-veri/kaynakli-notlar").glob("*.json")),
              *[APP / "scripts" / name for name in ("kaynakli_arastirma_db.py", "analiz_kaynakli_sorular.py",
                                                    "yayinla_kaynakli_notlar.py", "yayinla_kaynakli_etiketler.py",
                                                    "kaynakli_etiket_sayisal.py")],
              *[APP / "veri" / name for name in ("sorular-tum.csv", "sorular-ogm.csv")],
              APP / "docs/icerik/kaynakli-ders-notlari.md", APP / "docs/icerik/soru-analizi.md"]
    manifest = {str(path.relative_to(APP)): sha(path.read_bytes()) for path in inputs}
    manifest["pdfs"] = [[row["catalog_id"], row["sha256"]] for row in documents]
    manifest["images"] = sha(json_text(image_fingerprints).encode("utf-8"))
    manifest["question_texts"] = sha(json_text([[row["bank"], row["code"], row["text_sha256"]] for row in evidence]).encode("utf-8"))
    manifest["extractor"] = extractor
    run_key = sha(json_text(manifest).encode("utf-8"))
    handoff = "\n\n".join(path.read_text(encoding="utf-8") for path in
                           [APP / "docs/icerik/kaynakli-ders-notlari.md", APP / "docs/icerik/soru-analizi.md"])
    summary = {"questions": len(evidence), "documents": len(documents), "pdfPages": len(pages),
               "topicLabels": sum(len(group["topics"]) for group in analysis["groups"]),
               "guides": notes["lessonCount"], "patterns": notes["patternCount"],
               "visualOnlyQuestions": sum(row["extraction_status"] == "VISUAL_ONLY" for row in evidence),
               "shortTextQuestions": sum(row["extraction_status"] == "SHORT_TEXT" for row in evidence),
               "missingImages": sum(row["image_sha256"] is None for row in evidence),
               "observations": len(observations),
               "excludedExamples": sum(bool(item["evidence"].get("excludeFromGuides")) for item in observations.values()),
               "encodedQuestionTexts": sum(bool(row["evidence"].get("archiveTextEncoding")) for row in evidence),
               "teacherApproved": 0}
    return run_key, manifest, summary, notes, analysis, documents, pages, evidence, handoff


def write_archive(connection):
    run_key, manifest, summary, notes, analysis, documents, pages, evidence, handoff = prepare()
    if query(connection, "SELECT to_regclass('source_research.runs') IS NOT NULL") == "t":
        exists = query(connection, f"SELECT count(*) FROM source_research.runs WHERE run_key='{run_key}'")
        counts = query(connection, f"SELECT (SELECT count(*) FROM source_research.question_evidence WHERE run_key='{run_key}')::text || ':' || (SELECT count(*) FROM source_research.topic_guides WHERE run_key='{run_key}')::text") if exists == "1" else ""
        if exists == "1" and counts == f"{len(evidence)}:{notes['lessonCount']}":
            print(json_text({"status": "already_saved", "runKey": run_key, "summary": summary}))
            return
    before = query(connection, "SELECT count(*)::text || ':' || md5(string_agg(code || ':' || bank || ':' || coalesce(topic,'') || ':' || correct_answer || ':' || active::text, '|' ORDER BY code)) FROM questions")
    with tempfile.TemporaryDirectory(prefix="import-", dir=STATE) as work:
        folder = Path(work)
        statements = ["SELECT pg_advisory_xact_lock(730102026);", DDL.read_text(encoding="utf-8"),
                      "CREATE TEMP TABLE source_import_payload (payload jsonb) ON COMMIT DROP;"]

        def add(name, rows, sql):
            path = folder / f"{name}.csv"
            with path.open("w", encoding="utf-8", newline="") as stream:
                writer = csv.writer(stream, quoting=csv.QUOTE_ALL)
                for row in rows:
                    writer.writerow([json_text(row)])
            safe_path = path.as_posix().replace("'", "''")
            statements.extend(["TRUNCATE source_import_payload;",
                               f"\\copy source_import_payload FROM '{safe_path}' WITH (FORMAT csv)", sql])

        add("run", [{"key": run_key, "manifest": manifest, "summary": summary, "notes": notes, "handoff": handoff}], f"""
          INSERT INTO source_research.runs(run_key,pipeline_version,input_manifest,summary,published_notes,handoff_note)
          SELECT payload->>'key','{PIPELINE}',payload->'manifest',payload->'summary',payload->'notes',payload->>'handoff'
          FROM source_import_payload ON CONFLICT DO NOTHING;""")
        add("documents", documents, """
          INSERT INTO source_research.documents SELECT (payload->>'catalog_id')::int,payload->>'sha256',payload->>'title',
          payload->>'local_path',payload->>'official_url',(payload->>'page_count')::int FROM source_import_payload ON CONFLICT DO NOTHING;""")
        add("pages", pages, """
          INSERT INTO source_research.document_pages(catalog_id,document_sha256,page_number,extractor_version,text_content,text_sha256,has_images,has_vector_graphics,extraction_status,visual_review_status)
          SELECT (payload->>'catalog_id')::int,payload->>'document_sha256',(payload->>'page_number')::int,
          payload->>'extractor_version',payload->>'text_content',payload->>'text_sha256',(payload->>'has_images')::boolean,
          (payload->>'has_vector_graphics')::boolean,payload->>'extraction_status',coalesce(payload->>'visual_review_status','NOT_REVIEWED')
          FROM source_import_payload ON CONFLICT (catalog_id,document_sha256,page_number,extractor_version) DO UPDATE SET
          has_vector_graphics=coalesce(source_research.document_pages.has_vector_graphics,EXCLUDED.has_vector_graphics),
          visual_review_status=CASE WHEN EXCLUDED.visual_review_status='ASSISTANT_REVIEWED' THEN EXCLUDED.visual_review_status
            ELSE source_research.document_pages.visual_review_status END;""")
        statements.append(f"INSERT INTO source_research.run_documents SELECT '{run_key}',catalog_id,sha256 FROM source_research.documents WHERE (catalog_id,sha256) IN (SELECT catalog_id,sha256 FROM source_research.documents WHERE "
                          + " OR ".join(f"(catalog_id={row['catalog_id']} AND sha256='{row['sha256']}')" for row in documents) + ") ON CONFLICT DO NOTHING;")
        add("questions", evidence, f"""
          INSERT INTO source_research.question_evidence SELECT '{run_key}',payload->>'bank',payload->>'code',payload->>'exam_type',
          payload->>'subject',payload->>'proposed_label',payload->>'source_text',payload->>'text_sha256',payload->>'image_path',
          payload->>'image_sha256',payload->>'extraction_status',payload->>'inspection_status',payload->'evidence'
          FROM source_import_payload ON CONFLICT DO NOTHING;""")
        inventory = [{"exam": group["exam"], "subject": group["subject"], "label": topic["label"], "analysis": topic}
                     for group in analysis["groups"] for topic in group["topics"]]
        add("topics", inventory, f"""
          INSERT INTO source_research.topic_inventory SELECT '{run_key}',payload->>'exam',payload->>'subject',payload->>'label',
          payload->'analysis' FROM source_import_payload ON CONFLICT DO NOTHING;""")
        guides = [{"group": group["id"], "lesson": lesson} for group in notes["groups"] for lesson in group["lessons"]]
        add("guides", guides, f"""
          INSERT INTO source_research.topic_guides(run_key,group_id,topic_id,title,content)
          SELECT '{run_key}',payload->>'group',payload->'lesson'->>'id',payload->'lesson'->>'title',payload->'lesson'
          FROM source_import_payload ON CONFLICT DO NOTHING;""")
        observations = list(load_observations().values())
        add("observations", observations, f"""
          INSERT INTO source_research.observations SELECT '{run_key}',payload->>'key',payload->>'note',payload->'evidence'
          FROM source_import_payload ON CONFLICT DO NOTHING;""")
        statements.append(f"""DO $$ BEGIN
          IF (SELECT count(*) FROM source_research.question_evidence WHERE run_key='{run_key}') <> {len(evidence)}
             OR (SELECT count(*) FROM source_research.topic_guides WHERE run_key='{run_key}') <> {len(guides)}
             OR (SELECT count(*) FROM source_research.topic_inventory WHERE run_key='{run_key}') <> {len(inventory)}
             OR (SELECT count(*) FROM source_research.run_documents WHERE run_key='{run_key}') <> {len(documents)}
          THEN RAISE EXCEPTION 'Eksik araştırma aktarımı'; END IF;
          END $$;""")
        script = folder / "import.sql"
        script.write_text("\n".join(statements) + "\n", encoding="utf-8")
        command, env, _ = connection
        result = subprocess.run([*command, "--single-transaction", "--quiet", "--file", str(script)], env=env,
                                capture_output=True, text=True, encoding="utf-8")
        if result.returncode:
            raise RuntimeError(result.stderr.strip())
    after = query(connection, "SELECT count(*)::text || ':' || md5(string_agg(code || ':' || bank || ':' || coalesce(topic,'') || ':' || correct_answer || ':' || active::text, '|' ORDER BY code)) FROM questions")
    if before != after:
        raise RuntimeError("Aktarım sırasında soru bankası değişti; dış değişikliği ayrıca inceleyin.")
    STATE.joinpath("last-run.json").write_text(json_text({"database": connection[2], "runKey": run_key, "summary": summary, "questionBankUnchanged": True}) + "\n", encoding="utf-8")
    print(json_text({"status": "saved", "runKey": run_key, "summary": summary, "questionBankUnchanged": True}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--status", action="store_true")
    mode.add_argument("--export", action="store_true")
    mode.add_argument("--find", metavar="KONU", help="Son araştırmada konu, rehber ve PDF sayfası ara")
    parser.add_argument("--database", choices=("ivme", "ivme_test"))
    args = parser.parse_args()
    connection = db_connection(args.database)
    if args.write:
        write_archive(connection)
    elif args.status:
        print(json_text(status(connection)))
    elif args.find:
        term = args.find.replace("'", "''")
        current = status(connection)
        if not current.get("runKey"):
            raise ValueError("Önce araştırmayı kaydedin")
        run_key = current["runKey"]
        guides = query(connection, f"SELECT coalesce(json_agg(x), '[]') FROM (SELECT group_id,topic_id,title FROM source_research.topic_guides WHERE run_key='{run_key}' AND (title ILIKE '%{term}%' OR content::text ILIKE '%{term}%') ORDER BY group_id,topic_id LIMIT 20) x")
        topics = query(connection, f"SELECT coalesce(json_agg(x), '[]') FROM (SELECT exam_type,subject,proposed_label,count(*) AS questions FROM source_research.question_evidence WHERE run_key='{run_key}' AND proposed_label ILIKE '%{term}%' GROUP BY exam_type,subject,proposed_label ORDER BY count(*) DESC LIMIT 20) x")
        pages = query(connection, f"SELECT coalesce(json_agg(x), '[]') FROM (SELECT p.catalog_id,p.page_number,d.title,p.visual_review_status FROM source_research.document_pages p JOIN source_research.run_documents rd ON rd.catalog_id=p.catalog_id AND rd.document_sha256=p.document_sha256 JOIN source_research.documents d ON d.catalog_id=p.catalog_id AND d.sha256=p.document_sha256 WHERE rd.run_key='{run_key}' AND p.text_content ILIKE '%{term}%' ORDER BY p.catalog_id,p.page_number LIMIT 20) x")
        print(json_text({"runKey": run_key, "guides": json.loads(guides), "topicEvidence": json.loads(topics), "pdfPages": json.loads(pages)}))
    else:
        content = query(connection, "SELECT published_notes FROM source_research.runs ORDER BY created_at DESC, run_key LIMIT 1")
        if not content:
            raise ValueError("Dışa aktarılacak araştırma bulunamadı")
        payload = json.loads(content)
        (APP / "frontend/public/kaynakli-notlar.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(f"{payload['lessonCount']} konu rehberi veritabanından geri yüklendi.")


if __name__ == "__main__":
    main()
