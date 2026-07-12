#!/usr/bin/env bash
set -Eeuo pipefail
INSTALL_DIR="${MIHOMO_HUB_DIR:-/opt/mihomo-hub}"
REPO_URL="${MIHOMO_HUB_REPO:-https://github.com/0ft3n/mihomo-hub.git}"
say(){ printf '\033[1;36m[Mihomo Hub]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31mОшибка:\033[0m %s\n' "$*" >&2; exit 1; }
[[ $EUID -eq 0 ]] || die "Запустите скрипт через sudo."
wait_for_apt() {
  while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1; do
    say "Ожидаю завершения системного обновления..."
    sleep 10
  done
}
if ! command -v docker >/dev/null; then
  wait_for_apt
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
  [[ -r /dev/tty ]] || die "Для первой установки требуется интерактивный терминал."
  read -rp "Домен без https:// (например vpn.example.com): " DOMAIN </dev/tty
  DOMAIN="${DOMAIN,,}"; DOMAIN="${DOMAIN%.}"
  [[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$ ]] || die "Укажите корректное доменное имя без протокола и пути."
  read -rsp "Пароль администратора: " ADMIN_PASSWORD </dev/tty; echo >/dev/tty
  [[ -n "$ADMIN_PASSWORD" ]] || die "Пароль администратора не может быть пустым."
  [[ "$ADMIN_PASSWORD" =~ ^[A-Za-z0-9_@%+=:,\.\!\-]{8,}$ ]] || die "Пароль: минимум 8 символов; допустимы латиница, цифры и _@%+=:,.!-"
  umask 077
  cat > .env <<EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 48)
ADMIN_PASSWORD=$ADMIN_PASSWORD
DOMAIN=$DOMAIN
PUBLIC_URL=https://$DOMAIN
EOF
fi
# Миграция установок, созданных до появления встроенного HTTPS.
if ! grep -q '^DOMAIN=' .env; then
  DOMAIN="$(sed -nE 's#^PUBLIC_URL=https?://([^/:]+).*#\1#p' .env | head -n1)"
  [[ -n "$DOMAIN" ]] || die "Не удалось определить домен из PUBLIC_URL в .env."
  printf '\nDOMAIN=%s\n' "$DOMAIN" >> .env
fi
DOMAIN="$(grep '^DOMAIN=' .env | tail -n1 | cut -d= -f2-)"
[[ "$DOMAIN" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$ ]] || die "Некорректный DOMAIN в .env."
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then
  say "Открываю HTTP/HTTPS в UFW..."
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw allow 443/udp >/dev/null
fi
if [[ -z "$(docker compose ps -q caddy 2>/dev/null)" ]]; then
  for port in 80 443; do
    if command -v ss >/dev/null && ss -H -ltn "sport = :$port" 2>/dev/null | grep -q .; then
      die "Порт $port уже занят. Освободите его перед запуском встроенного HTTPS."
    fi
  done
fi
say "Собираю и запускаю контейнеры..."
docker compose up -d --build --remove-orphans
say "Готово. Caddy автоматически получает TLS-сертификат для $DOMAIN."
say "Откройте https://$DOMAIN (DNS должен указывать на этот сервер, порты 80/443 должны быть доступны)."
say "Логи: cd $INSTALL_DIR && docker compose logs -f"
say "Обновление: cd $INSTALL_DIR && git pull --ff-only && docker compose up -d --build"
