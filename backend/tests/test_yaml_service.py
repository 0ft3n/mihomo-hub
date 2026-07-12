import yaml
from app.yaml_service import apply_modifications, deep_merge, summarize

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
