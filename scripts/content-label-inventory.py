"""Collect every local question with its preserved source evidence; never change questions."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

from kaynakli_arastirma_db import db_connection, query

APP = Path(__file__).resolve().parents[1]
ROOT = APP.parent
OUT = APP / "veri/content-labels"


def load(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def source_record(row, reference, filename=None):
    """Preserve recorded positions, without inferring a PDF from a book name."""
    numbers = row.get("nolar") or row.get("kitap_nolar") or []
    return {"text": row.get("metin") or "", "heading": row.get("konu_basligi") or row.get("konu") or "",
            "page": row.get("sayfa"), "file": filename or row.get("dosya"), "rawRef": reference,
            "questionNumbers": list(dict.fromkeys(n for n in numbers if isinstance(n, int) and not isinstance(n, bool) and n > 0)),
            "image": row.get("gorsel"), "part": row.get("parca"), "group": row.get("grup"),
            "test": row.get("test"), "testOrder": row.get("test_sira"),
            "bookReferences": [{k: copy[k] for k in ("kitap", "idler", "sayfa", "kitap_nolar", "gorsel") if k in copy}
                               for copy in row.get("kopyalar", [])]}


def collect(connection=None):
    db = json.loads(query(connection or db_connection(), """SELECT coalesce(json_agg(q),'[]'::json) FROM
        (SELECT code,bank,exam_type,subject,topic,image,active,id,extract(epoch from updated_at)::text AS updated_at
         FROM questions ORDER BY code) q"""))
    registered = {r["code"]: r for r in db}
    drafts = {}
    active_connection = connection or db_connection()
    if query(active_connection,"SELECT to_regclass('learning_catalog.question_intake') IS NOT NULL")=="t":
        drafts = {r['question_code']:r for r in json.loads(query(active_connection,"""SELECT coalesce(json_agg(x),'[]') FROM
            (SELECT question_code,source_stamp,resource FROM learning_catalog.question_intake) x"""))}
    raw = {}
    for p in sorted((ROOT / "veri-hatti/ogm-sorular/kayit").glob("*.json")):
        data = load(p)
        for r in (data if isinstance(data, list) else data.get("kayitlar", data.get("sorular", []))):
            code = str(r.get("id", ""))
            if not code:
                continue
            if code in raw:
                raise ValueError(f"Duplicate original question {code}")
            raw[code] = source_record(r, p.relative_to(ROOT).as_posix() + "#id=" + code,
                                      data.get("dosya") if isinstance(data, dict) else None)
    compiled = {}
    for p in sorted((ROOT / "icerik/data/ogm/q").glob("*.js")):
        text = p.read_text(encoding="utf-8")
        cards = json.loads(text[text.index("=[{") + 1:].rstrip().rstrip(";"))
        for r in cards:
            if r["id"] in compiled:
                raise ValueError(f"Duplicate compiled question {r['id']}")
            compiled[r["id"]] = r
    outgoing = load(ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json")
    official_cards={}
    for r in outgoing.get("sorular", outgoing.get("kayitlar", [])):
        code = r.get("id")
        if code:
            official_cards[code]=r
            raw[code] = source_record(r, "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json#id=" + code)
    archives = {}
    for p in sorted((APP / "ornek-veri/etiketler").glob("*.csv")):
        for r in csv.DictReader(p.open(encoding="utf-8-sig", newline="")):
            if r["code"] in archives:
                raise ValueError(f"Duplicate evidence archive {r['code']}")
            archives[r["code"]] = r
    manual = load(ROOT / "veri-hatti/ogm-sorular/etiket/elle_etiket.json")
    codes = sorted(set(registered) | set(compiled) | set(official_cards))
    records = []
    repair_file=APP/'veri/content-labels/source-repair/applied.json'
    repairs={r['key'].removeprefix('question:'):r for r in load(repair_file)['records']} if repair_file.exists() else {}
    for code in codes:
        current, card, source = registered.get(code), compiled.get(code, {}), raw.get(code, {})
        official=official_cards.get(code,{})
        row = dict(current or {"code": code, "bank": "CIKMIS" if official else "OGM", "exam_type": official.get('sinav') or card["sinav"],
            "subject": official.get('exam_ders') or card["ders"], "topic": official.get('konu') or card.get("konu", ""), "image": "",
            "active": False, "id": None, "updated_at": None})
        row.update({"card": card, "original": source, "archive": archives.get(code, {}),
                    "manual": manual.get(code, {})})
        if official and not current:
            row['archiveSourceCard']={'year':official['yil'],'originalId':official.get('eski_id'),
                'originalSlots':official.get('eski_yuvalar',[]),'composite':bool(official.get('ortak_parca_mi')),
                'sourceQuestionCount':len(official.get('cevaplar') or []),
                'reason':'COMPOSITE_PASSAGE_REQUIRES_INDIVIDUAL_QUESTIONS' if official.get('ortak_parca_mi') else 'SOURCE_NOT_IN_STUDENT_BANK'}
        if code in repairs:
            repair=repairs[code]
            original_image=APP/'veri/resimler-pilot'/row['image']
            rendered_image=APP/'veri/resimler-pilot'/repair['renderedImage']
            if (hashlib.sha256(original_image.read_bytes()).hexdigest()!=repair['originalSha256']
                or hashlib.sha256(rendered_image.read_bytes()).hexdigest()!=repair['renderedImageSha256']):
                raise ValueError('Source repair binding changed: '+code)
            row['renderedSourceRepair']=repair
        draft = drafts.get(code)
        if draft and draft['source_stamp']==row['updated_at']:
            row['intake'] = draft['resource']
        # Fingerprint only inputs actually used to label this question; no fabricated certainty.
        row["inputFingerprint"] = hashlib.sha256(json.dumps(row, ensure_ascii=False,
            sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        records.append(row)
    return {"version": 1, "registeredQuestions": len(registered),
            "sourceOnlyQuestions": len(set(codes) - set(registered)), "questions": records}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    value = collect()
    output = json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n"
    destination = OUT / "source-inventory.json"
    if args.check:
        if destination.read_text(encoding="utf-8") != output:
            raise ValueError("Inventory changed; regenerate before publishing labels")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        temp = destination.with_suffix(".tmp")
        temp.write_text(output, encoding="utf-8")
        temp.replace(destination)
    print(json.dumps({k: v for k, v in value.items() if k != "questions"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
