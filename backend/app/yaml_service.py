from copy import deepcopy
from datetime import datetime, timezone
from typing import Any
import base64
import httpx
import re
import yaml
from fastapi import HTTPException
from urllib.parse import quote, urljoin
from .config import settings
from .security import validate_public_url


FORWARDED_SUBSCRIPTION_HEADERS = (
    "subscription-userinfo",
    "profile-update-interval",
    "profile-web-page-url",
    "profile-title",
)


async def fetch_yaml(url: str) -> tuple[str, dict[str, Any], dict[str, str]]:
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
    headers = {}
    for key in FORWARDED_SUBSCRIPTION_HEADERS:
        value = response.headers.get(key)
        if value:
            headers[key] = value
    return text, data, headers


def deep_merge(target: dict, patch: dict) -> dict:
    for key, value in patch.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_merge(target[key], value)
        elif value is None:
            target.pop(key, None)
        else:
            target[key] = deepcopy(value)
    return target


def rule_set_provider(name: str, behavior: str) -> dict[str, Any]:
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("_") or "rule-set"
    return {
        "type": "http",
        "behavior": behavior,
        "format": "text",
        "url": f"{settings.public_url}/rule-sets/{quote(name, safe='')}.list",
        "path": f"./rule-sets/mihomo-hub-{safe_name}.list",
        "interval": 86400,
    }


def apply_modifications(source: str, mods: dict, custom_rule_sets: list[dict] | None = None) -> str:
    config = yaml.safe_load(source)
    deep_merge(config, mods.get("overrides", {}))
    enabled_rule_sets = [
        item for item in (custom_rule_sets or [])
        if isinstance(item, dict) and item.get("enabled", True) and item.get("name")
    ]
    if enabled_rule_sets:
        providers = config.get("rule-providers", {})
        if not isinstance(providers, dict):
            providers = {}
        for item in enabled_rule_sets:
            providers[item["name"]] = rule_set_provider(item["name"], item.get("behavior", "classical"))
        config["rule-providers"] = providers
    if mods.get("geo"):
        config["geodata-mode"] = mods["geo"].get("mode", True)
        for key in ("geodata-loader", "geo-auto-update", "geo-update-interval", "geox-url"):
            if key in mods["geo"]:
                config[key] = mods["geo"][key]
    custom_rules = [r.strip() for r in mods.get("rules", []) if isinstance(r, str) and r.strip()]
    if custom_rules:
        existing = config.get("rules", [])
        config["rules"] = custom_rules + existing if mods.get("rules_mode", "prepend") == "prepend" else custom_rules
    groups = mods.get("proxy_groups")
    if isinstance(groups, list) and groups:
        config["proxy-groups"] = groups
    custom_proxy_entries = mods.get("custom_proxies", [])
    if isinstance(custom_proxy_entries, list) and custom_proxy_entries:
        proxies = config.get("proxies", [])
        if not isinstance(proxies, list):
            proxies = []
        memberships: dict[str, list[str]] = {}
        for entry in custom_proxy_entries:
            if not isinstance(entry, dict):
                continue
            proxy = entry.get("proxy", entry)
            groups_for_proxy = entry.get("groups", [])
            if not isinstance(proxy, dict) or not proxy.get("name") or not proxy.get("type"):
                continue
            proxy = deepcopy(proxy)
            name = str(proxy["name"])
            proxies = [item for item in proxies if not isinstance(item, dict) or item.get("name") != name]
            proxies.append(proxy)
            if isinstance(groups_for_proxy, list):
                memberships[name] = [str(group) for group in groups_for_proxy if group]
        config["proxies"] = proxies
        configured_groups = config.get("proxy-groups", [])
        if isinstance(configured_groups, list):
            for group in configured_groups:
                if not isinstance(group, dict) or not group.get("name"):
                    continue
                additions = [name for name, selected in memberships.items() if group["name"] in selected]
                if not additions:
                    continue
                current = group.get("proxies", [])
                if not isinstance(current, list):
                    current = []
                group["proxies"] = list(dict.fromkeys([*current, *additions]))
    return yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=160)


def summarize(data: dict) -> dict:
    proxies = data.get("proxies", [])
    groups = data.get("proxy-groups", [])
    providers = data.get("rule-providers", {})
    return {
        "proxy_count": len(proxies),
        "group_count": len(groups),
        "rule_count": len(data.get("rules", [])),
        "proxy_names": [p.get("name", "Без имени") for p in proxies if isinstance(p, dict)],
        "group_names": [g.get("name", "Без имени") for g in groups if isinstance(g, dict)],
        "rule_provider_names": list(providers) if isinstance(providers, dict) else [],
        "proxy_types": sorted({p.get("type", "unknown") for p in proxies if isinstance(p, dict)}),
    }


def subscription_meta(data: dict, headers: dict[str, str], previous: dict | None = None) -> dict:
    result = summarize(data)
    forwarded = {key: value for key, value in headers.items() if value}
    if not forwarded and previous:
        forwarded = previous.get("response_headers", {})
    result["response_headers"] = forwarded
    title = forwarded.get("profile-title", "").strip()
    if title.lower().startswith("base64:"):
        try:
            title = base64.b64decode(title[7:] + "===").decode("utf-8").strip()
        except (ValueError, UnicodeDecodeError):
            title = ""
    if title:
        result["provider_name"] = title[:160]
    elif previous and previous.get("provider_name"):
        result["provider_name"] = previous["provider_name"]
    if previous and previous.get("name_overridden"):
        result["name_overridden"] = True
    raw = forwarded.get("subscription-userinfo", "")
    values: dict[str, int] = {}
    for part in raw.split(";"):
        key, separator, value = part.strip().partition("=")
        if separator and value.strip().isdigit():
            values[key.strip().lower()] = int(value.strip())
    if values:
        upload = values.get("upload", 0)
        download = values.get("download", 0)
        total = values.get("total", 0)
        expire = values.get("expire", 0)
        result["subscription"] = {
            "upload": upload,
            "download": download,
            "used": upload + download,
            "total": total,
            "remaining": max(total - upload - download, 0) if total else None,
            "expire": expire,
            "expire_at": datetime.fromtimestamp(expire, timezone.utc).isoformat() if expire else None,
        }
    elif previous and previous.get("subscription"):
        result["subscription"] = previous["subscription"]
    return result
