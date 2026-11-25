#!/bin/sh
set -eu

account=${1:-${SUDO_USER:-}}
root=/srv/ivme
if [ "$(id -u)" -ne 0 ] || [ -z "$account" ] || [ "$account" = root ]; then
    echo 'Run this with sudo and an existing non-root SSH account.' >&2
    exit 1
fi
group=$(id -gn "$account")
. /etc/os-release
[ "$ID:$VERSION_ID" = ubuntu:24.04 ] || { echo 'Expected Ubuntu 24.04 LTS.' >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git openssl python3 util-linux
if ! docker compose version >/dev/null 2>&1; then
    install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $VERSION_CODENAME
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker
usermod -aG docker "$account"

install -d -o "$account" -g "$group" -m 0750 "$root"
install -d -o "$account" -g "$group" -m 0700 \
    "$root/config" "$root/releases" "$root/incoming" "$root/backup"
install -d -o "$account" -g "$group" -m 0755 "$root/data"
if [ ! -d "$root/repo.git" ]; then
    runuser -u "$account" -- git init --quiet --bare "$root/repo.git"
    runuser -u "$account" -- git --git-dir="$root/repo.git" remote add origin https://github.com/nkorganci/ivme.git
fi

umask 077
if [ ! -e "$root/config/compose.env" ]; then
    printf '%s\n' 'IVME_DATA_DIR=/srv/ivme/data' 'IVME_HTTP_PORT=1010' 'IVME_JAVA_OPTS=-Xmx4g' \
        > "$root/config/compose.env"
    chown "$account:$group" "$root/config/compose.env"
fi
if [ ! -e "$root/config/db.env" ]; then
    printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" > "$root/config/db.env"
    chown "$account:$group" "$root/config/db.env"
fi
if [ ! -e "$root/config/app.env" ]; then
    printf 'YKS_DB_SIFRE=%s\n' "$(openssl rand -hex 32)" > "$root/config/app.env"
    cat >> "$root/config/app.env" <<'EOF'
YKS_SITE_ADRESI=https://net.ivme.dev
YKS_KAYIT_BILDIRIM_ETKIN=false
YKS_AI_ETKIN=false
YKS_KAYNAK_KLASORU=/app/Kaynaklar
YKS_KAYNAK_YOL_LISTESI=/app/Kaynaklar/Katalog/production-paths.json
EOF
    chown "$account:$group" "$root/config/app.env"
fi
echo 'Ivme VPS prepared. Open a fresh SSH session and verify Docker access.'
