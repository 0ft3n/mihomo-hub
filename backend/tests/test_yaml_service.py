import yaml
from app.yaml_service import apply_modifications, deep_merge, render_rule_set, summarize, subscription_meta

SOURCE = """proxies:\n  - name: NL\n    type: vless\nproxy-groups:\n  - name: Main\n    type: select\n    proxies: [NL]\nrule-providers:\n  blocked:\n    type: http\nrules:\n  - MATCH,DIRECT\ndns:\n  enable: true\n"""

def test_deep_merge_and_remove():
    result = deep_merge({"a": {"b": 1, "c": 2}}, {"a": {"b": 3, "c": None}})
    assert result == {"a": {"b": 3}}

def test_apply_modifications():
    out = yaml.safe_load(apply_modifications(SOURCE, {"rules": ["DOMAIN,x.test,NL"], "overrides": {"dns": {"ipv6": False}}}))
    assert out["rules"][0] == "DOMAIN,x.test,NL"
    assert out["dns"] == {"enable": True, "ipv6": False}

def test_apply_modifications_adds_custom_rule_sets():
    out = yaml.safe_load(apply_modifications(
        SOURCE,
        {"rules": ["RULE-SET,myset,Main"]},
        [{"name": "myset", "behavior": "domain", "payload": "example.com", "enabled": True}],
    ))
    assert out["rule-providers"]["myset"]["type"] == "http"
    assert out["rule-providers"]["myset"]["behavior"] == "domain"
    assert out["rule-providers"]["myset"]["format"] == "yaml"
    assert out["rule-providers"]["myset"]["url"].endswith("/rule-sets/myset.list")
    assert out["rule-providers"]["myset"]["path"].endswith("mihomo-hub-myset.yaml")

def test_render_rule_set_accepts_list_or_plain_lines():
    expected = ["DOMAIN-KEYWORD,spacecore", "IP-CIDR,37.27.195.94/32,no-resolve"]
    rendered_list = render_rule_set("- DOMAIN-KEYWORD,spacecore\n- IP-CIDR,37.27.195.94/32,no-resolve")
    rendered_text = render_rule_set("DOMAIN-KEYWORD,spacecore\nIP-CIDR,37.27.195.94/32,no-resolve")
    assert yaml.safe_load(rendered_list) == {"payload": expected}
    assert yaml.safe_load(rendered_text) == {"payload": expected}

def test_apply_modifications_adds_custom_proxies_and_group_membership():
    out = yaml.safe_load(apply_modifications(SOURCE, {
        "custom_proxies": [{
            "proxy": {
                "name": "My Reality",
                "type": "vless",
                "server": "vpn.example.com",
                "port": 443,
                "uuid": "00000000-0000-0000-0000-000000000000",
                "dialer-proxy": "NL",
            },
            "groups": ["Main"],
        }],
    }))
    assert [proxy["name"] for proxy in out["proxies"]] == ["NL", "My Reality"]
    assert out["proxies"][1]["dialer-proxy"] == "NL"
    assert out["proxy-groups"][0]["proxies"] == ["NL", "My Reality"]

def test_custom_proxy_replaces_same_named_upstream_proxy():
    out = yaml.safe_load(apply_modifications(SOURCE, {
        "custom_proxies": [{"proxy": {"name": "NL", "type": "direct"}, "groups": []}],
    }))
    assert [proxy for proxy in out["proxies"] if proxy["name"] == "NL"] == [{"name": "NL", "type": "direct"}]

def test_summary():
    summary = summarize(yaml.safe_load(SOURCE))
    assert summary["proxy_names"] == ["NL"]
    assert summary["group_names"] == ["Main"]
    assert summary["rule_provider_names"] == ["blocked"]

def test_subscription_meta():
    meta = subscription_meta(yaml.safe_load(SOURCE), {
        "subscription-userinfo": "upload=10; download=20; total=100; expire=1893456000",
        "profile-title": "base64:8J+agE92ZXJTZWN1cmUgVlBOKDRHKQ==",
    })
    assert meta["subscription"]["used"] == 30
    assert meta["subscription"]["remaining"] == 70
    assert meta["subscription"]["expire_at"].startswith("2030-01-01")
    assert meta["provider_name"] == "🚀OverSecure VPN(4G)"
