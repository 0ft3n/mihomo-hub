# Mihomo Hub

Self-hosted веб-панель для импорта Clash.Meta/Mihomo-подписок и выпуска отдельных модифицированных ссылок для разных устройств.

## Возможности

- вход по исходной ссылке подписки и восстановление по ключу кабинета;
- несколько upstream-подписок и несколько профилей у каждой;
- правила маршрутизации, GeoData, deep-merge YAML и замена proxy-groups;
- обновление upstream при запросе с fallback на последний валидный YAML;
- случайные публичные URL с возможностью ротации;
- админ-панель и дефолтные модификаторы;
- адаптивная светлая/тёмная тема, PostgreSQL и Docker Compose.

## Запуск

```bash
cp .env.example .env
# заполните секреты и PUBLIC_URL
docker compose up -d --build
```

Откройте `http://localhost:8080`. Для HTTPS разместите Caddy, Traefik или nginx перед портом приложения. Быстрая установка на чистом Debian/Ubuntu:

```bash
curl -fsSL https://raw.githubusercontent.com/0ft3n/mihomo-hub/main/install.sh | sudo bash
```

## Модификаторы

Профиль хранит `rules`, `rules_mode` (`prepend`/`replace`), `geo`, `overrides` и опционально `proxy_groups`. `overrides` рекурсивно объединяется с upstream; `null` удаляет ключ. Секреты upstream никогда не возвращаются в админском списке, но доступны владельцу в просмотре исходного YAML.

## Безопасность

Сервис запрещает upstream на локальные/reserved IP, ограничивает ответ 10 МБ и использует отдельные случайные URL профилей. В production обязательны HTTPS, сильные значения `.env`, firewall и регулярные резервные копии volume `postgres_data`.
