#!/bin/sh
set -eu
umask 077
case "$1" in wrestling) database=wrestling_club ;; arapca) database=arapca ;; prepexpert) database=sat ;; *) exit 2 ;; esac
project=$1
PROJECT_ROOT=/srv/$project
export PROJECT_ROOT
root=$PROJECT_ROOT
exec 9>"$root/release.lock"
flock -w 360 9
RELEASE_SHA=$(cat "$root/current.sha")
export RELEASE_SHA
compose() {
  docker compose -p "$project-production" -f "$root/releases/$RELEASE_SHA/compose.yaml" "$@"
}
daily=$root/backup/daily
mkdir -p "$daily"
slot=$(date -u +%u)
name="$project-$slot.dump"
stage=$(mktemp -d "$daily/.dump-XXXXXXXX")
trap 'rm -f -- "$stage/$name" "$stage/$name.sha256"; rmdir "$stage"' EXIT
compose exec -T db pg_dump -Fc -U postgres -d "$database" --no-owner --no-privileges > "$stage/$name"
compose exec -T db pg_restore --list < "$stage/$name" >/dev/null
(cd "$stage"; sha256sum "$name" > "$name.sha256")
sync -d "$stage/$name" "$stage/$name.sha256"
mv -f "$stage/$name" "$daily/$name"
mv -f "$stage/$name.sha256" "$daily/$name.sha256"
sync -f "$daily"
printf '%s\n' "Verified $project backup."
