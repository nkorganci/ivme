"""Build the private rsync file list and the portable PDF location projection."""

import argparse
from collections import Counter
from hashlib import file_digest
import json
from pathlib import Path, PurePosixPath, PureWindowsPath


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha256(path):
    with path.open("rb") as stream:
        return file_digest(stream, "sha256").hexdigest()


def relative_path(value):
    path = PurePosixPath(value.replace("\\", "/"))
    if path.is_absolute() or not path.parts or ".." in path.parts or ":" in value:
        raise ValueError(f"Invalid relative asset path: {value}")
    return path


def pdf_requirements(workspace, release):
    catalog = workspace / "uygulama/veri/ogm-konu-pdf-katalog/entries"
    for entry in catalog.glob("*.json"):
        row = load_json(entry)["result"]
        if row["status"] == "available":
            yield PurePosixPath("ogm-materyal") / relative_path(row["relative_path"]), row["source_sha256"]
    labels = release / "backend/src/main/resources/pdf-review-labels.json"
    for row in load_json(labels)["items"]:
        if row["availability"] == "available":
            prefix = "" if row.get("sourceScope") == "RESOURCES" else "ogm-materyal"
            yield PurePosixPath(prefix) / relative_path(row["relativePath"]), row["sourceSha256"]


def pdf_projection(workspace, release):
    resources = workspace / "Kaynaklar"
    archive = resources / "YKS"
    local = load_json(archive / "Katalog/etkin-yollar.json")
    if local["version"] != 1 or local["status"] != "ACTIVE":
        raise ValueError("Expected the active YKS file-location projection")
    old_root = PureWindowsPath(local["archiveRoot"]).parent
    original, mapped = {}, {}
    for row in local["locations"]:
        path = PureWindowsPath(row["originalPath"])
        if not path.is_relative_to(old_root) or path.suffix.lower() != ".pdf":
            continue
        relative = PurePosixPath(*path.relative_to(old_root).parts)
        original[relative.as_posix().casefold()] = (relative_path(row["target"]), row["sha256"])

    files, missing = set(), []
    for path, sha in dict(pdf_requirements(workspace, release)).items():
        match = original.get(path.as_posix().casefold())
        if match and match[1] == sha and (archive / match[0]).is_file():
            mapped[path] = (PurePosixPath("YKS") / match[0], sha)
            files.add(archive / match[0])
        elif (resources / path).is_file():
            files.add(resources / path)
        else:
            folder = (resources / path).parent
            renamed = next((file for file in sorted(folder.glob("*.pdf")) if sha256(file) == sha), None)
            if renamed is None:
                missing.append(path.as_posix())
            else:
                mapped[path] = (PurePosixPath(renamed.relative_to(resources).as_posix()), sha)
                files.add(renamed)

    rows = [
        {"originalPath": (PurePosixPath("/app/Kaynaklar") / path).as_posix(),
         "target": target.as_posix(), "sha256": sha}
        for path, (target, sha) in sorted(mapped.items())
    ]
    return files, {"version": 1, "status": "ACTIVE", "locations": rows}, missing


def assets(workspace, release):
    roots = {
        "uygulama/veri/resimler-pilot": {".webp", ".png", ".jpg", ".jpeg", ".gif"},
        "uygulama/veri/ogm-konu-pdf-katalog/entries": {".json"},
        "uygulama/veri/content-labels/pdf-extraction/mini-test-04": {".json", ".webp"},
        "uygulama/veri/pdf-source-registry/slide-candidates": {".json", ".webp"},
        "Kaynaklar/yurt-disi": {".pdf"},
    }
    files, projection, missing = pdf_projection(workspace, release)
    for relative, extensions in roots.items():
        root = workspace / relative
        if not root.is_dir():
            raise FileNotFoundError(root)
        files.update(path for path in root.rglob("*") if path.suffix.lower() in extensions and path.is_file())
    repair = workspace / "uygulama/veri/resimler-pilot/onarilmis/manifest.json"
    if repair.is_file():
        files.add(repair)
    return files, projection, missing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("output", type=Path, help="New private directory outside the Git checkout")
    args = parser.parse_args()
    workspace = args.workspace.resolve()
    release = Path(__file__).resolve().parents[1]
    output = args.output.resolve()
    if any(output.is_relative_to(checkout) for checkout in (release, workspace / "uygulama")):
        parser.error("Output must be outside both Git checkouts")
    files, projection, missing = assets(workspace, release)
    output.mkdir(mode=0o700)
    totals = Counter()
    with (output / "assets.files").open("wb") as names, (
        output / "assets.sha256"
    ).open("w", encoding="utf-8", newline="\n") as checksums:
        for path in sorted(files):
            relative = path.relative_to(workspace)
            if path.resolve() != path or "\n" in relative.as_posix():
                raise ValueError(f"Asset must be a regular file inside the workspace: {relative}")
            sha = sha256(path)
            names.write(relative.as_posix().encode("utf-8") + b"\0")
            checksums.write(f"{sha}  {relative.as_posix()}\n")
            totals[relative.parts[0]] += path.stat().st_size
    (output / "production-paths.json").write_text(
        json.dumps(projection, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (output / "missing-pdfs.json").write_text(
        json.dumps(sorted(missing), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"{len(files):,} files, {sum(totals.values()) / 2**30:.2f} GiB, "
          f"{len(projection['locations']):,} relocated PDFs, {len(missing):,} missing PDF paths")


if __name__ == "__main__":
    main()
