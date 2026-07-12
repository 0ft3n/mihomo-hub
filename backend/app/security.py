import hashlib
import ipaddress
import socket
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
import jwt
from fastapi import Header, HTTPException
from .config import settings


def source_fingerprint(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()[:12]


def make_session(account_id: int) -> str:
    payload = {"sub": str(account_id), "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def current_account_id(authorization: str | None = Header(None)) -> int:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Требуется авторизация")
    try:
        return int(jwt.decode(authorization[7:], settings.secret_key, algorithms=["HS256"])["sub"])
    except Exception as exc:
        raise HTTPException(401, "Сессия недействительна") from exc


def require_admin(x_admin_password: str | None = Header(None)):
    if not x_admin_password or not secrets_compare(x_admin_password, settings.admin_password):
        raise HTTPException(401, "Неверный пароль администратора")


def secrets_compare(a: str, b: str) -> bool:
    import hmac
    return hmac.compare_digest(a.encode(), b.encode())


def validate_public_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname or parsed.username:
        raise HTTPException(400, "Допустимы только публичные HTTP(S) URL")
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, parsed.port or 443)}
    except socket.gaierror as exc:
        raise HTTPException(400, "Не удалось разрешить домен подписки") from exc
    for raw in addresses:
        ip = ipaddress.ip_address(raw)
        if not ip.is_global:
            raise HTTPException(400, "Локальные и служебные адреса запрещены")
