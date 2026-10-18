"""Select the local database from the checked-out branch for maintenance scripts."""
import os
import subprocess
from pathlib import Path
from urllib.parse import urlparse

APP = Path(__file__).resolve().parents[1]


def default_database():
    explicit = os.environ.get("PGDATABASE")
    if not explicit and os.environ.get("YKS_DB_URL"):
        explicit = urlparse(os.environ["YKS_DB_URL"].removeprefix("jdbc:")).path.lstrip("/")
    if explicit:
        return explicit
    branch = subprocess.run(["git", "-C", str(APP), "branch", "--show-current"],
                            text=True, capture_output=True, check=True).stdout.strip()
    if not branch:
        raise ValueError("A checked-out branch or explicit database is required")
    return "ivme" if branch == "main" else "ivme_dev"
