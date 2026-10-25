"""Yerel Ollama modeline önbellekli istek: tekil metin/görsel ya da kesintiye dayanıklı toplu iş.

Amaç: mekanik ve çok tekrarlı işleri (konu adayı, soru türü, metin temizliği, görselde
şekil var mı) ücretsiz yerel modele vermek; Claude/Codex yalnız düşük güvenli veya
çelişkili kayıtlara bakar. Yerel model çıktısı **aday**dır; öğretmen onayı veya
kesin etiket olarak yazılmaz.

  python scripts/ollama-sor.py durum
  python scripts/ollama-sor.py metin "Bu soru hangi konudan? ..." [--json]
  python scripts/ollama-sor.py gorsel soru.png "Bu görselde geometrik şekil var mı?" [--json]
  python scripts/ollama-sor.py toplu girdi.jsonl --sablon sablon.txt --cikti cikti.jsonl
        [--sema sema.json] [--gorsel-alani png] [--limit 50]

Toplu işte her satır bir JSON nesnesidir; şablondaki {alan} yerleri satırdan doldurulur.
`--sema` verilirse Ollama yapılandırılmış çıktı (JSON Schema) kullanılır. Her istek
model + istem + görsel hash'iyle `veri/ollama-onbellek/` altında saklanır; yeniden
çalıştırma yalnız eksik satırları işler. Model `OLLAMA_MODEL` ile değiştirilebilir.
"""

import argparse
import base64
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import Request, urlopen

APP = Path(__file__).resolve().parents[1]
CACHE = APP / "veri/ollama-onbellek"
BASE = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
MODEL = os.environ.get("OLLAMA_MODEL", "qwen3.5:9b")


def api(path, payload=None, timeout=600):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = Request(BASE + path, data=body, headers={"Content-Type": "application/json"} if body else {})
    with urlopen(request, timeout=timeout) as response:
        return json.load(response)


def ensure_server():
    """Sunucu kapalıysa `ollama serve` arka planda başlatılır (masaüstü uygulaması açık olsa da)."""
    try:
        return api("/api/version", timeout=3)
    except (URLError, OSError):
        pass
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) | getattr(subprocess, "DETACHED_PROCESS", 0)
    subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=flags)
    for _ in range(40):
        time.sleep(0.5)
        try:
            return api("/api/version", timeout=3)
        except (URLError, OSError):
            continue
    raise SystemExit("Ollama sunucusu başlatılamadı (ollama serve).")


def ask(prompt, image=None, schema=None, as_json=False, model=MODEL):
    image_bytes = Path(image).read_bytes() if image else b""
    key_source = json.dumps([model, prompt, hashlib.sha256(image_bytes).hexdigest(), schema, as_json],
                            ensure_ascii=False, sort_keys=True)
    key = hashlib.sha256(key_source.encode("utf-8")).hexdigest()
    target = CACHE / key[:2] / f"{key}.json"
    if target.exists():
        return json.loads(target.read_text(encoding="utf-8"))["response"], True
    payload = {"model": model, "prompt": prompt, "stream": False, "think": False,
               "options": {"temperature": 0}}
    if image:
        payload["images"] = [base64.b64encode(image_bytes).decode("ascii")]
    if schema is not None:
        payload["format"] = schema
    elif as_json:
        payload["format"] = "json"
    response = api("/api/generate", payload)["response"]
    if schema is not None or as_json:
        response = json.loads(response)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps({"model": model, "prompt": prompt, "image": str(image) if image else None,
                                  "response": response}, ensure_ascii=False), encoding="utf-8")
    return response, False


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="komut", required=True)
    sub.add_parser("durum")
    text = sub.add_parser("metin")
    text.add_argument("istem")
    text.add_argument("--json", action="store_true")
    image = sub.add_parser("gorsel")
    image.add_argument("dosya")
    image.add_argument("istem")
    image.add_argument("--json", action="store_true")
    batch = sub.add_parser("toplu")
    batch.add_argument("girdi")
    batch.add_argument("--sablon", required=True)
    batch.add_argument("--cikti", required=True)
    batch.add_argument("--sema")
    batch.add_argument("--gorsel-alani")
    batch.add_argument("--limit", type=int)
    for command in (text, image, batch):
        command.add_argument("--model", default=MODEL)
    args = parser.parse_args(argv)
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
    version = ensure_server()
    if args.komut == "durum":
        models = [m["name"] for m in api("/api/tags")["models"]]
        print(json.dumps({"ollama": version.get("version"), "base": BASE, "varsayilanModel": MODEL,
                          "modeller": models, "modelHazir": MODEL in models}, ensure_ascii=False))
        return 0
    if args.komut in ("metin", "gorsel"):
        response, hit = ask(args.istem, getattr(args, "dosya", None), as_json=args.json, model=args.model)
        print(json.dumps(response, ensure_ascii=False) if not isinstance(response, str) else response)
        print(f"[önbellek: {'evet' if hit else 'hayır'}]", file=sys.stderr)
        return 0
    template = Path(args.sablon).read_text(encoding="utf-8")
    schema = json.loads(Path(args.sema).read_text(encoding="utf-8")) if args.sema else None
    rows = [json.loads(line) for line in Path(args.girdi).read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.limit:
        rows = rows[:args.limit]
    out = Path(args.cikti)
    out.parent.mkdir(parents=True, exist_ok=True)
    done = hits = 0
    started = time.time()
    with out.open("w", encoding="utf-8") as stream:
        for index, row in enumerate(rows, 1):
            prompt = template.format_map({k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v)
                                          for k, v in row.items()})
            try:
                response, hit = ask(prompt, row.get(args.gorsel_alani) if args.gorsel_alani else None,
                                    schema=schema, as_json=schema is None, model=args.model)
                record = {**row, "_ollama": response, "_model": args.model}
            except Exception as error:  # Tek satır hatası işi durdurmaz; satır hatasıyla yazılır.
                hit, record = False, {**row, "_hata": str(error), "_model": args.model}
            stream.write(json.dumps(record, ensure_ascii=False) + "\n")
            stream.flush()
            done += 1
            hits += hit
            if index % 10 == 0 or index == len(rows):
                print(f"{index}/{len(rows)} (önbellek {hits}) {time.time() - started:.0f} sn", file=sys.stderr)
    print(json.dumps({"satir": done, "onbellek": hits, "cikti": str(out)}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
