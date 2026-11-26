#!/bin/sh
# Remove superseded release artifacts of one project as the deploy account.
# Keeps the running release, the newest images for rollback, waiting candidates and
# every database backup that is recent or among the newest. Images are rebuildable.
set -eu
project=$1
case "$project" in
    ivme) images=ivme-app; dumps='ivme-20*.dump'; keep_dumps=3 ;;
    wrestling) images='wrestling-app wrestling-backend'; dumps='pre-release-*.dump'; keep_dumps=10 ;;
    arapca) images=arapca-app; dumps='pre-release-*.dump'; keep_dumps=10 ;;
    prepexpert) images=prepexpert-app; dumps='pre-release-*.dump'; keep_dumps=10 ;;
    *) exit 2 ;;
esac
keep_images=4
root=/srv/$project
[ -d "$root/tested" ] || exit 0
exec 9>"$root/release.lock"
# A running release or backup owns the folder; the next push prunes instead.
flock -n 9 || { echo "$project: release or backup running, pruning skipped"; exit 0; }

# DRY_RUN=1 lists the removals without performing them.
act() {
    if [ -n "${DRY_RUN:-}" ]; then echo "would run: $*" >&2; else "$@"; fi
}

full_sha() {
    case "$1" in ''|*[!0-9a-f]*) return 1 ;; esac
    [ "${#1}" -eq 40 ]
}

# A candidate is pushed seconds after it is prepared. Failed ones stay for inspection.
for marker in "$root"/tested/*; do
    name=${marker##*/}
    full_sha "$name" && [ ! -e "$marker.failed" ] || continue
    [ -z "$(find "$marker" -mmin +1440)" ] || act rm -f -- "$marker"
done

first=${images%% *}
keep=$(
    cat "$root/current.sha" 2>/dev/null || :
    ls "$root/tested" | sed 's/\.failed$//'
    for tag in $(docker image ls --format '{{.Tag}}' "$first"); do
        full_sha "$tag" && docker image inspect --format "{{.Created}} $tag" "$first:$tag"
    done | sort -r | head -n "$keep_images" | cut -d' ' -f2
)
kept() { printf '%s\n' "$keep" | grep -qx "$1"; }

removed=0
for image in $images; do
    for tag in $(docker image ls --format '{{.Tag}}' "$image"); do
        full_sha "$tag" && ! kept "$tag" || continue
        act docker image rm "$image:$tag" >/dev/null && removed=$((removed + 1)) || :
    done
done

for release in "$root"/releases/*; do
    name=${release##*/}
    [ -d "$release" ] && full_sha "$name" && ! kept "$name" || continue
    if [ "$project" = ivme ]; then
        act git --git-dir="$root/repo.git" worktree remove --force "$release" || echo "$project: kept $release"
    else
        act rm -rf -- "$release"
    fi
done
[ "$project" != ivme ] || act git --git-dir="$root/repo.git" worktree prune

# Pre-release dumps leave only when they are old and outside the newest few.
cd "$root/backup"
ls -t -- $dumps 2>/dev/null | tail -n +$((keep_dumps + 1)) | while read -r dump; do
    [ -z "$(find "$dump" -mtime +30)" ] || act rm -f -- "$dump" "$dump.sha256"
done
printf '%s: kept %s, removed %s image tags\n' "$project" "$(printf '%s\n' "$keep" | sort -u | grep -c .)" "$removed"
