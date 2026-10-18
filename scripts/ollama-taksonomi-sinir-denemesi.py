"""Compare a clearer taxonomy prompt on a fixed small set of source images."""

import base64
import argparse
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.error import HTTPError, URLError


APP = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ollama_etiket_pilotu", APP / "scripts/ollama-etiket-pilotu.py")
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)
MODEL = "qwen3.5:4b"
CODES = ("TYT-0062", "TYT-0098", "TYT-0001", "TYT-0199", "TYT-0100", "TYT-0118")
OUTPUT = APP / "ornek-veri/ai-etiket-sinir-denemesi-6.json"
FULL_OUTPUT = APP / "veri/ai-etiket-v2/qwen3.5-4b-200.json"


def main(all_questions=False):
    taxonomy = json.loads(pilot.TAXONOMY.read_text(encoding="utf-8"))
    allowed = {node["code"]: node["name"] for node in taxonomy["nodes"]
               if node["kind"] == "QUESTION_TYPE"}
    _, _, generation, _, _ = pilot.build_spec()
    definitions = {
        "sozcuk_baglam": "Bağlamda sözcük veya söz öbeği anlamı/seçimi; boşluğa uygun sözcük seçimi de buna dahildir.",
        "cumle_yorum": "Tek bir cümlenin anlamı, çıkarımı veya cümleler arası anlam ilişkisi; paragraftaki cümle sırası değil.",
        "paragraf_anlam": "Paragrafın ana düşüncesi, içerdiği yargı, yazarın tutumu veya metinden çıkarım.",
        "paragraf_yapi": "Paragrafta cümle sırası/yerleşimi, akışı bozan cümle, giriş/sonuç, parçayı bölme veya tamamlama.",
        "yazim": "Yazım kurallarının uygulanması.",
        "noktalama": "Noktalama işaretlerinin uygulanması.",
        "ogeler": "Cümlenin ögelerini belirleme.",
    }
    rules = "\n".join(f"{code}: {name}. {definitions[code.split('.')[-1]]}"
                      for code, name in sorted(allowed.items()))
    prompt = ("Görseldeki TYT Türkçe sorusunun ÖLÇTÜĞÜ beceriyi soru köküne göre belirle. "
              "Paragraf uzunluğuna veya şıklardaki sözcüklere tek başına bakarak sınıflama. "
              "Aşağıdaki sınırları uygula. Soru kökünden ayırt edici kısa kanıt yaz; "
              "okunmuyorsa veya sınır belirsizse abstain=true ve question_type_code=null ver. "
              "confidence kalibre edilmiş olasılık değildir.\n" + rules)
    with pilot.QUEUE.open(encoding="utf-8", newline="") as stream:
        rows = {row["question_code"]: row for row in csv.DictReader(stream)}
    baseline_path = next(pilot.OUTPUT_DIR.glob("qwen3.5_4b-*-ollama-vision-allowed-types-v1.json"))
    baseline = {item["question_code"]: item for item in
                json.loads(baseline_path.read_text(encoding="utf-8"))["drafts"]}
    tags = pilot.api("/api/tags")
    model = next(item for item in tags["models"] if item["name"] == MODEL)
    output = FULL_OUTPUT if all_questions else OUTPUT
    selected = tuple(rows) if all_questions else CODES
    result = {"model": MODEL, "model_digest": model["digest"],
              "prompt_version": "taxonomy-boundaries-v2",
              "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
              "question_codes": list(selected), "results": [], "errors": []}
    if output.exists():
        saved = json.loads(output.read_text(encoding="utf-8"))
        if any(saved.get(key) != result[key] for key in
               ("model", "model_digest", "prompt_version", "prompt_sha256", "question_codes")):
            raise ValueError("Önbellek model, prompt veya soru listesiyle uyuşmuyor")
        result = saved
    elif all_questions and OUTPUT.exists():
        seed = json.loads(OUTPUT.read_text(encoding="utf-8"))
        if all(seed.get(key) == result[key] for key in
               ("model", "model_digest", "prompt_version", "prompt_sha256")):
            result["results"] = seed["results"]
            pilot.write_atomic(output, result)
    completed = {item["question_code"] for item in result["results"]}
    for code in selected:
        row = rows[code]
        image = pilot.SOURCE_ROOT / row["source_image"]
        content = image.read_bytes()
        if hashlib.sha256(content).hexdigest() != row["image_sha256"]:
            raise ValueError(f"Görsel değişmiş: {code}")
        if code in completed:
            print(f"cached {code}", flush=True)
            continue
        try:
            request = {"model": MODEL, "prompt": prompt,
                       "images": [base64.b64encode(content).decode("ascii")], **generation}
            response = pilot.api("/api/generate", request)
            retry_num_predict = None
            retry_num_ctx = None
            if response.get("done_reason") == "length":
                retry_num_predict = 512
                retry_num_ctx = 8192
                request["options"] = {**generation["options"],
                                      "num_predict": retry_num_predict,
                                      "num_ctx": retry_num_ctx}
                response = pilot.api("/api/generate", request)
            if response.get("done") is not True or response.get("done_reason") != "stop":
                raise ValueError(f"Model yanıtı tamamlanmadı: {response.get('done_reason')}; "
                                 f"prompt_tokens={response.get('prompt_eval_count')}; "
                                 f"output_tokens={response.get('eval_count')}")
            answer = json.loads(response["response"])
            label = answer["question_type_code"]
            if (answer["abstain"] and label is not None) or (not answer["abstain"] and label not in allowed):
                raise ValueError(f"Geçersiz model etiketi: {code}")
            if (type(answer["confidence"]) not in (float, int) or not 0 <= answer["confidence"] <= 1
                    or not isinstance(answer["evidence"], str) or not answer["evidence"].strip()):
                raise ValueError(f"Geçersiz güven veya kanıt: {code}")
            result["errors"] = [item for item in result["errors"] if item["question_code"] != code]
            result["results"].append({"question_code": code, "image_sha256": row["image_sha256"],
                "source_topic_type": row["suggested_question_type_code"],
                "first_prompt_type": baseline[code]["question_type_code"],
                "clearer_prompt_type": label, "abstain": answer["abstain"],
                "confidence": answer["confidence"], "evidence": answer["evidence"],
                "duration_ns": response["total_duration"],
                "retry_num_predict": retry_num_predict,
                "retry_num_ctx": retry_num_ctx})
            pilot.write_atomic(output, result)
            print(f"{code}: {baseline[code]['question_type_code']} -> {label}", flush=True)
        except (HTTPError, URLError, KeyError, ValueError, TypeError, json.JSONDecodeError) as error:
            result["errors"] = [item for item in result["errors"] if item["question_code"] != code]
            result["errors"].append({"question_code": code, "error": str(error)})
            pilot.write_atomic(output, result)
            print(f"error {code}: {error}", flush=True)
    print(f"output={output} results={len(result['results'])} errors={len(result['errors'])}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Reclassify all 200 review questions")
    args = parser.parse_args()
    main(args.all)
