from datetime import datetime, timezone
import base64
from copy import deepcopy
import secrets
import re
import yaml
from urllib.parse import quote, unquote, urlparse
from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from .config import settings
from .database import Base, engine, get_db
from .models import Account, Profile, Setting, Subscription
from .schemas import CustomRuleSet, DefaultProfileTemplate, ImportRequest, LoginRequest, ProfileIn, ProfileUpdate, SubscriptionUpdate
from .security import current_account_id, make_session, require_admin
from .yaml_service import apply_modifications, fetch_yaml, subscription_meta

app = FastAPI(title="Mihomo Hub", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def name_from_url(url: str) -> str:
    """Use the provider's opaque subscription id without exposing its domain."""
    value = unquote(urlparse(url).path.rstrip("/").split("/")[-1]).strip()
    return value[:160] if value else (urlparse(url).hostname or "Подписка")[:160]


@app.on_event("startup")
def startup():
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        if not db.get(Setting, 1):
            db.add(Setting(id=1, default_modifications={"rules": [], "overrides": {}}))
        for sub in db.scalars(select(Subscription)).all():
            if re.fullmatch(r"Подписка \d+ узлов", sub.name):
                sub.name = name_from_url(sub.source_url)
        db.commit()


def serialize_profile(p: Profile):
    return {"id": p.id, "name": p.name, "slug": p.slug, "enabled": p.enabled,
            "modifications": p.modifications, "url": f"{settings.public_url}/sub/{p.slug}"}


def serialize_subscription(s: Subscription, include_yaml=False):
    result = {"id": s.id, "name": s.name, "source_url": s.source_url, "enabled": s.enabled,
              "source_meta": s.source_meta, "created_at": s.created_at, "profiles": [serialize_profile(p) for p in s.profiles]}
    if include_yaml:
        result["yaml"] = s.cached_yaml
    return result


def default_profile_templates(setting: Setting) -> list[dict]:
    """Read the new multi-profile format while preserving old installations."""
    stored = setting.default_modifications or {}
    templates = stored.get("profile_templates") if isinstance(stored, dict) else None
    if isinstance(templates, list) and templates:
        return deepcopy(templates)
    return [{"name": "Основной профиль", "modifications": deepcopy(stored), "enabled": True}]


def custom_rule_sets(setting: Setting) -> list[dict]:
    stored = setting.default_modifications or {}
    rule_sets = stored.get("custom_rule_sets") if isinstance(stored, dict) else None
    return deepcopy(rule_sets) if isinstance(rule_sets, list) else []


def save_setting_section(setting: Setting, key: str, value):
    stored = setting.default_modifications or {}
    if not isinstance(stored, dict):
        stored = {}
    setting.default_modifications = {**stored, key: value}


def add_default_profiles(db: Session, subscription_id: int):
    for template in default_profile_templates(db.get(Setting, 1)):
        db.add(Profile(
            subscription_id=subscription_id,
            name=template.get("name") or "Основной профиль",
            modifications=deepcopy(template.get("modifications") or {}),
            enabled=template.get("enabled", True),
        ))


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/auth/import")
async def initial_import(body: ImportRequest, db: Session = Depends(get_db)):
    url = str(body.url)
    existing = db.scalar(select(Subscription).where(Subscription.source_url == url))
    if existing:
        return {"token": make_session(existing.account_id), "account_key": existing.account.access_token}
    raw, parsed, headers = await fetch_yaml(url)
    meta = subscription_meta(parsed, headers)
    account = Account()
    db.add(account)
    db.flush()
    sub = Subscription(account_id=account.id, source_url=url, name=meta.get("provider_name") or name_from_url(url),
                       cached_yaml=raw, source_meta=meta)
    db.add(sub)
    db.flush()
    add_default_profiles(db, sub.id)
    db.commit()
    return {"token": make_session(account.id), "account_key": account.access_token}


@app.post("/api/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    sub = db.scalar(select(Subscription).where(Subscription.source_url == str(body.source_url)))
    if not sub:
        raise HTTPException(404, "Подписка ещё не зарегистрирована")
    return {"token": make_session(sub.account_id), "account_key": sub.account.access_token}


@app.post("/api/auth/key")
def login_key(key: str, db: Session = Depends(get_db)):
    account = db.scalar(select(Account).where(Account.access_token == key))
    if not account:
        raise HTTPException(401, "Ключ доступа недействителен")
    return {"token": make_session(account.id)}


@app.get("/api/subscriptions")
def subscriptions(account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    rows = db.scalars(select(Subscription).where(Subscription.account_id == account_id).order_by(Subscription.id)).all()
    return [serialize_subscription(s) for s in rows]


@app.get("/api/rule-sets")
def list_rule_sets(account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    return [
        {"name": item["name"], "behavior": item.get("behavior", "classical")}
        for item in custom_rule_sets(db.get(Setting, 1))
        if item.get("enabled", True) and item.get("name")
    ]


@app.post("/api/subscriptions")
async def add_subscription(body: ImportRequest, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    url = str(body.url)
    if db.scalar(select(Subscription).where(Subscription.source_url == url)):
        raise HTTPException(409, "Эта подписка уже добавлена")
    raw, parsed, headers = await fetch_yaml(url)
    meta = subscription_meta(parsed, headers)
    sub = Subscription(account_id=account_id, source_url=url, name=meta.get("provider_name") or name_from_url(url),
                       cached_yaml=raw, source_meta=meta)
    db.add(sub); db.flush()
    add_default_profiles(db, sub.id)
    db.commit()
    return serialize_subscription(sub, True)


def owned_subscription(db: Session, sub_id: int, account_id: int):
    sub = db.scalar(select(Subscription).where(Subscription.id == sub_id, Subscription.account_id == account_id))
    if not sub: raise HTTPException(404, "Подписка не найдена")
    return sub


@app.get("/api/subscriptions/{sub_id}")
def subscription(sub_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    return serialize_subscription(owned_subscription(db, sub_id, account_id), True)


@app.patch("/api/subscriptions/{sub_id}")
def update_subscription(sub_id: int, body: SubscriptionUpdate, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    sub = owned_subscription(db, sub_id, account_id)
    changes = body.model_dump(exclude_none=True)
    for key, value in changes.items(): setattr(sub, key, value)
    if "name" in changes:
        sub.source_meta = {**sub.source_meta, "name_overridden": True}
    db.commit(); return serialize_subscription(sub)


@app.delete("/api/subscriptions/{sub_id}", status_code=204)
def delete_subscription(sub_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    sub = owned_subscription(db, sub_id, account_id)
    db.delete(sub)
    db.commit()


@app.post("/api/subscriptions/{sub_id}/reset-name")
def reset_subscription_name(sub_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    sub = owned_subscription(db, sub_id, account_id)
    meta = dict(sub.source_meta)
    meta.pop("name_overridden", None)
    sub.source_meta = meta
    sub.name = meta.get("provider_name") or name_from_url(sub.source_url)
    db.commit()
    return serialize_subscription(sub)


@app.post("/api/subscriptions/{sub_id}/refresh")
async def refresh(sub_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    sub = owned_subscription(db, sub_id, account_id)
    raw, parsed, headers = await fetch_yaml(sub.source_url)
    old_meta = sub.source_meta
    sub.cached_yaml = raw
    sub.source_meta = subscription_meta(parsed, headers, old_meta)
    if not old_meta.get("name_overridden") and sub.source_meta.get("provider_name"):
        sub.name = sub.source_meta["provider_name"]
    sub.updated_at = datetime.now(timezone.utc)
    db.commit(); return serialize_subscription(sub, True)


@app.post("/api/subscriptions/{sub_id}/profiles")
def create_profile(sub_id: int, body: ProfileIn, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    owned_subscription(db, sub_id, account_id)
    p = Profile(subscription_id=sub_id, name=body.name, modifications=body.modifications)
    db.add(p); db.commit(); return serialize_profile(p)


def owned_profile(db: Session, profile_id: int, account_id: int):
    p = db.scalar(select(Profile).join(Subscription).where(Profile.id == profile_id, Subscription.account_id == account_id))
    if not p: raise HTTPException(404, "Профиль не найден")
    return p


@app.patch("/api/profiles/{profile_id}")
def update_profile(profile_id: int, body: ProfileUpdate, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    p = owned_profile(db, profile_id, account_id)
    for key, value in body.model_dump(exclude_none=True).items(): setattr(p, key, value)
    db.commit(); return serialize_profile(p)


@app.delete("/api/profiles/{profile_id}", status_code=204)
def delete_profile(profile_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    p = owned_profile(db, profile_id, account_id); db.delete(p); db.commit()


@app.post("/api/profiles/{profile_id}/rotate")
def rotate_profile(profile_id: int, account_id: int = Depends(current_account_id), db: Session = Depends(get_db)):
    p = owned_profile(db, profile_id, account_id); p.slug = secrets.token_urlsafe(32); db.commit(); return serialize_profile(p)


@app.get("/sub/{slug}")
async def public_subscription(slug: str, db: Session = Depends(get_db)):
    p = db.scalar(select(Profile).join(Subscription).where(Profile.slug == slug, Profile.enabled.is_(True), Subscription.enabled.is_(True)))
    if not p: raise HTTPException(404, "Подписка не найдена или отключена")
    sub = p.subscription
    try:
        raw, parsed, upstream_headers = await fetch_yaml(sub.source_url)
        sub.cached_yaml = raw
        sub.source_meta = subscription_meta(parsed, upstream_headers, sub.source_meta)
        db.commit()
    except Exception:
        raw = sub.cached_yaml
        upstream_headers = sub.source_meta.get("response_headers", {})
    if not raw: raise HTTPException(502, "Источник подписки временно недоступен")
    rendered = apply_modifications(raw, p.modifications, custom_rule_sets(db.get(Setting, 1)))
    safe_filename = re.sub(r"[^A-Za-z0-9._-]+", "_", sub.name).strip("_") or "profile"
    encoded_title = base64.b64encode(sub.name.encode("utf-8")).decode("ascii")
    response_headers = {
        "Content-Disposition": f"inline; filename=\"{safe_filename}.yaml\"; filename*=UTF-8''{quote(sub.name)}.yaml",
        "Profile-Title": f"base64:{encoded_title}",
    }
    for key, value in upstream_headers.items():
        response_headers[key] = value
    response_headers["Profile-Title"] = f"base64:{encoded_title}"
    response_headers.setdefault("profile-update-interval", "24")
    return Response(rendered, media_type="text/yaml; charset=utf-8", headers=response_headers)


@app.get("/rule-sets/{name}.list")
def public_rule_set(name: str, db: Session = Depends(get_db)):
    target = unquote(name)
    for item in custom_rule_sets(db.get(Setting, 1)):
        if item.get("enabled", True) and item.get("name") == target:
            payload = "\n".join(line.strip() for line in (item.get("payload") or "").splitlines() if line.strip() and not line.strip().startswith("#"))
            return Response(payload + ("\n" if payload else ""), media_type="text/plain; charset=utf-8")
    raise HTTPException(404, "Rule set не найден")


@app.get("/api/admin/overview", dependencies=[Depends(require_admin)])
def admin_overview(db: Session = Depends(get_db)):
    rows = db.scalars(select(Subscription).order_by(Subscription.created_at.desc())).all()
    setting = db.get(Setting, 1)
    return {"subscriptions": [serialize_subscription(s, True) for s in rows], "accounts": db.scalar(select(func.count(Account.id))),
            "profiles": db.scalar(select(func.count(Profile.id))), "defaults": setting.default_modifications,
            "default_profiles": default_profile_templates(setting), "custom_rule_sets": custom_rule_sets(setting)}


def admin_subscription(db: Session, sub_id: int):
    sub = db.get(Subscription, sub_id)
    if not sub:
        raise HTTPException(404, "Подписка не найдена")
    return sub


def admin_profile(db: Session, profile_id: int):
    profile = db.get(Profile, profile_id)
    if not profile:
        raise HTTPException(404, "Профиль не найден")
    return profile


@app.get("/api/admin/subscriptions/{sub_id}", dependencies=[Depends(require_admin)])
def admin_get_subscription(sub_id: int, db: Session = Depends(get_db)):
    return serialize_subscription(admin_subscription(db, sub_id), True)


@app.patch("/api/admin/subscriptions/{sub_id}", dependencies=[Depends(require_admin)])
def admin_update_subscription(sub_id: int, body: SubscriptionUpdate, db: Session = Depends(get_db)):
    sub = admin_subscription(db, sub_id)
    changes = body.model_dump(exclude_none=True)
    for key, value in changes.items():
        setattr(sub, key, value)
    if "name" in changes:
        sub.source_meta = {**sub.source_meta, "name_overridden": True}
    db.commit()
    return serialize_subscription(sub)


@app.delete("/api/admin/subscriptions/{sub_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = admin_subscription(db, sub_id)
    db.delete(sub)
    db.commit()


@app.post("/api/admin/subscriptions/{sub_id}/reset-name", dependencies=[Depends(require_admin)])
def admin_reset_subscription_name(sub_id: int, db: Session = Depends(get_db)):
    sub = admin_subscription(db, sub_id)
    meta = dict(sub.source_meta)
    meta.pop("name_overridden", None)
    sub.source_meta = meta
    sub.name = meta.get("provider_name") or name_from_url(sub.source_url)
    db.commit()
    return serialize_subscription(sub)


@app.post("/api/admin/subscriptions/{sub_id}/refresh", dependencies=[Depends(require_admin)])
async def admin_refresh_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = admin_subscription(db, sub_id)
    raw, parsed, headers = await fetch_yaml(sub.source_url)
    old_meta = sub.source_meta
    sub.cached_yaml = raw
    sub.source_meta = subscription_meta(parsed, headers, old_meta)
    if not old_meta.get("name_overridden") and sub.source_meta.get("provider_name"):
        sub.name = sub.source_meta["provider_name"]
    sub.updated_at = datetime.now(timezone.utc)
    db.commit()
    return serialize_subscription(sub, True)


@app.post("/api/admin/subscriptions/{sub_id}/profiles", dependencies=[Depends(require_admin)])
def admin_create_profile(sub_id: int, body: ProfileIn, db: Session = Depends(get_db)):
    admin_subscription(db, sub_id)
    profile = Profile(subscription_id=sub_id, name=body.name, modifications=body.modifications)
    db.add(profile)
    db.commit()
    return serialize_profile(profile)


@app.patch("/api/admin/profiles/{profile_id}", dependencies=[Depends(require_admin)])
def admin_update_profile(profile_id: int, body: ProfileUpdate, db: Session = Depends(get_db)):
    profile = admin_profile(db, profile_id)
    for key, value in body.model_dump(exclude_none=True).items():
        setattr(profile, key, value)
    db.commit()
    return serialize_profile(profile)


@app.delete("/api/admin/profiles/{profile_id}", status_code=204, dependencies=[Depends(require_admin)])
def admin_delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = admin_profile(db, profile_id)
    db.delete(profile)
    db.commit()


@app.post("/api/admin/profiles/{profile_id}/rotate", dependencies=[Depends(require_admin)])
def admin_rotate_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = admin_profile(db, profile_id)
    profile.slug = secrets.token_urlsafe(32)
    db.commit()
    return serialize_profile(profile)


@app.put("/api/admin/defaults", dependencies=[Depends(require_admin)])
def admin_defaults(modifications: dict, db: Session = Depends(get_db)):
    setting = db.get(Setting, 1)
    for item in ("custom_rule_sets", "profile_templates"):
        if item not in modifications and isinstance(setting.default_modifications, dict) and item in setting.default_modifications:
            modifications[item] = setting.default_modifications[item]
    setting.default_modifications = modifications; db.commit()
    return setting.default_modifications


@app.put("/api/admin/default-profiles", dependencies=[Depends(require_admin)])
def admin_default_profiles(templates: list[DefaultProfileTemplate], db: Session = Depends(get_db)):
    if not templates:
        raise HTTPException(422, "Должен остаться хотя бы один профиль по умолчанию")
    setting = db.get(Setting, 1)
    saved = [template.model_dump() for template in templates]
    save_setting_section(setting, "profile_templates", saved)
    db.commit()
    return saved


@app.put("/api/admin/rule-sets", dependencies=[Depends(require_admin)])
def admin_rule_sets(rule_sets: list[CustomRuleSet], db: Session = Depends(get_db)):
    names = [item.name for item in rule_sets]
    if len(names) != len(set(names)):
        raise HTTPException(422, "Имена rule set должны быть уникальными")
    saved = [item.model_dump() for item in rule_sets]
    setting = db.get(Setting, 1)
    save_setting_section(setting, "custom_rule_sets", saved)
    db.commit()
    return saved
