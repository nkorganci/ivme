#!/bin/sh
set -eu
project=$1
case "$project" in
  ivme) repo=ivme ;;
  wrestling) repo=wrestling-club ;;
  arapca) repo=Arapca ;;
  prepexpert) repo=PrepExpert ;;
  *) exit 2 ;;
esac
root=/srv/$project
# Idle projects need no network request.
set -- "$root"/tested/*
[ -f "$1" ] || exit 0
if [ "$project" = ivme ]; then
    url=https://github.com/nkorganci/ivme.git
else
    export GIT_SSH_COMMAND="ssh -o BatchMode=yes -o StrictHostKeyChecking=yes -o IdentitiesOnly=yes -i $HOME/.ssh/release-$project"
    url=git@github.com:nkorganci/$repo.git
fi
row=$(git ls-remote --exit-code "$url" refs/heads/production)
revision=${row%%[[:space:]]*}
case "$revision" in ''|*[!0-9a-f]*) exit 2 ;; esac
[ "${#revision}" = 40 ]
[ -f "$root/tested/$revision" ] || exit 0
if [ "$(cat "$root/current.sha")" != "$revision" ]; then
    if [ "$project" = ivme ]; then
        sh /opt/ivme-release/vps.sh release "$revision"
    else
        sh /opt/ivme-release/project-server.sh "$project" "$revision" release
    fi
fi
rm -f "$root/tested/$revision"
