import asyncio
import json

from app.probe_service import build_probe_config, stream_proxy_routes


SOURCE = """
proxies:
  - name: NL
    type: vless
    server: nl.example.com
    port: 443
    uuid: 00000000-0000-0000-0000-000000000000
  - name: Marker
    type: vless
  - name: Без VPN
    type: direct
  - name: Internal
    type: socks5
    server: 127.0.0.1
    port: 1080
proxy-groups:
  - name: Main
    type: select
    proxies: [NL]
"""


def test_build_probe_config_creates_direct_test_and_one_chain_per_real_source_proxy():
    config, mappings = build_probe_config(SOURCE, {
        "name": "Custom",
        "type": "ss",
        "server": "target.example.com",
        "port": 8388,
        "cipher": "aes-256-gcm",
        "password": "secret",
        "dialer-proxy": "old-value",
    })

    assert len(mappings) == 2
    assert [candidate_name for _, candidate_name in mappings] == ["DIRECT", "NL"]
    direct_test_name, _ = mappings[0]
    direct_test = next(item for item in config["proxies"] if item["name"] == direct_test_name)
    assert "dialer-proxy" not in direct_test

    test_name, candidate_name = mappings[1]
    assert candidate_name == "NL"
    test_proxy = next(item for item in config["proxies"] if item["name"] == test_name)
    assert test_proxy["dialer-proxy"] == "NL"
    assert test_proxy["server"] == "target.example.com"
    assert config["proxy-groups"] == []


def test_stream_emits_candidates_and_live_result(monkeypatch):
    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {"delay": 42}

    class Client:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def put(self, *args, **kwargs):
            return Response()

        async def get(self, *args, **kwargs):
            return Response()

    monkeypatch.setattr("app.probe_service.httpx.AsyncClient", Client)

    async def collect():
        return [json.loads(line) async for line in stream_proxy_routes(SOURCE, {
            "name": "Custom",
            "type": "ss",
            "server": "target.example.com",
            "port": 8388,
            "cipher": "aes-256-gcm",
            "password": "secret",
        }, 3000)]

    events = asyncio.run(collect())
    assert [event["type"] for event in events] == ["start", "ready", "result", "result", "complete"]
    assert events[0]["names"] == ["DIRECT", "NL"]
    results = {event["result"]["name"]: event["result"] for event in events if event["type"] == "result"}
    assert results["DIRECT"] == {
        "name": "DIRECT",
        "status": "ok",
        "stage": "complete",
        "delay": 42,
        "upstream_delay": None,
    }
    assert results["NL"] == {
        "name": "NL",
        "status": "ok",
        "stage": "complete",
        "delay": 42,
        "upstream_delay": 42,
    }
    assert events[-1]["best"]["name"] == "NL"
    assert events[-1]["diagnosis"] == "Найден рабочий полный маршрут"
