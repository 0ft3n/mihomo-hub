import yaml
from app.yaml_service import apply_modifications, deep_merge, summarize, subscription_meta

SOURCE = """proxies:\n  - name: NL\n    type: vless\nproxy-groups: []\nrules:\n  - MATCH,DIRECT\ndns:\n  enable: true\n"""

def test_deep_merge_and_remove():
    result = deep_merge({"a": {"b": 1, "c": 2}}, {"a": {"b": 3, "c": None}})
    assert result == {"a": {"b": 3}}

def test_apply_modifications():
    out = yaml.safe_load(apply_modifications(SOURCE, {"rules": ["DOMAIN,x.test,NL"], "overrides": {"dns": {"ipv6": False}}}))
    assert out["rules"][0] == "DOMAIN,x.test,NL"
    assert out["dns"] == {"enable": True, "ipv6": False}

def test_summary():
    assert summarize(yaml.safe_load(SOURCE))["proxy_names"] == ["NL"]

def test_subscription_meta():
    meta = subscription_meta(yaml.safe_load(SOURCE), {
        "subscription-userinfo": "upload=10; download=20; total=100; expire=1893456000",
        "profile-title": "base64:8J+agE92ZXJTZWN1cmUgVlBOKDRHKQ==",
    })
    assert meta["subscription"]["used"] == 30
    assert meta["subscription"]["remaining"] == 70
    assert meta["subscription"]["expire_at"].startswith("2030-01-01")
    assert meta["provider_name"] == "🚀OverSecure VPN(4G)"
