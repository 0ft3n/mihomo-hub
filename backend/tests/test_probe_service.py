from app.probe_service import build_probe_config


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


def test_build_probe_config_creates_one_chain_per_real_source_proxy():
    config, mappings = build_probe_config(SOURCE, {
        "name": "Custom",
        "type": "ss",
        "server": "target.example.com",
        "port": 8388,
        "cipher": "aes-256-gcm",
        "password": "secret",
        "dialer-proxy": "old-value",
    })

    assert len(mappings) == 1
    test_name, candidate_name = mappings[0]
    assert candidate_name == "NL"
    test_proxy = next(item for item in config["proxies"] if item["name"] == test_name)
    assert test_proxy["dialer-proxy"] == "NL"
    assert test_proxy["server"] == "target.example.com"
    assert config["proxy-groups"] == []
