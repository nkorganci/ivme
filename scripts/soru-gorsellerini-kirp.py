"""CSV'deki soru görsellerinin beyaz kenarlarını kaynakları değiştirmeden kırp.

Kullanım (uygulama kökünden):
  python scripts/soru-gorsellerini-kirp.py --dry-run --limit 100
  python scripts/soru-gorsellerini-kirp.py

Çıktılar <görsel kökü>/kirpilmis/ altında aynı göreli yolla tutulur. Uygulama
varsa bu kopyayı, yoksa özgün görseli sunar. CSV, etiket ve kaynak hash'leri
değişmez. Tekrar çalıştırmak mevcut çıktıları atlar; --force yeniden üretir.
"""

import argparse
import csv
import json
import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path, PurePosixPath

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError


APP = Path(__file__).resolve().parent.parent
DEFAULT_CSVS = (APP / "veri/sorular-tum.csv", APP / "veri/sorular-ogm.csv")
EXTENSIONS = {".webp", ".png", ".jpg", ".jpeg"}


def relative_image_path(value):
    path = PurePosixPath(value.replace("\\", "/"))
    if (not value or path.is_absolute() or ".." in path.parts or "." in path.parts
            or path.parts[0].lower() == "kirpilmis" or path.suffix.lower() not in EXTENSIONS):
        raise ValueError(f"Geçersiz görsel yolu: {value!r}")
    return Path(*path.parts)


def question_paths(csv_paths):
    paths = set()
    for csv_path in csv_paths:
        with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                paths.add(relative_image_path(row["image"]))
    return sorted(paths, key=str)


def crop_box(image, threshold, padding):
    rgb = np.asarray(image.convert("RGB"))
    foreground = np.min(rgb, axis=2) < threshold
    rows = np.flatnonzero(np.any(foreground, axis=1))
    columns = np.flatnonzero(np.any(foreground, axis=0))
    if not len(rows) or not len(columns):
        return None
    width, height = image.size
    return (
        max(0, int(columns[0]) - padding),
        max(0, int(rows[0]) - padding),
        min(width, int(columns[-1]) + 1 + padding),
        min(height, int(rows[-1]) + 1 + padding),
    )


def process(item):
    rel, root, output, threshold, padding, dry_run, force = item
    source = root / rel
    target = output / rel
    if not source.is_file():
        return "missing", str(rel), None
    if target.is_file() and not force:
        return "existing", str(rel), None
    try:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            image.load()
            box = crop_box(image, threshold, padding)
            if box is None:
                return "blank", str(rel), None
            if box == (0, 0, *image.size):
                return "unchanged", str(rel), None
            dimensions = {"before": image.size, "after": (box[2] - box[0], box[3] - box[1])}
            if dry_run:
                return "cropped", str(rel), dimensions
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_name(target.stem + ".tmp" + target.suffix)
            try:
                cropped = image.crop(box)
                if image.format == "WEBP":
                    cropped.save(temporary, format="WEBP", quality=96, method=3)
                elif image.format == "PNG":
                    cropped.save(temporary, format="PNG", optimize=True)
                else:
                    cropped.save(temporary, format=image.format, quality=96, subsampling=0)
                os.replace(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)
            return "cropped", str(rel), dimensions
    except (OSError, ValueError, UnidentifiedImageError) as exc:
        return "error", str(rel), str(exc)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=APP / "veri/resimler-pilot")
    parser.add_argument("--csv", type=Path, action="append", dest="csvs")
    parser.add_argument("--threshold", type=int, default=245, help="Bu değerin altındaki renkler içerik sayılır")
    parser.add_argument("--padding", type=int, default=8, help="İçerik çevresinde bırakılacak piksel")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.threshold <= 255 or args.padding < 0 or args.workers < 1:
        parser.error("threshold 1..255, padding >= 0, workers >= 1 olmalı")
    root = args.root.resolve()
    output = root / "kirpilmis"
    if not root.is_dir() or output.is_symlink():
        parser.error("Görsel kökü bulunamadı veya çıktı klasörü bağlantı")
    paths = question_paths(args.csvs or DEFAULT_CSVS)
    if args.limit is not None:
        paths = paths[:args.limit]
    items = ((rel, root, output, args.threshold, args.padding, args.dry_run, args.force) for rel in paths)
    counts = {key: 0 for key in ("cropped", "unchanged", "blank", "existing", "missing", "error")}
    examples = []
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        for index, (status, path, detail) in enumerate(pool.map(process, items), 1):
            counts[status] += 1
            if status in ("missing", "error"):
                examples.append({"path": path, "error": detail})
            if index % 5000 == 0:
                print(f"{index}/{len(paths)} processed", flush=True)
    print(json.dumps({"total": len(paths), "counts": counts, "errors": examples[:20],
                      "output": str(output), "dry_run": args.dry_run}, ensure_ascii=True, indent=2))
    if counts["missing"] or counts["error"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
