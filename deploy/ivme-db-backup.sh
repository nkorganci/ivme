#!/bin/sh
set -eu
umask 077
root=/srv/ivme
exec 9>"$root/release.lock"
flock -w 600 9
revision=$(cat "$root/current.sha")
case "$revision" in ""|*[!0-9a-f]*) exit 1 ;; esac
[ "${#revision}" -eq 40 ]
export IVME_REVISION="$revision"
compose() {
    docker compose --project-name ivme-production --env-file "$root/config/compose.env" \
        --file "$root/releases/$revision/deploy/compose.yaml" "$@"
}
daily="$root/backup/daily"
mkdir -p "$daily"
slot=$(date -u +%u)
name="ivme-$slot.dump"
stage=$(mktemp -d "$daily/.backup-XXXXXXXX")
trap 'rm -f -- "$stage/$name" "$stage/$name.sha256"; rmdir "$stage"' EXIT
compose exec -T db pg_dump -U ivme_owner -d ivme --format=custom --compress=zstd:3 --no-owner --no-privileges > "$stage/$name"
compose exec -T db pg_restore --list < "$stage/$name" >/dev/null
(cd "$stage"; sha256sum "$name" > "$name.sha256")
sync -d "$stage/$name" "$stage/$name.sha256"
mv -f -- "$stage/$name" "$daily/$name"
mv -f -- "$stage/$name.sha256" "$daily/$name.sha256"
sync -f "$daily"
printf '%s\n' "Verified backup: $daily/$name"
