"""Build a portable offline TYT Turkish teacher review package."""

import argparse
import csv
import hashlib
import importlib.util
import json
import zipfile
from functools import lru_cache
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("altin_ornek_kuyrugu", APP / "scripts/altin-ornek-kuyrugu.py")
QUEUE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(QUEUE)
TEMPLATE = Path(__file__).with_name("ogretmen-inceleme-offline.html")
DEFAULT_OUTPUT = APP / "veri/ogretmen-inceleme-tyt-turkce-200.zip"


@lru_cache(maxsize=1)
def shared_context():
    with QUEUE.OUTPUT.open(encoding='utf-8',newline='') as stream:
        codes={row['question_code'] for row in csv.DictReader(stream)}
    catalog=json.loads((APP/'veri/content-labels/labels.json').read_text(encoding='utf-8'))
    report=json.loads((APP/'veri/content-labels/report.json').read_text(encoding='utf-8'))
    resources={i['questionCode']:{'itemKey':i['key'],'sourceVersion':i['sourceVersion'],
        'sourceUpdatedAt':i.get('sourceUpdatedAt'),'taxonomyVersion':i['taxonomyVersion'],
        'assignments':[{'categoryId':a['categoryId'],'relation':a['relation'],'scopeStatus':a['scopeStatus']}
                       for a in i['automaticLabels']['assignments']]}
        for i in catalog['items'] if i.get('questionCode') in codes}
    if set(resources)!=codes:
        raise ValueError('İnceleme paketinin ortak kaynak kimlikleri eksik; önce katalog üretin.')
    return {'catalogRunKey':report['runKey'],'resources':dict(sorted(resources.items()))}


def question_identity(rows):
    stable = [(row["question_code"], row["image_sha256"], row["taxonomy_version"])
              for row in sorted(rows, key=lambda row: row["question_code"])]
    return stable


def legacy_package_id(rows, context):
    return hashlib.sha256(json.dumps({'questions':question_identity(rows),'sharedContext':context}, ensure_ascii=False,
                                     separators=(",", ":")).encode("utf-8")).hexdigest()[:16]


def package_id(rows):
    # An unrelated PDF/note publication must not invalidate unchanged decisions.
    return legacy_package_id(rows, {'resources': shared_context()['resources']})


def valid_package_id(identifier, rows, exported_context=None):
    current=shared_context()
    if identifier==package_id(rows):return True
    contexts=[]
    if isinstance(exported_context,dict):contexts.append(exported_context)
    candidates=list((APP/'veri/content-labels/human-review').glob('*.zip'))
    if DEFAULT_OUTPUT.is_file():candidates.append(DEFAULT_OUTPUT)
    for path in candidates:
        try:
            with zipfile.ZipFile(path) as archive:
                contexts.append(json.loads(archive.read('shared-context.json')))
        except (OSError,KeyError,ValueError,zipfile.BadZipFile):
            continue
    return any(context.get('resources')==current['resources'] and legacy_package_id(rows,context)==identifier
               for context in contexts if isinstance(context,dict))


def build(output):
    QUEUE.validate_review_file()
    with QUEUE.OUTPUT.open(encoding="utf-8", newline="") as stream:
        rows = list(csv.DictReader(stream))
    if len(rows) != 200 or len({row["question_code"] for row in rows}) != 200:
        raise ValueError("200 benzersiz soru bekleniyor")
    taxonomy = json.loads(QUEUE.TAXONOMY.read_text(encoding="utf-8"))
    types = sorted(({"code": node["code"], "name": node["name"]}
                    for node in taxonomy["nodes"] if node["kind"] == "QUESTION_TYPE"),
                   key=lambda item: item["name"])
    if len(types) != 7:
        raise ValueError("TYT Türkçe tip listesi değişmiş")
    ordered = sorted(rows, key=lambda row: (row["ai_human_review_priority"] != "oncelikli",
                                                row["question_code"]))
    visible_rows = [{key: row[key] for key in (
        "question_code", "source_year", "source_topic", "image_sha256",
        "suggested_question_type_code", "ai_question_type_code", "ai_review_evidence",
        "ai_review_note")} for row in ordered]
    identifier = package_id(rows)
    data = {"package_id": identifier, "types": types, "rows": visible_rows,"shared_context":shared_context()}
    literal = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    html = TEMPLATE.read_text(encoding="utf-8").replace("__PACKAGE_DATA__", literal)
    readme = f"""# TYT Türkçe öğretmen incelemesi — 200 soru

Paket kimliği: `{identifier}`. İnternet, Python veya uygulama hesabı gerekmez.

1. ZIP dosyasını bir klasöre çıkarın. `index.html` dosyasını tarayıcıda açın; görseller `images/` klasöründe kalmalıdır.
2. Adınızı/kimliğinizi yazın. Sorunun görselini okuyup **ölçtüğü soru tipini** seçin ve kökten kısa gerekçe yazın. Doğru şıkkı çözmeniz gerekmez.
3. Emin olmadığınız soruda `Belirsiz`, bu yedi tipin dışındaki/uygunsuz soruda `Reddet` seçin; nedeni yazın. AI ve kaynak önerileri başlangıçta gizlidir, bağımsız kararınızı verdikten sonra açabilirsiniz.
4. Öncelikli 63 soru önce gelir; toplam 200 sorunun tamamını inceleyin. Ara verdiğinizde ve sonunda **Kararları dosyaya indir** düğmesini kullanın. Tarayıcının geçici kaydına tek başına güvenmeyin.
5. Son indirdiğiniz `tyt-turkce-ogretmen-kararlari-*.json` dosyasını paket sahibine geri verin. Dosyayı veya görselleri elle değiştirmeyin.

Bu kararlar öğretmen incelemesidir. AI notları yalnız yardımcı taslaktır. Paket yerel kullanım içindir; sonuçlar ana veriye ancak soru kimliği, görsel özeti, etiket ve gerekçe kontrolünden sonra aktarılır.
"""
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = output.with_suffix(".tmp")
    with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        archive.writestr("index.html", html)
        archive.writestr("README.md", readme)
        archive.writestr('shared-context.json',json.dumps(shared_context(),ensure_ascii=False,indent=2)+'\n')
        for row in rows:
            image = (QUEUE.SOURCE_ROOT / row["source_image"]).resolve()
            if not image.is_relative_to(QUEUE.SOURCE_ROOT.resolve()) or not image.is_file():
                raise ValueError(f"Kaynak görsel yok: {row['question_code']}")
            content = image.read_bytes()
            if hashlib.sha256(content).hexdigest() != row["image_sha256"]:
                raise ValueError(f"Görsel özeti değişmiş: {row['question_code']}")
            archive.writestr(f"images/{row['question_code']}.webp", content)
    temporary.replace(output)
    print(f"package={output} id={identifier} questions={len(rows)} bytes={output.stat().st_size}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    build(args.output.resolve())
