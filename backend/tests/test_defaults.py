from app.main import default_profile_templates
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

