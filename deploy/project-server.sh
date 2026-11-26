#!/bin/sh
set -eu
umask 077
project=$1
revision=$2
operation=$3
case "$project" in wrestling) database=wrestling_club ;; arapca) database=arapca ;; prepexpert) database=sat ;; *) exit 2 ;; esac
case "$revision" in ''|*[!0-9a-f]*) exit 2 ;; esac
[ "${#revision}" -eq 40 ]
PROJECT_ROOT=/srv/$project
export PROJECT_ROOT
root=$PROJECT_ROOT
exec 9>"$root/release.lock"
flock -n 9
release_dir=$root/releases/$revision
[ -s "$release_dir/compose.yaml" ]
compose() (
    RELEASE_SHA=$1
    export RELEASE_SHA
    shift
    docker compose -p "$project-production" -f "$root/releases/$RELEASE_SHA/compose.yaml" "$@"
)
query() {
    compose "$revision" exec -T db psql -X -v ON_ERROR_STOP=1 -U postgres -d "$database" "$@"
}
serve() {
    compose "$1" up -d --no-build --wait --wait-timeout 250
}
if [ "$operation" = restore ]; then
    sha=$4
    case "$sha" in ''|*[!0-9a-f]*) exit 2 ;; esac
    [ "${#sha}" -eq 64 ]
    dump=$root/incoming/$sha.dump
    archived_dump=$root/backup/initial-$sha.dump
    test ! -e "$root/current.sha"
    compose "$revision" up -d --wait db
    if [ -e "$root/restore.sha" ]; then
        [ "$(cat "$root/restore.sha")" = "$sha" ]
    else
        printf '%s  %s\n' "$sha" "$dump" | sha256sum -c --quiet
        tables=$(query -Atq -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
        test "$tables" = 0
        password=$(cat "$root/config/database.password")
        case "$password" in ''|*[!0-9a-f]*) exit 2 ;; esac
        exists=$(query -Atq -c "SELECT 1 FROM pg_roles WHERE rolname='appuser'")
        if [ -z "$exists" ]; then
            printf "CREATE ROLE appuser LOGIN PASSWORD '%s' NOSUPERUSER NOCREATEDB NOCREATEROLE;\n" "$password" | query -q
        fi
        query -c "ALTER DATABASE $database OWNER TO appuser;"
        compose "$revision" exec -T db pg_restore --exit-on-error --single-transaction --no-owner \
            --no-privileges -U appuser -d "$database" < "$dump"
        printf '%s\n' "$sha" > "$root/restore.sha"
        mv "$dump" "$archived_dump"
        (cd "$root/backup"; sha256sum "$(basename "$archived_dump")" > "$(basename "$archived_dump").sha256")
    fi
    if [ "$project" = wrestling ] && [ ! -e "$root/backup/flyway-development-demo-history.csv" ]; then
        # Keep the demo import record with the original dump. Production resolves only production migrations.
        query -q -c "COPY (SELECT * FROM flyway_schema_history WHERE version IS NULL AND script='R__demo_content.sql' AND success) TO STDOUT WITH CSV HEADER" > "$root/backup/flyway-development-demo-history.csv.new"
        query -q -c "DELETE FROM flyway_schema_history WHERE version IS NULL AND script='R__demo_content.sql' AND success;"
        mv "$root/backup/flyway-development-demo-history.csv.new" "$root/backup/flyway-development-demo-history.csv"
    fi
    if [ "$project" = wrestling ] && [ ! -e "$root/rotation-complete" ]; then
        known=$(query -Atq -c "SELECT count(*) FROM users WHERE lower(email)='admin@club.local'")
        if [ "$known" = 1 ]; then
            secret=$(cat "$root/config/first-admin")
            case "$secret" in ''|*[!0-9a-f]*) exit 2 ;; esac
            {
                printf 'BEGIN; CREATE EXTENSION pgcrypto;\n'
                printf "UPDATE users SET password_hash=crypt('%s', gen_salt('bf',12)) WHERE lower(email)='admin@club.local' AND password_hash=crypt('Admin123!',password_hash);\n" "$secret"
                printf 'DROP EXTENSION pgcrypto; COMMIT;\n'
            } | query
        fi
        touch "$root/rotation-complete"
    fi
    exit 0
fi
[ "$operation" = release ] && [ -s "$root/restore.sha" ]
previous=
if [ -r "$root/current.sha" ]; then
    previous=$(cat "$root/current.sha")
fi
if [ -n "$previous" ] && [ "$previous" != "$revision" ]; then
    backup=$root/backup/pre-release-$(date -u +%Y%m%dT%H%M%SZ).dump
    compose "$previous" exec -T db pg_dump -U postgres -d "$database" -Fc --no-owner --no-privileges > "$backup.partial"
    compose "$previous" exec -T db pg_restore --list < "$backup.partial" >/dev/null
    mv "$backup.partial" "$backup"
    (cd "$root/backup"; name=$(basename "$backup"); sha256sum "$name" > "$name.sha256")
fi
if [ "$project" = prepexpert ]; then
    compose "$revision" run --rm -T --entrypoint npm app run db:migrate
fi
if ! serve "$revision"; then
    if [ -n "$previous" ] && [ "$previous" != "$revision" ]; then
        serve "$previous" || true
    fi
    exit 1
fi
printf '%s\n' "$revision" > "$root/current.sha.new"
mv "$root/current.sha.new" "$root/current.sha"
printf '%s %s healthy\n' "$project" "$revision"
