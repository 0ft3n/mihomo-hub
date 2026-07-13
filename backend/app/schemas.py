from typing import Any
from pydantic import BaseModel, Field, HttpUrl


class ImportRequest(BaseModel):
    url: HttpUrl


class LoginRequest(BaseModel):
    source_url: HttpUrl


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    modifications: dict[str, Any] = Field(default_factory=dict)


class ProfileUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    modifications: dict[str, Any] | None = None
    enabled: bool | None = None


class DefaultProfileTemplate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    modifications: dict[str, Any] = Field(default_factory=dict)
    enabled: bool = True


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    enabled: bool | None = None
