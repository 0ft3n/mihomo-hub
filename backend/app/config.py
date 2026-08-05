from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./dev.db"
    secret_key: str = "change-me-in-production"
    public_url: str = "http://localhost:8080"
    admin_password: str = "admin"
    fetch_timeout: float = 15
    mihomo_probe_url: str = "http://mihomo-probe:9090"
    mihomo_probe_secret: str = "mihomo-hub-probe"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
