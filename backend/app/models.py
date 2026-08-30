import secrets
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def now():
    return datetime.now(timezone.utc)


def token():
    return secrets.token_urlsafe(32)


def short_token():
    return secrets.token_urlsafe(9)


class Account(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(primary_key=True)
    access_token: Mapped[str] = mapped_column(String(128), unique=True, default=token)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), default="Моя подписка")
    source_url: Mapped[str] = mapped_column(Text, unique=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id", ondelete="CASCADE"))
    cached_yaml: Mapped[str | None] = mapped_column(Text)
    source_meta: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)
    profiles: Mapped[list["Profile"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")
    account: Mapped[Account] = relationship(back_populates="subscriptions")


class Profile(Base):
    __tablename__ = "profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    subscription_id: Mapped[int] = mapped_column(ForeignKey("subscriptions.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(160))
    slug: Mapped[str] = mapped_column(String(128), unique=True, default=token)
    short_slug: Mapped[str | None] = mapped_column(String(24), unique=True, nullable=True, default=short_token)
    config_slug: Mapped[str | None] = mapped_column(String(24), unique=True, nullable=True, default=short_token)
    modifications: Mapped[dict] = mapped_column(JSON, default=dict)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    subscription: Mapped[Subscription] = relationship(back_populates="profiles")


class Setting(Base):
    __tablename__ = "settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    default_modifications: Mapped[dict] = mapped_column(JSON, default=dict)
