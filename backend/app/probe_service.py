import asyncio
from copy import deepcopy
import ipaddress
import json
import logging
import secrets
from urllib.parse import quote

import httpx
import yaml
from fastapi import HTTPException

from .config import settings


_probe_lock = asyncio.Lock()
_MAX_CANDIDATES = 256
_TEST_URL = "https://www.gstatic.com/generate_204"
logger = logging.getLogger("uvicorn.error")


def _best_result(results: list[dict]) -> dict | None:
    """Prefer a working chained route; DIRECT is only the diagnostic fallback."""
    return next(
        (item for item in results if item["status"] == "ok" and item["name"] != "DIRECT"),
        next((item for item in results if item["status"] == "ok"), None),
    )


def _safe_candidate_server(value: object) -> bool:
    server = str(value or "").strip().rstrip(".").lower()
    if not server or server == "localhost":
        return False
    try:
        return ipaddress.ip_address(server.strip("[]")).is_global
    except ValueError:
        return "." in server


def _source_config(source_yaml: str) -> dict:
    try:
        parsed = yaml.safe_load(source_yaml) or {}
    except yaml.YAMLError as exc:
        raise HTTPException(422, "Исходная подписка содержит некорректный YAML") from exc
    if not isinstance(parsed, dict):
        raise HTTPException(422, "Исходная подписка должна содержать YAML-объект")
    return parsed


def build_probe_config(source_yaml: str, target_proxy: dict) -> tuple[dict, list[tuple[str, str]]]:
    source = _source_config(source_yaml)
    source_proxies = source.get("proxies") or []
    if not isinstance(source_proxies, list):
        raise HTTPException(422, "В исходной подписке отсутствует список proxies")

    candidates: list[dict] = []
    seen: set[str] = set()
    for item in source_proxies:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        proxy_type = str(item.get("type") or "").lower()
        if not name or name in seen or proxy_type == "direct":
            continue
        if not _safe_candidate_server(item.get("server")) or not item.get("port"):
            continue
        seen.add(name)
        candidate = deepcopy(item)
        # Каждый исходный узел измеряется напрямую: его собственная старая
        # цепочка не должна влиять на результат или требовать proxy-groups.
        candidate.pop("dialer-proxy", None)
        candidates.append(candidate)
        if len(candidates) >= _MAX_CANDIDATES:
            break
    if not candidates:
        raise HTTPException(422, "В исходной подписке нет прокси-серверов, пригодных для проверки")

    target = deepcopy(target_proxy)
    target_name = str(target.get("name") or "").strip()
    if not target_name or not target.get("type") or not target.get("server") or not target.get("port"):
        raise HTTPException(422, "Сначала укажите название, протокол, сервер и порт добавляемого прокси")
    target.pop("dialer-proxy", None)

    token = secrets.token_hex(5)
    direct_name = f"__hub_probe_{token}_direct"
    direct_test = deepcopy(target)
    direct_test["name"] = direct_name
    mappings: list[tuple[str, str]] = [(direct_name, "DIRECT")]
    tests: list[dict] = [direct_test]
    for index, candidate in enumerate(candidates):
        test_name = f"__hub_probe_{token}_{index}"
        test_proxy = deepcopy(target)
        test_proxy["name"] = test_name
        test_proxy["dialer-proxy"] = candidate["name"]
        tests.append(test_proxy)
        mappings.append((test_name, candidate["name"]))

    config = {
        "log-level": "warning",
        "external-controller": "0.0.0.0:9090",
        "secret": settings.mihomo_probe_secret,
        "proxies": candidates + tests,
        "proxy-groups": [],
        "rules": ["MATCH,DIRECT"],
    }
    return config, mappings


def _error_message(exc: Exception) -> str:
    message = str(exc)
    if isinstance(exc, httpx.HTTPStatusError):
        try:
            message = exc.response.json().get("message") or exc.response.text
        except Exception:
            message = exc.response.text
    return message[:240] or "Проверка не пройдена"


async def _delay(client: httpx.AsyncClient, proxy_name: str, timeout: int) -> int:
    response = await client.get(
        f"/proxies/{quote(proxy_name, safe='')}/delay",
        params={"timeout": timeout, "url": _TEST_URL},
        timeout=timeout / 1000 + 3,
    )
    response.raise_for_status()
    return int(response.json().get("delay"))


async def _measure(client: httpx.AsyncClient, semaphore: asyncio.Semaphore, test_name: str, candidate_name: str, timeout: int) -> dict:
    async with semaphore:
        upstream_delay = None
        if candidate_name != "DIRECT":
            try:
                upstream_delay = await _delay(client, candidate_name, min(timeout, 6000))
            except Exception as exc:
                return {
                    "name": candidate_name,
                    "status": "error",
                    "stage": "upstream",
                    "delay": None,
                    "error": _error_message(exc),
                }
        try:
            delay = await _delay(client, test_name, timeout)
            return {
                "name": candidate_name,
                "status": "ok",
                "stage": "complete",
                "delay": delay,
                "upstream_delay": upstream_delay,
            }
        except Exception as exc:
            return {
                "name": candidate_name,
                "status": "error",
                "stage": "target",
                "delay": None,
                "upstream_delay": upstream_delay,
                "error": _error_message(exc),
            }


