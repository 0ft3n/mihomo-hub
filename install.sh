#!/usr/bin/env bash
set -Eeuo pipefail
INSTALL_DIR="${MIHOMO_HUB_DIR:-/opt/mihomo-hub}"
REPO_URL="${MIHOMO_HUB_REPO:-https://github.com/your-org/mihomo-hub.git}"
say(){ printf '\033[1;36m[Mihomo Hub]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31mОшибка:\033[0m %s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "Запустите скрипт через sudo."
if ! command -v docker >/dev/null; then
  say "Устанавливаю Docker Engine..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker compose version >/dev/null 2>&1 || die "Требуется Docker Compose v2."
if [[ ! -d "$INSTALL_DIR/.git" ]]; then
  command -v git >/dev/null || { apt-get update; apt-get install -y git; }
  say "Загружаю приложение в $INSTALL_DIR..."
  git clone "$REPO_URL" "$INSTALL_DIR"
else
  say "Обновляю существующую установку..."
  git -C "$INSTALL_DIR" pull --ff-only
fi
cd "$INSTALL_DIR"
if [[ ! -f .env ]]; then
  read -rp "Публичный URL (например https://vpn.example.com): " PUBLIC_URL
  read -rp "HTTP-порт [8080]: " HTTP_PORT; HTTP_PORT="${HTTP_PORT:-8080}"
  read -rsp "Пароль администратора: " ADMIN_PASSWORD; echo
  [[ -n "$ADMIN_PASSWORD" ]] || die "Пароль администратора не может быть пустым."
  umask 077
  cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 48)
ADMIN_PASSWORD=$ADMIN_PASSWORD
PUBLIC_URL=${PUBLIC_URL%/}
HTTP_PORT=$HTTP_PORT
EOF
fi
say "Собираю и запускаю контейнеры..."
docker compose up -d --build --remove-orphans
say "Готово. Откройте $(grep '^PUBLIC_URL=' .env | cut -d= -f2-)"
say "Команды: cd $INSTALL_DIR && docker compose logs -f | docker compose pull"
