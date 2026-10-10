"""Run a cached, local-only vision label pilot against the 14.01 review queue."""

import argparse
import base64
import csv
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


APP = Path(__file__).resolve().parents[1]
SOURCE_ROOT = APP.parent / "veri-hatti/ogm-yks-cikmis/ham"
QUEUE = APP / "ornek-veri/altin-ornek-inceleme-200.csv"
TAXONOMY = APP / "ornek-veri/taksonomi-tyt-turkce-v1.json"
OUTPUT_DIR = APP / "veri/ai-etiket-pilot"
BASE = "http://127.0.0.1:11434"
PROMPT_VERSION = "ollama-vision-allowed-types-v1"


def api(path, payload=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(BASE + path, data=body,
                      headers={"Content-Type": "application/json"} if body else {})
    with urlopen(request, timeout=240) as response:
        return json.load(response)


def source_rows():
    with QUEUE.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    assert len(rows) == 200 and len({row["question_code"] for row in rows}) == 200
    return rows


def ordered_rows(rows, all_questions):
    if all_questions:
        return rows
    seen = set()
    selected = []
    for row in rows:
        if row["source_topic"] not in seen:
            seen.add(row["source_topic"])
            selected.append(row)
    assert len(selected) == 7
    return selected


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def run(model, all_questions):
    tags = api("/api/tags")
    matches = [item for item in tags["models"] if model in (item.get("name"), item.get("model"))]
    if len(matches) != 1:
        raise ValueError(f"Model kurulu değil veya tekil değil: {model}")
    digest = matches[0]["digest"]
    if not digest or len(digest) != 64:
        raise ValueError("Model digest bulunamadı")
    taxonomy = json.loads(TAXONOMY.read_text(encoding="utf-8"))
    allowed = {node["code"]: node["name"] for node in taxonomy["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    schema = {
        "type": "object", "additionalProperties": False,
        "properties": {
            "question_type_code": {"type": ["string", "null"], "enum": sorted(allowed) + [None]},
            "confidence": {"type": "number", "minimum": 0, "maximum": 1},
            "abstain": {"type": "boolean"},
            "evidence": {"type": "string"},
        },
        "required": ["question_type_code", "confidence", "abstain", "evidence"],
    }
    description = "\n".join(f"{code}: {name}" for code, name in sorted(allowed.items()))
    prompt = ("Görseldeki TYT Türkçe sorusunun neyi ölçtüğünü incele. "
              "Yalnız aşağıdaki QUESTION_TYPE kodlarından birini seç. "
              "Kök ve şıklardaki ayırt edici kanıtı kısa yaz. "
              "Sınıf sınırı veya görsel okunurluğu belirsizse abstain=true, "
              "question_type_code=null ver. Cevabı tahmin etme veya değiştirme. "
              "Güven değeri öznel tahmindir, kalibre edilmiş olasılık değildir.\n"
              + description)
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    safe_model = re.sub(r"[^A-Za-z0-9_.-]", "_", model).lstrip(".")
    output = OUTPUT_DIR / f"{safe_model}-{digest[:12]}-{PROMPT_VERSION}.json"
    if output.exists():
        data = json.loads(output.read_text(encoding="utf-8"))
        metadata = data["run"]
        if (metadata["model_version"] != digest or metadata["prompt_sha256"] != prompt_hash
                or metadata["taxonomy_version"] != "tyt-turkce-v1"):
            raise ValueError("Önbellek modeli, promptu veya taksonomisi değişmiş")
    else:
        data = {"schema_version": 1, "run": {
            "id": f"ollama-{digest[:12]}-{PROMPT_VERSION}", "model_family": model,
            "model_version": digest, "prompt_version": PROMPT_VERSION,
            "prompt_sha256": prompt_hash, "taxonomy_version": "tyt-turkce-v1",
            "source": "local Ollama vision", "status": "draft",
            "started_at_utc": datetime.now(timezone.utc).isoformat(),
        }, "drafts": [], "errors": []}
    completed = {item["question_code"]: item for item in data["drafts"]}
    for row in ordered_rows(source_rows(), all_questions):
        code = row["question_code"]
        image = (SOURCE_ROOT / row["source_image"]).resolve()
        if not image.is_relative_to(SOURCE_ROOT.resolve()) or not image.is_file():
            raise ValueError(f"Geçersiz kaynak görsel: {code}")
        content = image.read_bytes()
        if hashlib.sha256(content).hexdigest() != row["image_sha256"]:
            raise ValueError(f"Kaynak görsel değişmiş: {code}")
        if code in completed:
            if completed[code]["image_sha256"] != row["image_sha256"]:
                raise ValueError(f"Önbellekteki görsel değişmiş: {code}")
            print(f"cached {code}")
            continue
        request = {"model": model, "prompt": prompt,
                   "images": [base64.b64encode(content).decode("ascii")],
                   "format": schema, "stream": False,
                   "options": {"temperature": 0}}
        try:
            response = api("/api/generate", request)
            if response.get("done") is not True or response.get("done_reason") != "stop":
                raise ValueError("Model yanıtı tamamlanmadı")
            result = json.loads(response["response"])
            label, confidence, abstain, evidence = (
                result["question_type_code"], result["confidence"],
                result["abstain"], result["evidence"])
            if (not isinstance(confidence, (float, int)) or isinstance(confidence, bool)
                    or not 0 <= confidence <= 1 or not isinstance(abstain, bool)
                    or not isinstance(evidence, str) or not evidence.strip()
                    or (abstain and label is not None)
                    or (not abstain and label not in allowed)):
                raise ValueError("Model çıktısı sözleşmeye uymuyor")
            reasons = []
            if abstain:
                reasons.append("abstain")
            if confidence < 0.65:
                reasons.append("low_confidence")
            if label and label != row["suggested_question_type_code"]:
                reasons.append("source_topic_conflict")
            item = {"question_code": code, "image_sha256": row["image_sha256"],
                    "question_type_code": label, "confidence": confidence,
                    "abstain": abstain, "evidence": evidence.strip(),
                    "review_reasons": reasons,
                    "prompt_tokens": response.get("prompt_eval_count"),
                    "output_tokens": response.get("eval_count"),
                    "total_duration_ns": response.get("total_duration")}
            data["drafts"].append(item)
            write_atomic(output, data)
            print(f"draft {code}: {label or 'emin değilim'}; review={','.join(reasons) or 'normal'}")
        except (HTTPError, URLError, KeyError, ValueError, TypeError, json.JSONDecodeError) as error:
            data["errors"].append({"question_code": code, "error": str(error)})
            write_atomic(output, data)
            print(f"error {code}: {error}")
    print(f"output={output} drafts={len(data['drafts'])} errors={len(data['errors'])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, help="Installed Ollama vision model name")
    parser.add_argument("--all", action="store_true", help="Use all 200 instead of one per source topic")
    args = parser.parse_args()
    try:
        run(args.model, args.all)
    except (HTTPError, URLError) as error:
        parser.exit(2, f"Yerel Ollama erişilemiyor ({BASE}): {error}\n")
