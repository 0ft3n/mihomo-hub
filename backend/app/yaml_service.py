from copy import deepcopy
from typing import Any
import httpx
import yaml
from fastapi import HTTPException
from urllib.parse import urljoin
from .config import settings
from .security import validate_public_url


async def fetch_yaml(url: str) -> tuple[str, dict[str, Any]]:
    current = url
    async with httpx.AsyncClient(follow_redirects=False, timeout=settings.fetch_timeout) as client:
        for _ in range(6):
            validate_public_url(current)
            try:
                response = await client.get(current, headers={"User-Agent": "MihomoHub/1.0"})
            except httpx.HTTPError as exc:
                raise HTTPException(502, "Не удалось загрузить исходную подписку") from exc
            if response.is_redirect:
                location = response.headers.get("location")
                if not location:
                    raise HTTPException(502, "Источник вернул пустое перенаправление")
                current = urljoin(current, location)
                continue
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise HTTPException(502, f"Источник подписки ответил HTTP {response.status_code}") from exc
            break
        else:
            raise HTTPException(502, "Слишком много перенаправлений источника")
        if len(response.content) > 10 * 1024 * 1024:
            raise HTTPException(413, "Конфигурация слишком велика")
        text = response.text
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        raise HTTPException(422, "Источник вернул некорректный YAML") from exc
    if not isinstance(data, dict) or not isinstance(data.get("proxies"), list):
        raise HTTPException(422, "Это не конфигурация Clash/Mihomo: отсутствует proxies")
    return text, data


def deep_merge(target: dict, patch: dict) -> dict:
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_merge(target[key], value)
        elif value is None:
            target.pop(key, None)
        else:
            target[key] = deepcopy(value)
    return target


def apply_modifications(source: str, mods: dict) -> str:
    config = yaml.safe_load(source)
    deep_merge(config, mods.get("overrides", {}))
    if mods.get("geo"):
        config["geodata-mode"] = mods["geo"].get("mode", True)
        for key in ("geo-auto-update", "geo-update-interval", "geox-url"):
            if key in mods["geo"]:
                config[key] = mods["geo"][key]
    custom_rules = [r.strip() for r in mods.get("rules", []) if isinstance(r, str) and r.strip()]
    if custom_rules:
        existing = config.get("rules", [])
        config["rules"] = custom_rules + existing if mods.get("rules_mode", "prepend") == "prepend" else custom_rules
    groups = mods.get("proxy_groups")
    if isinstance(groups, list) and groups:
        config["proxy-groups"] = groups
    return yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=160)


def summarize(data: dict) -> dict:
    proxies = data.get("proxies", [])
    return {
        "proxy_count": len(proxies),
        "group_count": len(data.get("proxy-groups", [])),
        "rule_count": len(data.get("rules", [])),
        "proxy_names": [p.get("name", "Без имени") for p in proxies if isinstance(p, dict)],
        "proxy_types": sorted({p.get("type", "unknown") for p in proxies if isinstance(p, dict)}),
    }
