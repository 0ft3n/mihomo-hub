# Mihomo Hub

Self-hosted веб-панель для импорта Clash.Meta/Mihomo-подписок и выпуска отдельных модифицированных ссылок для разных устройств.

## Возможности

- вход по исходной ссылке подписки и восстановление по ключу кабинета;
- несколько upstream-подписок и несколько профилей у каждой;
- правила маршрутизации, GeoData, deep-merge YAML и замена proxy-groups;
- собственные VLESS, Trojan, Shadowsocks, Hysteria2 и VMess-серверы внутри отдельных профилей;
- обновление upstream при запросе с fallback на последний валидный YAML;
- случайные публичные URL с возможностью ротации;
- админ-панель и настраиваемые шаблоны профилей для новых подписок;
- адаптивная светлая/тёмная тема, PostgreSQL и Docker Compose.

## Запуск

```bash
cp .env.example .env
# заполните секреты и PUBLIC_URL
docker compose up -d --build
```

Установщик для Debian/Ubuntu ставит Docker, запрашивает домен, запускает приложение и настраивает автоматический HTTPS через Caddy. До запуска направьте A/AAAA-запись домена на сервер и откройте входящие порты 80 и 443:

```bash
curl -fsSL https://raw.githubusercontent.com/0ft3n/mihomo-hub/main/install.sh | sudo bash
```

## Модификаторы

Профиль хранит `rules`, `rules_mode` (`prepend`/`replace`), `geo`, `overrides`, `custom_proxies` и опционально `proxy_groups`. `overrides` рекурсивно объединяется с upstream; `null` удаляет ключ. Собственные прокси можно заполнить через конструктор, импортировать из `vless://`, `trojan://` или `hysteria2://` ссылки либо отредактировать как YAML. Секреты upstream доступны владельцу подписки и администратору при управлении ею.

## Безопасность

Сервис запрещает upstream на локальные/reserved IP, ограничивает ответ 10 МБ и использует отдельные случайные URL профилей. В production обязательны HTTPS, сильные значения `.env`, firewall и регулярные резервные копии volume `postgres_data`.
