import json

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_file_override=False,
    )

    allowed_origins: list[str] = ["http://localhost:3000"]
    rate_limit_requests: int = 5
    rate_limit_window: int = 60
    redis_url: str = "redis://localhost:6379/0"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    recipient_email: str

    telegram_bot_token: str
    telegram_chat_id: str

    # VAPID для Web Push — пустые дефолты допустимы:
    # push просто не будет работать пока не настроено, без краша.
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_email: str = "mailto:admin@a-service.kz"

    # CRM пароль — обязательное поле без дефолта.
    # Если не задан в .env, приложение не запустится.
    crm_password: str

    @field_validator("crm_password")
    @classmethod
    def crm_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("CRM_PASSWORD must be at least 8 characters")
        return v

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()