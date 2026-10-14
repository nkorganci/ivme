"""Kayıtlı araştırmadan soru veya PDF sayfasını kaynak iziyle geri çağırır.

Salt okunur. Tam metinler özel yerel araştırma içindir; öğrenci yayını değildir.
Örnek: --question TYT-0289 --bank CIKMIS
       --topic 'Fiilde Çatı' --subject Türkçe --limit 5
       --pdf-page 29:111
"""
import argparse
import json

from kaynakli_arastirma_db import db_connection, json_text, query, restore_source_text, status


def literal(value):
    return "'" + value.replace("'", "''") + "'"


def inspect(connection, *, question=None, bank=None, topic=None, subject=None,
            pdf_page=None, limit=5):
    if not 1 <= limit <= 50:
        raise ValueError("Örnek sınırı 1–50 olmalı")
    current = status(connection)
    if not current.get("runKey"):
        raise ValueError("Kayıtlı araştırma yok")
    key = literal(current["runKey"])
    if pdf_page:
        catalog, page = pdf_page
        if catalog < 1 or page < 1:
            raise ValueError("PDF ve sayfa kimlikleri pozitif olmalı")
        rows = query(connection, f"""SELECT coalesce(json_agg(x),'[]') FROM (
          SELECT p.*,d.title,d.official_url,d.local_path FROM source_research.document_pages p
          JOIN source_research.run_documents rd ON rd.catalog_id=p.catalog_id
            AND rd.document_sha256=p.document_sha256 AND rd.run_key={key}
          JOIN source_research.documents d ON d.catalog_id=p.catalog_id AND d.sha256=p.document_sha256
          WHERE p.catalog_id={catalog} AND p.page_number={page}
            AND p.extractor_version=(SELECT input_manifest->>'extractor'
              FROM source_research.runs WHERE run_key={key})) x""")
        return {"runKey": current["runKey"], "pages": json.loads(rows)}
    conditions = [f"q.run_key={key}"]
    if question:
        conditions.append(f"q.code={literal(question)}")
    if bank:
        if bank not in {"CIKMIS", "OGM"}:
            raise ValueError("Geçersiz koleksiyon")
        conditions.append(f"q.bank={literal(bank)}")
    if subject:
        conditions.append(f"q.subject={literal(subject)}")
    if topic:
        conditions.append(f"strpos(lower(translate(q.proposed_label,'Iİı','iii')),"
                          f"lower(translate({literal(topic)},'Iİı','iii')))>0")
    where = " AND ".join(conditions)
    totals = json.loads(query(connection, f"""SELECT coalesce(json_agg(x),'[]') FROM (
      SELECT q.bank,q.exam_type,q.subject,q.proposed_label,count(*) AS records,
        count(*) FILTER (WHERE q.extraction_status<>'TEXT_AVAILABLE') AS needs_visual_review
      FROM source_research.question_evidence q WHERE {where}
      GROUP BY q.bank,q.exam_type,q.subject,q.proposed_label
      ORDER BY q.bank,q.exam_type,q.subject,q.proposed_label) x"""))
    # Her koleksiyondan ayrı örnek al; OGM hacmi çıkmış soruları görünmez kılmasın.
    rows = query(connection, f"""SELECT coalesce(json_agg(x),'[]') FROM (
      SELECT bank,code,exam_type,subject,proposed_label,source_text,text_sha256,
        image_path,image_sha256,extraction_status,inspection_status,evidence
      FROM (SELECT q.*,row_number() OVER (PARTITION BY q.bank ORDER BY q.code) AS position
        FROM source_research.question_evidence q WHERE {where}) ranked
      WHERE position<={limit} ORDER BY bank,code) x""")
    observations = query(connection, f"""SELECT coalesce(json_agg(o),'[]') FROM source_research.observations o
      WHERE o.run_key={key} AND o.object_key IN (
        SELECT q.bank || ':' || q.code FROM source_research.question_evidence q WHERE {where})""")
    questions = json.loads(rows)
    for row in questions:
        row["source_text"] = restore_source_text(row)
    return {"runKey": current["runKey"], "totals": totals, "questions": questions,
            "observations": json.loads(observations), "sampleLimitPerBank": limit,
            "scope": "Kaynak etiketine göre geri çağırma; yeni çözüm veya kalıp doğrulaması değildir."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--question")
    mode.add_argument("--topic")
    mode.add_argument("--pdf-page", help="Katalog kimliği:1 tabanlı PDF sayacı")
    parser.add_argument("--bank", choices=("CIKMIS", "OGM"))
    parser.add_argument("--subject")
    parser.add_argument("--limit", type=int, default=5)
    args = parser.parse_args()
    page = None
    if args.pdf_page:
        try:
            catalog, number = map(int, args.pdf_page.split(":"))
            page = (catalog, number)
        except ValueError:
            parser.error("--pdf-page 29:111 biçiminde olmalı")
    print(json_text(inspect(db_connection(), question=args.question, bank=args.bank,
                           topic=args.topic, subject=args.subject, pdf_page=page, limit=args.limit)))


if __name__ == "__main__":
    main()
