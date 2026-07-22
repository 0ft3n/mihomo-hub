from typing import Any
from pydantic import BaseModel, Field, HttpUrl, field_validator


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


class CustomRuleSet(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    behavior: str = "classical"
    payload: str = ""
    enabled: bool = True

    @field_validator("name")
    @classmethod
    def valid_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or any(char in cleaned for char in ",/\\"):
            raise ValueError("Имя rule set не должно быть пустым и не может содержать , / \\")
        return cleaned

    @field_validator("behavior")
    @classmethod
    def valid_behavior(cls, value: str) -> str:
        if value not in {"classical", "domain", "ipcidr"}:
            raise ValueError("behavior должен быть classical, domain или ipcidr")
        return value


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=160)
    enabled: bool | None = None
