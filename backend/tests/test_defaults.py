from app.main import custom_rule_sets, default_profile_templates, save_setting_section
from app.models import Setting


def test_legacy_defaults_become_one_profile():
    setting = Setting(default_modifications={"rules": ["MATCH,DIRECT"], "overrides": {}})

    assert default_profile_templates(setting) == [{
        "name": "Основной профиль",
        "modifications": {"rules": ["MATCH,DIRECT"], "overrides": {}},
        "enabled": True,
    }]


def test_multiple_default_profiles_are_preserved():
    profiles = [
        {"name": "Телефон", "modifications": {"rules": []}, "enabled": True},
        {"name": "ПК", "modifications": {"geo": {"mode": True}}, "enabled": True},
    ]
    setting = Setting(default_modifications={"profile_templates": profiles})

    assert default_profile_templates(setting) == profiles


def test_setting_sections_are_preserved():
    rule_sets = [{"name": "ai", "behavior": "domain", "payload": "openai.com", "enabled": True}]
    setting = Setting(default_modifications={"custom_rule_sets": rule_sets})

    save_setting_section(setting, "profile_templates", [
        {"name": "ПК", "modifications": {"rules": []}, "enabled": True},
    ])

    assert custom_rule_sets(setting) == rule_sets
    assert default_profile_templates(setting)[0]["name"] == "ПК"
