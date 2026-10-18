"""Import one independently approved hint through the local source gate.

Default mode validates only. Applying to a non-test database requires an explicit flag.
PostgreSQL credentials are read by psql from PG* environment variables, not arguments.
"""

import argparse
import importlib.util
import json
import os
import subprocess
from pathlib import Path


APP = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("ipucu_kaynak_denetle", APP / "scripts/ipucu-kaynak-denetle.py")
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)
SQL = APP / "scripts/sql/ipucu-aktar.sql"


def import_hint(hint_path, queue_path=GATE.QUEUE, notes_path=GATE.NOTES,
                taxonomy_path=GATE.TAXONOMY, apply=False, allow_live=False,
                psql="psql", env=None):
    """Validate current human sources before any database write."""
    checked = GATE.checked_hint(hint_path, queue_path, notes_path, taxonomy_path)
    hint = json.loads(Path(hint_path).read_text(encoding="utf-8"))
    if not apply:
        return {"status": "validated_only", **checked}

    environment = dict(os.environ if env is None else env)
    database = environment.get("PGDATABASE", "")
    if not database:
        raise ValueError("PGDATABASE açıkça ayarlanmalı")
    if not database.endswith("_test") and not allow_live:
        raise ValueError("Test dışı veritabanı için --allow-live gerekir")
    command = [psql, "-X", "-w", "-v", "ON_ERROR_STOP=1",
               "-v", "hint_payload=" + json.dumps(hint, ensure_ascii=True, separators=(",", ":")),
               "-f", str(SQL)]
    result = subprocess.run(command, env=environment, capture_output=True, text=True,
                            encoding="utf-8", timeout=30, check=False)
    if result.returncode:
        raise ValueError("Veritabanı aktarımı reddedildi: " + (result.stderr.strip() or result.stdout.strip()))
    return {"status": "imported", **checked}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("hint", type=Path)
    parser.add_argument("--queue", type=Path, default=GATE.QUEUE)
    parser.add_argument("--notes", type=Path, default=GATE.NOTES)
    parser.add_argument("--taxonomy", type=Path, default=GATE.TAXONOMY)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--allow-live", action="store_true")
    parser.add_argument("--psql", default="psql")
    args = parser.parse_args()
    try:
        print(json.dumps(import_hint(args.hint, args.queue, args.notes, args.taxonomy,
                                     args.apply, args.allow_live, args.psql), ensure_ascii=False))
    except (ValueError, OSError, subprocess.TimeoutExpired) as error:
        parser.exit(1, f"ipucu aktarımı durduruldu: {error}\n")
