"""Validate and atomically publish a complete label run to the shared PostgreSQL catalog.

Original questions, answers, student history, and teacher decisions are never updated.
"""
import argparse
from yerel_ortam import default_database
import csv
import hashlib
import json
import subprocess
from pathlib import Path
from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
STATE = APP / "veri/content-labels"


def literal(value):
    return "'" + str(value).replace("'", "''") + "'"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--database", choices=["ivme", "ivme_test"], default=default_database())
    p.add_argument("--check", action="store_true")
    args = p.parse_args()
    subprocess.run(['node', 'scripts/learning-resource-check.mjs'], cwd=APP, check=True)
    connection = db_connection(args.database)
    content = (STATE / "labels.json").read_bytes()
    payload = json.loads(content)
    report = json.loads((STATE / "report.json").read_text(encoding="utf-8"))
    run = "labels-v1-" + hashlib.sha256(content).hexdigest()[:24]
    if run != report["runKey"]:
        raise ValueError("Label report checksum mismatch")
    audit = json.loads((STATE / "audit.json").read_text(encoding="utf-8"))
    references = json.loads((STATE / "curriculum-reference-labels.json").read_text(encoding="utf-8"))
    if audit.get("runKey") != run or audit.get("failures") or audit.get("unlabelled") != 0:
        raise ValueError("Run the complete source audit before publishing")
    # Curriculum-only runs and KPSS track additions start from the published snapshot and keep every source.
    snapshot_run = audit.get('type') in ('CURRICULUM_RECLASSIFICATION', 'TRACK_CURRICULUM_ADDITION')
    if snapshot_run and not audit.get('sourcePreserved'):
        raise ValueError('Curriculum-only publication requires an unchanged source snapshot')
    for reference in references:
        path = APP.parent / reference["source"]
        if reference.get('hashScope') == 'FIRST_SHEET_ROWS':
            import importlib.util
            spec = importlib.util.spec_from_file_location('excel_curriculum_import', APP / 'scripts/excel-curriculum-import.py')
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            actual_hash = module.first_sheet(path)['sha256']
        else:
            actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual_hash != reference["sha256"]:
            raise ValueError("Curriculum reference changed; repeat the source audit")
    categories = {c["id"] for c in payload["categories"]}
    keys = set()
    for item in payload["items"]:
        if item["key"] in keys:
            raise ValueError("Duplicate resource")
        keys.add(item["key"])
        assignments = item["automaticLabels"]["assignments"]
        if not assignments or not any(a["relation"] == "PRIMARY" for a in assignments):
            raise ValueError("Resource without a primary subject/topic")
        if any(a["categoryId"] not in categories for a in assignments):
            raise ValueError("Unresolved category identity")
    if args.check:
        actual = json.loads(query(connection, """SELECT json_build_object(
          'runKey',(SELECT run_key FROM learning_catalog.current_run),
          'items',(SELECT count(*) FROM learning_catalog.current_items),
          'categories',(SELECT count(*) FROM learning_catalog.current_categories),
          'unlabelled',(SELECT count(*) FROM learning_catalog.current_items i WHERE NOT EXISTS
             (SELECT 1 FROM learning_catalog.current_assignments a WHERE a.item_key=i.item_key)),
          'missingQuestions',(SELECT count(*) FROM questions q WHERE NOT EXISTS
             (SELECT 1 FROM learning_catalog.current_items i WHERE i.item_key='question:'||q.code)))"""))
        if actual != {"runKey": run, "items": len(keys), "categories": len(categories), "unlabelled": 0, "missingQuestions": 0}:
            raise ValueError(f"Published catalog differs: {actual}")
        saved_audit = query(connection, f"SELECT count(*) FROM learning_catalog.source_audits WHERE run_key={literal(run)}")
        if saved_audit.strip() != "1":
            raise ValueError("Source audit is not published for this run")
        print(json.dumps(actual, ensure_ascii=False))
        return
    sql_path = STATE / "publish.sql"
    # Existing installations already have these columns. Avoid replaying the costly
    # historical backfill (and taking table-wide DDL locks) on every label publish.
    schema_ready = query(connection, """SELECT to_regclass('learning_catalog.current_items') IS NOT NULL
        AND (SELECT count(*) FROM pg_attribute WHERE attrelid=to_regclass('learning_catalog.items')
          AND NOT attisdropped AND attname IN ('question_code','source_stamp','availability','search_text',
          'content_format','skills','grades','category_ids','subject_ids','exam_ids'))=10""").strip() == "t"
    with sql_path.open("w", encoding="utf-8", newline="") as out:
        out.write("BEGIN;\nSELECT pg_advisory_xact_lock(738452019);\n")
        if snapshot_run:
            out.write("DO $snapshot$ BEGIN IF (SELECT run_key FROM learning_catalog.current_run) IS DISTINCT FROM "
                +literal(audit['previousRunKey'])+" THEN RAISE EXCEPTION 'Current catalog changed; repeat the curriculum snapshot audit'; END IF; END $snapshot$;\n")
        if not schema_ready:
            out.write((APP / "backend/src/main/resources/db/migration/V38__shared_learning_resource_labels.sql").read_text(encoding="utf-8"))
            out.write((APP / "backend/src/main/resources/db/migration/V39__learning_label_filter_indexes.sql").read_text(encoding="utf-8"))
        out.write((APP / "backend/src/main/resources/db/migration/V40__learning_source_audits.sql").read_text(encoding="utf-8"))
        out.write("\nCREATE TEMP TABLE incoming_categories (data jsonb) ON COMMIT DROP;\n")
        out.write("COPY incoming_categories FROM STDIN WITH (FORMAT csv);\n")
        writer = csv.writer(out, lineterminator="\n")
        for c in payload["categories"]:
            writer.writerow([json.dumps(c, ensure_ascii=False, separators=(",", ":"))])
        out.write("\\.\nCREATE TEMP TABLE incoming_items (data jsonb) ON COMMIT DROP;\n")
        out.write("COPY incoming_items FROM STDIN WITH (FORMAT csv);\n")
        for item in payload["items"]:
            writer.writerow([json.dumps(item, ensure_ascii=False, separators=(",", ":"))])
        out.write("\\.\n")
        out.write("CREATE UNIQUE INDEX incoming_item_key ON incoming_items ((data->>'key'));\nANALYZE incoming_items;\n")
        out.write(f"INSERT INTO learning_catalog.runs(run_key,method,summary) VALUES ({literal(run)},"
                  f"{literal(payload['method'])},{literal(json.dumps(report, ensure_ascii=False))}::jsonb) ON CONFLICT DO NOTHING;\n")
        out.write(f"INSERT INTO learning_catalog.source_audits(run_key,inventory_audit,curriculum_references) VALUES "
                  f"({literal(run)},{literal(json.dumps(audit,ensure_ascii=False))}::jsonb,"
                  f"{literal(json.dumps(references,ensure_ascii=False))}::jsonb) ON CONFLICT(run_key) DO UPDATE "
                  "SET inventory_audit=excluded.inventory_audit,curriculum_references=excluded.curriculum_references;\n")
        out.write(f"""
WITH numbered AS (
    SELECT data->>'id' AS category_id,
      row_number() OVER (PARTITION BY data->>'exam',data->>'subjectId'
        ORDER BY (data->>'order')::integer,data->>'id')::integer AS topic_number
    FROM incoming_categories
    WHERE data->>'canonicalUnit'='true' AND data->>'selectable'='true' AND data ? 'order'
)
INSERT INTO learning_catalog.categories
SELECT {literal(run)},i.data->>'id',
  CASE WHEN n.topic_number IS NULL THEN i.data
    ELSE jsonb_set(i.data,'{{topicNumber}}',to_jsonb(n.topic_number),true) END
FROM incoming_categories i LEFT JOIN numbered n ON n.category_id=i.data->>'id'
ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.items(run_key,item_key,kind,exam,subject_id,student_visible,data,category_ids,subject_ids,exam_ids)
    SELECT {literal(run)},data->>'key',data->>'kind',data->>'exam',data->>'subjectId',(data->>'studentVisible')::boolean,data,
    ARRAY(SELECT jsonb_array_elements_text(data->'categoryIds')),
    ARRAY(SELECT jsonb_array_elements_text(data->'subjectIds')),
    ARRAY(SELECT jsonb_array_elements_text(data->'examIds')) FROM incoming_items ON CONFLICT DO NOTHING;
INSERT INTO learning_catalog.assignments SELECT {literal(run)},i.data->>'key',a->>'categoryId',a->>'relation'
    FROM incoming_items i CROSS JOIN LATERAL jsonb_array_elements(i.data->'automaticLabels'->'assignments') a ON CONFLICT DO NOTHING;
DO $validation$
BEGIN
    IF (SELECT count(*) FROM learning_catalog.items WHERE run_key={literal(run)}) <> {len(keys)} THEN
       RAISE EXCEPTION 'Incomplete resource import'; END IF;
    IF EXISTS(SELECT 1 FROM questions q LEFT JOIN incoming_items i ON i.data->>'key'='question:'||q.code
       WHERE i.data IS NULL OR i.data->>'sourceUpdatedAt' IS DISTINCT FROM extract(epoch from q.updated_at)::text) THEN
       RAISE EXCEPTION 'Question inventory changed; regenerate labels'; END IF;
END $validation$;
INSERT INTO learning_catalog.current_run(singleton,run_key) VALUES (true,{literal(run)})
    ON CONFLICT(singleton) DO UPDATE SET run_key=excluded.run_key;
DO $intake$
BEGIN
 IF to_regclass('learning_catalog.question_intake') IS NOT NULL THEN
  UPDATE learning_catalog.question_intake d SET status='PUBLISHED'
    FROM learning_catalog.current_items i WHERE i.item_key='question:'||d.question_code
      AND i.data->>'sourceUpdatedAt'=d.source_stamp;
 END IF;
END $intake$;
COMMIT;
""")
    command, env, _ = connection
    with sql_path.open("rb") as source:
        result = subprocess.run([*command, "--quiet"], stdin=source, capture_output=True, env=env)
    if result.returncode:
        raise RuntimeError(result.stderr.decode("utf-8", errors="replace")[-4000:])
    print(json.dumps({"runKey": run, "items": len(keys), "categories": len(categories), "database": args.database}, ensure_ascii=False))


if __name__ == "__main__":
    main()
