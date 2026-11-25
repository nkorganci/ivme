#!/bin/sh
set -eu
umask 077

root=${IVME_VPS_ROOT:-/srv/ivme}
repo=$root/repo.git
ref=refs/remotes/origin/production
operation=${1:-check}
revision=${2:-}

fail() {
    printf '%s\n' "$*" >&2
    exit 1
}

valid_hash() {
    case "$1" in ""|*[!0-9a-f]*) return 1 ;; esac
    [ "${#1}" -eq "$2" ]
}

compose() (
    IVME_REVISION=$1
    export IVME_REVISION
    shift
    docker compose --project-name ivme-production --env-file "$root/config/compose.env" \
        --file "$root/releases/$IVME_REVISION/deploy/compose.yaml" "$@"
)

fetch_revision() {
    git --git-dir="$repo" fetch --quiet origin "refs/heads/production:$ref"
    tip=$(git --git-dir="$repo" rev-parse "$ref")
    [ "$tip" = "$revision" ] || fail "GitHub production changed. Run the local release again."
    release=$root/releases/$revision
    if [ ! -d "$release" ]; then
        git --git-dir="$repo" worktree add --quiet --detach "$release" "$revision"
    fi
    ln -sfn "$root/config/app.env" "$release/deploy/app.env"
    ln -sfn "$root/config/db.env" "$release/deploy/db.env"
}

configure_role() {
    compose "$revision" exec -T db psql -X -U ivme_owner -d ivme -f - \
        < "$release/deploy/app-role.sql"
}

serve() {
    compose "$1" up -d --no-build --pull never --wait --wait-timeout 240 app || return 1
    served=$(compose "$1" exec -T app curl -fsS http://127.0.0.1:1010/app-version.txt) || return 1
    [ "$served" = "$1" ]
}

[ -d "$repo" ] && [ -r "$root/config/compose.env" ] && [ -r "$root/config/db.env" ] \
    && [ -r "$root/config/app.env" ] || fail "Run bootstrap-ubuntu.sh on this VPS first."
docker info --format 'Docker server {{.ServerVersion}} ({{.OSType}}/{{.Architecture}})'
docker compose version
[ "$operation" != check ] || exit 0
valid_hash "$revision" 40 || fail "Expected a full Git SHA."
exec 9>"$root/release.lock"
flock -n 9 || fail "An Ivme release or restore is already running."
fetch_revision

case "$operation" in
    restore)
        sha=${3:-}
        valid_hash "$sha" 64 || fail "Expected the dump SHA-256."
        [ ! -e "$root/current.sha" ] || fail "Restore requires a new production database."
        if [ ! -f "$root/restore.sha" ]; then
            dump=$root/incoming/$sha.dump
            printf '%s  %s\n' "$sha" "$dump" | sha256sum -c --quiet
            compose "$revision" up -d --wait db
            tables=$(compose "$revision" exec -T db psql -X -U ivme_owner -d ivme -Atqc \
                "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")
            [ "$tables" = 0 ] || fail "The target already has application tables."
            compose "$revision" exec -T db pg_restore -U ivme_owner -d ivme \
                --exit-on-error --single-transaction --no-owner --no-privileges < "$dump"
            printf '%s\n' "$sha" > "$root/restore.sha"
            mv "$dump" "$root/backup/initial-$sha.dump"
        fi
        [ "$(cat "$root/restore.sha")" = "$sha" ] || fail "A different dump was previously restored."
        compose "$revision" run -T --rm -e 'IVME_FLYWAY_IGNORE=*:pending' migrate validate
        configure_role
        password=$(sed -n 's/^YKS_DB_SIFRE=//p' "$root/config/app.env")
        valid_hash "$password" 64 || fail "Expected the bootstrapped app password format."
        printf "ALTER ROLE ivme_app LOGIN PASSWORD '%s';\n" "$password" |
            compose "$revision" exec -T db psql -X -U ivme_owner -d ivme -v ON_ERROR_STOP=1
        exit 0
        ;;
    release) ;;
    *) fail "Unknown operation." ;;
esac

docker image inspect "ivme-app:$revision" >/dev/null
[ -n "$(compose "$revision" ps --status running -q db)" ] || fail "Restore and start the production database first."
[ -s "$root/data/Kaynaklar/Katalog/production-paths.json" ] || fail "Upload and verify the media first."
[ -d "$root/data/uygulama/veri/resimler-pilot" ] || fail "The question images are missing."
[ "$(compose "$revision" exec -T db psql -X -U ivme_owner -d ivme -Atqc \
    "SELECT to_regclass('public.flyway_schema_history') IS NOT NULL")" = t ] ||
    fail "There is no production Flyway history. Restore the database first."

compose "$revision" run -T --rm -e 'IVME_FLYWAY_IGNORE=*:pending' migrate validate
info=$(compose "$revision" run -T --rm migrate info -outputType=json)
pending=$(printf '%s' "$info" | python3 -c \
    'import json, sys; print(sum(m["state"] == "Pending" for m in json.load(sys.stdin)["migrations"]))')
previous=
if [ -s "$root/current.sha" ]; then
    previous=$(cat "$root/current.sha")
    valid_hash "$previous" 40 || fail "Invalid previous release record."
fi
switch_started=0
recover() {
    code=$?
    if [ "$code" -ne 0 ] && [ "$switch_started" = 1 ] && [ -n "$previous" ]; then
        if docker image inspect "ivme-app:$previous" >/dev/null 2>&1 &&
            compose "$previous" run -T --rm migrate validate && serve "$previous"; then
            printf 'Restored application release %s.\n' "$previous" >&2
        else
            compose "$revision" stop app || :
            printf 'Manual recovery needed. Database and backup are preserved in place.\n' >&2
        fi
    elif [ "$code" -ne 0 ] && [ "$switch_started" = 1 ]; then
        compose "$revision" stop app || :
    fi
    exit "$code"
}
trap recover EXIT

if [ "$pending" -gt 0 ]; then
    backup=$root/backup/ivme-$(date -u +%Y%m%dT%H%M%SZ)-$revision.dump
    switch_started=1
    compose "$revision" stop app
    compose "$revision" exec -T db pg_dump -U ivme_owner -d ivme -Fc --compress=zstd:3 > "$backup.partial"
    compose "$revision" exec -T db pg_restore --list < "$backup.partial" >/dev/null
    (cd "$root/backup"; sha256sum "$(basename "$backup").partial" |
        sed 's/\.partial$//' > "$(basename "$backup").sha256")
    mv "$backup.partial" "$backup"
    compose "$revision" run -T --rm migrate migrate
    configure_role
fi
compose "$revision" run -T --rm migrate validate
switch_started=1
serve "$revision" || fail "Application readiness or version check failed."
printf '%s\n' "$revision" > "$root/current.sha.new"
mv "$root/current.sha.new" "$root/current.sha"
switch_started=0
printf 'Ivme %s passed readiness and release verification.\n' "$revision"
