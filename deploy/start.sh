#!/bin/sh
set -eu
cd "$(dirname "$0")"

if [ -n "$(git status --porcelain --untracked-files=all)" ]; then
    echo "Use a clean release checkout." >&2
    exit 1
fi

IVME_REVISION=$(git rev-parse HEAD)
export IVME_REVISION
docker compose config --quiet
docker compose run --rm migrate validate
docker compose build app
docker compose up -d --wait --wait-timeout 240 app
served=$(docker compose exec -T app curl -fsS http://127.0.0.1:1010/app-version.txt)
if [ "$served" != "$IVME_REVISION" ]; then
    echo "Expected $IVME_REVISION, found $served." >&2
    exit 1
fi
printf 'Ivme %s is ready.\n' "$served"
