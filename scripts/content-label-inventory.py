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


def collect(connection=None):
    db = json.loads(query(connection or db_connection(), """SELECT coalesce(json_agg(q),'[]'::json) FROM
        (SELECT code,bank,exam_type,subject,topic,image,active,id,extract(epoch from updated_at)::text AS updated_at
         FROM questions ORDER BY code) q"""))
    registered = {r["code"]: r for r in db}
    raw = {}
    for p in sorted((ROOT / "veri-hatti/ogm-sorular/kayit").glob("*.json")):
        data = load(p)
        for r in (data if isinstance(data, list) else data.get("kayitlar", data.get("sorular", []))):
            code = str(r.get("id", ""))
            if not code:
                continue
            if code in raw:
                raise ValueError(f"Duplicate original question {code}")
            raw[code] = {"text": r.get("metin") or "", "heading": r.get("konu_basligi") or "",
                         "page": r.get("sayfa"), "file": data.get("dosya") if isinstance(data, dict) else None,
                         "rawRef": p.relative_to(ROOT).as_posix() + "#id=" + code}
    compiled = {}
    for p in sorted((ROOT / "icerik/data/ogm/q").glob("*.js")):
        text = p.read_text(encoding="utf-8")
        cards = json.loads(text[text.index("=[{") + 1:].rstrip().rstrip(";"))
        for r in cards:
            if r["id"] in compiled:
                raise ValueError(f"Duplicate compiled question {r['id']}")
            compiled[r["id"]] = r
    outgoing = load(ROOT / "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json")
    for r in outgoing.get("sorular", outgoing.get("kayitlar", [])):
        code = r.get("id")
        if code:
            raw[code] = {"text": r.get("metin") or "", "heading": r.get("konu") or "",
                         "page": r.get("sayfa"), "file": r.get("dosya"),
                         "rawRef": "veri-hatti/ogm-yks-cikmis/ham/sorular_son.json#id=" + code}
    archives = {}
    for p in sorted((APP / "ornek-veri/etiketler").glob("*.csv")):
        for r in csv.DictReader(p.open(encoding="utf-8-sig", newline="")):
            if r["code"] in archives:
                raise ValueError(f"Duplicate evidence archive {r['code']}")
            archives[r["code"]] = r
    manual = load(ROOT / "veri-hatti/ogm-sorular/etiket/elle_etiket.json")
    codes = sorted(set(registered) | set(compiled))
    records = []
    for code in codes:
        current, card, source = registered.get(code), compiled.get(code, {}), raw.get(code, {})
        row = dict(current or {"code": code, "bank": "OGM", "exam_type": card["sinav"],
            "subject": card["ders"], "topic": card.get("konu", ""), "image": "",
            "active": False, "id": None, "updated_at": None})
        row.update({"card": card, "original": source, "archive": archives.get(code, {}),
                    "manual": manual.get(code, {})})
        # Fingerprint only inputs actually used to label this question; no fabricated certainty.
        row["inputFingerprint"] = hashlib.sha256(json.dumps(row, ensure_ascii=False,
            sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        records.append(row)
    return {"version": 1, "registeredQuestions": len(registered),
            "sourceOnlyQuestions": len(set(compiled) - set(registered)), "questions": records}


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