async def probe_proxy_routes(source_yaml: str, target_proxy: dict, timeout: int) -> dict:
    serialized = yaml.safe_dump(target_proxy, allow_unicode=True)
    if len(serialized.encode("utf-8")) > 64 * 1024:
        raise HTTPException(413, "Конфигурация прокси слишком большая для проверки")
    config, mappings = build_probe_config(source_yaml, target_proxy)
    headers = {"Authorization": f"Bearer {settings.mihomo_probe_secret}"}
    payload = yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=1000)

    async with _probe_lock:
        async with httpx.AsyncClient(base_url=settings.mihomo_probe_url, headers=headers) as client:
            try:
                reload_response = await client.put(
                    "/configs",
                    params={"force": "true"},
                    json={"path": "", "payload": payload},
                    timeout=15,
                )
                reload_response.raise_for_status()
            except Exception as exc:
                raise HTTPException(503, "Сервис проверки Mihomo недоступен или отклонил конфигурацию прокси") from exc

            semaphore = asyncio.Semaphore(12)
            results = await asyncio.gather(*(
                _measure(client, semaphore, test_name, candidate_name, timeout)
                for test_name, candidate_name in mappings
            ))

    results.sort(key=lambda item: (item["status"] != "ok", item["delay"] if item["delay"] is not None else 10**9, item["name"]))
    best = _best_result(results)
    return {
        "best": best,
        "results": results,
        "tested": len(results),
        "successful": sum(item["status"] == "ok" for item in results),
        "test_url": _TEST_URL,
    }


async def stream_proxy_routes(source_yaml: str, target_proxy: dict, timeout: int):
    """Emit newline-delimited progress events while Mihomo measures every route."""
    try:
        serialized = yaml.safe_dump(target_proxy, allow_unicode=True)
        if len(serialized.encode("utf-8")) > 64 * 1024:
            raise HTTPException(413, "Конфигурация прокси слишком большая для проверки")
        config, mappings = build_probe_config(source_yaml, target_proxy)
    except HTTPException as exc:
        yield json.dumps({"type": "error", "message": str(exc.detail)}, ensure_ascii=False) + "\n"
        return
    payload = yaml.safe_dump(config, allow_unicode=True, sort_keys=False, width=1000)
    headers = {"Authorization": f"Bearer {settings.mihomo_probe_secret}"}
    names = [candidate_name for _, candidate_name in mappings]

    def event(data: dict) -> str:
        return json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"

    logger.info("Starting route probe for %s through %d candidates", target_proxy.get("name"), len(names))
    yield event({"type": "start", "names": names, "tested": len(names)})
    results: list[dict] = []
    tasks: list[asyncio.Task] = []
    try:
        async with _probe_lock:
            async with httpx.AsyncClient(base_url=settings.mihomo_probe_url, headers=headers) as client:
                try:
                    reload_response = await client.put(
                        "/configs",
                        params={"force": "true"},
                        json={"path": "", "payload": payload},
                        timeout=20,
                    )
                    reload_response.raise_for_status()
                except Exception as exc:
                    logger.exception("Mihomo rejected probe configuration")
                    yield event({"type": "error", "message": "Сервис проверки Mihomo недоступен или отклонил конфигурацию прокси"})
                    return

                yield event({"type": "ready"})
                semaphore = asyncio.Semaphore(16)
                tasks = [
                    asyncio.create_task(_measure(client, semaphore, test_name, candidate_name, timeout))
                    for test_name, candidate_name in mappings
                ]
                for completed, task in enumerate(asyncio.as_completed(tasks), start=1):
                    result = await task
                    results.append(result)
                    yield event({"type": "result", "result": result, "completed": completed, "tested": len(names)})
    finally:
        for task in tasks:
            if not task.done():
                task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    results.sort(key=lambda item: (item["status"] != "ok", item["delay"] if item["delay"] is not None else 10**9, item["name"]))
    best = _best_result(results)
    successful = sum(item["status"] == "ok" for item in results)
    direct = next((item for item in results if item["name"] == "DIRECT"), None)
    healthy_upstreams = sum(item.get("stage") != "upstream" for item in results if item["name"] != "DIRECT")
    if best and best["name"] != "DIRECT":
        diagnosis = "Найден рабочий полный маршрут"
    elif direct and direct["status"] == "ok":
        diagnosis = "Целевой сервер работает напрямую, но не отвечает через upstream-прокси"
    elif healthy_upstreams:
        diagnosis = "Промежуточные прокси работают, но целевой сервер не завершает handshake"
    else:
        diagnosis = "Прокси исходной подписки недоступны с сервера Mihomo Hub"
    logger.info("Completed route probe: %d/%d successful, best=%s", successful, len(names), best and best["name"])
    yield event({
        "type": "complete",
        "best": best,
        "tested": len(names),
        "successful": successful,
        "diagnosis": diagnosis,
    })
