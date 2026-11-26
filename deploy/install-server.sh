#!/bin/sh
# Install the tested-release and backup automation after bootstrap-ubuntu.sh.
# Run as root from a copy of this deploy directory: sudo sh install-server.sh
# Timers start only for projects whose /srv/<project> directory exists.
set -eu
[ "$(id -u)" = 0 ] || { echo "Run as root." >&2; exit 1; }
here=$(cd "$(dirname "$0")" && pwd)
install -d -m 0755 /opt/ivme-release /usr/local/libexec
for file in vps.sh project-server.sh reconcile-release.sh; do
    install -m 0644 "$here/$file" "/opt/ivme-release/$file"
done
install -m 0755 "$here/ivme-db-backup.sh" /usr/local/libexec/ivme-db-backup
install -m 0755 "$here/project-backup.sh" /usr/local/libexec/ivme-project-backup
for unit in tested-release@.service tested-release@.timer ivme-db-backup.service \
        ivme-db-backup.timer ivme-project-backup@.service ivme-project-backup@.timer; do
    install -m 0644 "$here/$unit" "/etc/systemd/system/$unit"
done
systemctl daemon-reload
for project in ivme wrestling arapca prepexpert; do
    [ -d "/srv/$project" ] || continue
    systemctl enable --now "tested-release@$project.timer"
    if [ "$project" = ivme ]; then
        systemctl enable --now ivme-db-backup.timer
    else
        systemctl enable --now "ivme-project-backup@$project.timer"
    fi
done
echo "Installed release and backup automation."
